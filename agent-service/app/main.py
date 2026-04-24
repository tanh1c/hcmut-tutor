import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
import uvicorn

from .mock_data import list_profile_summaries
from .models import RoadmapRequest
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


def run():
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("AGENT_SERVICE_PORT", "8001")),
        reload=False,
    )
