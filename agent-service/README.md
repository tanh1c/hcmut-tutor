# Agent Service

Python service riêng cho các AI agent. Hiện tại service này host roadmap agent dùng mock data và Gemini Flash, còn backend Node gọi xuống qua HTTP.

## Chạy local

```bash
cd agent-service
python -m uvicorn app.main:app --reload --port 8001
```

Hoặc:

```bash
cd agent-service
python run.py
```

## Endpoint

- `GET /health`
- `GET /profiles`
- `POST /roadmap`

## Cấu hình

Copy `.env.example` thành `.env` và điền:

- `GEMINI_API_KEY`
- `AGENT_GEMINI_MODEL`
- `AGENT_SERVICE_PORT`

## Kiến trúc

- `app/mock_data.py`: mock profiles riêng cho agent
- `app/roadmap_agent.py`: phân tích login history, chọn tool, sinh roadmap
- `app/main.py`: FastAPI app
