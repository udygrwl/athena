import os
import re
import json as _json
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

from models import get_available_models, call_model
from orchestrator import run_debate
from prompts import JUDGE_CHAT_SYSTEM_PROMPT, JUDGE_POST_CHAT_SYSTEM_PROMPT

app = FastAPI(title="Athena API")

READY_RE = re.compile(r'\[DEBATE_READY:\s*(\{.*?\})\]', re.DOTALL)


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": origin or "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
            },
        )
    response = await call_next(request)
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Vary"] = "Origin"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response


# ── Models / Health ───────────────────────────────────────────────────────────

@app.get("/api/models")
def list_models():
    return {"models": get_available_models()}


@app.get("/api/health")
def health():
    from models import _anthropic_key, _google_key, _openai_key
    def key_info(k): return {"set": bool(k), "length": len(k), "prefix": k[:8] if k else "", "suffix": k[-6:] if k else ""}
    return {
        "anthropic": key_info(_anthropic_key()),
        "google":    key_info(_google_key()),
        "openai":    key_info(_openai_key()),
    }


# ── Judge pre-debate chat ─────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class JudgeChatRequest(BaseModel):
    judge_model: str
    message: str
    history: List[ChatMessage] = []


@app.post("/api/judge/chat")
async def judge_chat(req: JudgeChatRequest):
    available_ids = {m["id"] for m in get_available_models()}
    if req.judge_model not in available_ids:
        raise HTTPException(status_code=400, detail=f"Model not available: {req.judge_model}")

    parts = [JUDGE_CHAT_SYSTEM_PROMPT, ""]
    for msg in req.history:
        label = "User" if msg.role == "user" else "Athena"
        parts.append(f"{label}: {msg.content}")
    parts.append(f"User: {req.message}")
    parts.append("Athena:")
    prompt = "\n\n".join(parts)

    raw = await call_model(req.judge_model, prompt, max_tokens=2048)

    # Extract [DEBATE_READY: {...}] marker if present
    m = READY_RE.search(raw)
    debate_topic = None
    display_content = raw
    if m:
        try:
            data = _json.loads(m.group(1))
            debate_topic = data.get("topic")
            display_content = raw[:m.start()].rstrip()
        except Exception:
            pass

    return {"content": display_content, "debate_topic": debate_topic}


# ── Judge post-debate chat ────────────────────────────────────────────────────

class PostDebateChatRequest(BaseModel):
    judge_model: str
    message: str
    history: List[ChatMessage] = []
    transcript: str
    verdict: str


@app.post("/api/judge/post-debate-chat")
async def judge_post_debate_chat(req: PostDebateChatRequest):
    available_ids = {m["id"] for m in get_available_models()}
    if req.judge_model not in available_ids:
        raise HTTPException(status_code=400, detail=f"Model not available: {req.judge_model}")

    system = JUDGE_POST_CHAT_SYSTEM_PROMPT.format(
        transcript=req.transcript,
        verdict=req.verdict,
    )

    parts = [system, ""]
    for msg in req.history:
        label = "User" if msg.role == "user" else "Athena"
        parts.append(f"{label}: {msg.content}")
    parts.append(f"User: {req.message}")
    parts.append("Athena:")
    prompt = "\n\n".join(parts)

    content = await call_model(req.judge_model, prompt, max_tokens=4096)
    return {"content": content}


# ── Debate ────────────────────────────────────────────────────────────────────

class DebateRequest(BaseModel):
    topic: str
    advocate_models: List[str]
    judge_model: str
    use_thinking: bool = False


@app.post("/api/debate")
async def debate(req: DebateRequest):
    if len(req.advocate_models) != 3:
        raise HTTPException(status_code=400, detail="Exactly 3 advocate models required.")
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    available_ids = {m["id"] for m in get_available_models()}
    for m in req.advocate_models + [req.judge_model]:
        if m not in available_ids:
            raise HTTPException(status_code=400, detail=f"Model not available: {m}")

    async def event_stream():
        async for chunk in run_debate(req.topic, req.advocate_models, req.judge_model, req.use_thinking):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
