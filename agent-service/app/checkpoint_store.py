import os

from langgraph.checkpoint.memory import InMemorySaver

try:
    from langgraph.checkpoint.mongodb import MongoDBSaver
except ImportError:  # pragma: no cover
    MongoDBSaver = None


class AgentCheckpointStore:
    def __init__(self):
        self.mode = "memory"
        self._checkpointer = None
        self._mongo_context = None
        self._init_checkpointer()

    def _init_checkpointer(self):
        mongo_uri = os.getenv("AGENT_CHECKPOINT_MONGODB_URI") or os.getenv("AGENT_MONGODB_URI")
        mongo_database = os.getenv("AGENT_CHECKPOINT_MONGODB_DATABASE") or os.getenv("AGENT_MONGODB_DATABASE", "tutor-support-system")

        if mongo_uri and MongoDBSaver is not None:
            try:
                self._mongo_context = MongoDBSaver.from_conn_string(mongo_uri, mongo_database)
                self._checkpointer = self._mongo_context.__enter__()
                self._checkpointer.setup()
                self.mode = "mongodb"
                return
            except Exception:  # pragma: no cover
                self._mongo_context = None
                self._checkpointer = None

        self._checkpointer = InMemorySaver()
        self.mode = "memory"

    @property
    def checkpointer(self):
        return self._checkpointer

    def close(self):  # pragma: no cover
        if self._mongo_context is not None:
            self._mongo_context.__exit__(None, None, None)
            self._mongo_context = None


checkpoint_store = AgentCheckpointStore()
