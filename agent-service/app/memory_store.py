import json
import os
from typing import Any

from .models import (
    AgentChatMessage,
    AgentDocument,
    AgentToolDecision,
    AgentToolExecution,
    AgentTutoringProgress,
)

try:
    import redis
except ImportError:  # pragma: no cover
    redis = None

try:
    from pymongo import MongoClient
except ImportError:  # pragma: no cover
    MongoClient = None


SESSION_INDEX_KEY = "agent:chat:sessions:index"


def _serialize_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": record["id"],
        "title": record["title"],
        "student_id": record.get("student_id"),
        "student_name": record.get("student_name"),
        "created_at": record["created_at"],
        "updated_at": record["updated_at"],
        "documents": [document.model_dump(by_alias=True) for document in record.get("documents", [])],
        "messages": [message.model_dump(by_alias=True) for message in record.get("messages", [])],
        "latest_decision": record["latest_decision"].model_dump(by_alias=True) if record.get("latest_decision") else None,
        "latest_execution": record["latest_execution"].model_dump(by_alias=True) if record.get("latest_execution") else None,
        "tutoring_state": record.get("tutoring_state"),
        "tutoring_progress": record["tutoring_progress"].model_dump(by_alias=True) if record.get("tutoring_progress") else None,
    }


def _deserialize_record(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": payload["id"],
        "title": payload["title"],
        "student_id": payload.get("student_id"),
        "student_name": payload.get("student_name"),
        "created_at": payload["created_at"],
        "updated_at": payload["updated_at"],
        "documents": [AgentDocument.model_validate(item) for item in payload.get("documents", [])],
        "messages": [AgentChatMessage.model_validate(item) for item in payload.get("messages", [])],
        "latest_decision": AgentToolDecision.model_validate(payload["latest_decision"]) if payload.get("latest_decision") else None,
        "latest_execution": AgentToolExecution.model_validate(payload["latest_execution"]) if payload.get("latest_execution") else None,
        "tutoring_state": payload.get("tutoring_state"),
        "tutoring_progress": AgentTutoringProgress.model_validate(payload["tutoring_progress"]) if payload.get("tutoring_progress") else None,
    }


class AgentMemoryStore:
    def __init__(self):
        self._memory: dict[str, dict[str, Any]] = {}
        self.redis_client = None
        self.redis_ttl_seconds = int(os.getenv("AGENT_REDIS_TTL_SECONDS", "86400"))
        self.mongo_collection = None
        self._init_redis()
        self._init_mongo()

    def _init_redis(self):
        redis_url = os.getenv("AGENT_REDIS_URL")
        if not redis_url or redis is None:
            return

        try:
            self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
        except Exception:  # pragma: no cover
            self.redis_client = None

    def _init_mongo(self):
        mongo_uri = os.getenv("AGENT_MONGODB_URI")
        if not mongo_uri or MongoClient is None:
            return

        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            database_name = os.getenv("AGENT_MONGODB_DATABASE", "tutor-support-system")
            database = client[database_name]
            self.mongo_collection = database[os.getenv("AGENT_MONGODB_COLLECTION", "agent_chat_sessions")]
            client.admin.command("ping")
        except Exception:  # pragma: no cover
            self.mongo_collection = None

    def _redis_key(self, session_id: str) -> str:
        return f"agent:chat:session:{session_id}"

    def save_chat_session(self, record: dict[str, Any]) -> dict[str, Any]:
        self._memory[record["id"]] = record
        payload = _serialize_record(record)

        if self.redis_client:
            raw = json.dumps(payload, ensure_ascii=False)
            self.redis_client.set(self._redis_key(record["id"]), raw, ex=self.redis_ttl_seconds)
            self.redis_client.zadd(SESSION_INDEX_KEY, {record["id"]: self._updated_score(record["updated_at"])})
            self.redis_client.expire(SESSION_INDEX_KEY, self.redis_ttl_seconds)

        if self.mongo_collection is not None:
            self.mongo_collection.replace_one({"id": record["id"]}, payload, upsert=True)

        return record

    def get_chat_session(self, session_id: str) -> dict[str, Any] | None:
        if session_id in self._memory:
            return self._memory[session_id]

        if self.redis_client:
            raw = self.redis_client.get(self._redis_key(session_id))
            if raw:
                record = _deserialize_record(json.loads(raw))
                self._memory[session_id] = record
                return record

        if self.mongo_collection is not None:
            payload = self.mongo_collection.find_one({"id": session_id}, {"_id": 0})
            if payload:
                record = _deserialize_record(payload)
                self._memory[session_id] = record
                return record

        return None

    def list_chat_sessions(self) -> list[dict[str, Any]]:
        if self.mongo_collection is not None:
            records = [
                _deserialize_record(payload)
                for payload in self.mongo_collection.find({}, {"_id": 0}).sort("updated_at", -1).limit(50)
            ]
            for record in records:
                self._memory[record["id"]] = record
            return records

        if self.redis_client:
            session_ids = self.redis_client.zrevrange(SESSION_INDEX_KEY, 0, 49)
            records: list[dict[str, Any]] = []
            for session_id in session_ids:
                record = self.get_chat_session(session_id)
                if record:
                    records.append(record)
            if records:
                return records

        return sorted(self._memory.values(), key=lambda item: item["updated_at"], reverse=True)

    @staticmethod
    def _updated_score(updated_at: str) -> float:
        try:
            return float(updated_at.replace("Z", "").replace("T", "").replace(":", "").replace("-", ""))
        except Exception:
            return 0.0


memory_store = AgentMemoryStore()
