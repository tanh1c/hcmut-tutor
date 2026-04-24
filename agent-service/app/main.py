import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import uvicorn

from .chat_agent import (
    create_chat_session,
    get_chat_session,
    list_chat_sessions,
    send_chat_message,
    stream_chat_message,
    upload_session_documents,
)
from .checkpoint_store import checkpoint_store
from .memory_store import memory_store
from .mock_data import list_profile_summaries
from .models import AgentChatMessageRequest, AgentChatSessionCreateRequest, AgentDocumentUploadRequest, RoadmapRequest
from .roadmap_agent import generate_learning_roadmap

load_dotenv()

app = FastAPI(title="HCMUT Agent Service", version="0.1.0")


@app.get("/health")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "agent-service",
            "port": int(os.getenv("AGENT_SERVICE_PORT", "8001")),
            "memory": {
                "redisEnabled": memory_store.redis_client is not None,
                "mongoEnabled": memory_store.mongo_collection is not None,
            },
            "checkpoint": {
                "mode": checkpoint_store.mode,
            },
        },
    }


@app.get("/profiles")
def list_profiles():
    return {
        "success": True,
        "data": [profile.model_dump(by_alias=True) for profile in list_profile_summaries()],
    }


@app.post("/roadmap")
def create_roadmap(request: RoadmapRequest):
    try:
        result = generate_learning_roadmap(request)
        return {
            "success": True,
            "data": result.model_dump(by_alias=True),
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/chat-lab/sessions")
def list_agent_chat_sessions():
    return {
        "success": True,
        "data": [session.model_dump(by_alias=True) for session in list_chat_sessions()],
    }


@app.post("/chat-lab/sessions")
def create_agent_chat_session(request: AgentChatSessionCreateRequest):
    try:
        session = create_chat_session(request)
        return {
            "success": True,
            "data": session.model_dump(by_alias=True),
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/chat-lab/sessions/{session_id}")
def get_agent_chat_session(session_id: str):
    try:
        session = get_chat_session(session_id)
        return {
            "success": True,
            "data": session.model_dump(by_alias=True),
        }
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/chat-lab/sessions/{session_id}/documents")
def upload_agent_chat_documents(session_id: str, request: AgentDocumentUploadRequest):
    try:
        print(f"[DEBUG main.py] Received upload request for session {session_id}")
        print(f"[DEBUG main.py] Request body: {len(request.documents)} documents")
        session = upload_session_documents(session_id, request)
        print(f"[DEBUG main.py] Upload successful, returning session with {len(session.documents)} documents")
        return {
            "success": True,
            "data": session.model_dump(by_alias=True),
        }
    except ValueError as error:
        print(f"[DEBUG main.py] ValueError: {error}")
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:  # pragma: no cover
        print(f"[DEBUG main.py] Exception: {error}")
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/chat-lab/sessions/{session_id}/messages")
def send_agent_chat_message(session_id: str, request: AgentChatMessageRequest):
    try:
        session = send_chat_message(session_id, request)
        return {
            "success": True,
            "data": session.model_dump(by_alias=True),
        }
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/chat-lab/sessions/{session_id}/messages/stream")
def stream_agent_chat_message(session_id: str, request: AgentChatMessageRequest):
    return StreamingResponse(
        stream_chat_message(session_id, request),
        media_type="application/x-ndjson",
    )


def run():
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("AGENT_SERVICE_PORT", "8001")),
        reload=False,
    )
