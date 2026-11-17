from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import json
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.config import MIN_SIMILARITY
from app.data_store import load_historical_tickets, load_example_tickets
from app.schemas import TicketSearchRequest, TicketSearchResponse, FeedbackRequest
from app.similarity import TicketSimilarityEngine

FEEDBACK_PATH = Path(__file__).resolve().parents[1] / "data" / "feedback.jsonl"

@asynccontextmanager
async def lifespan(app: FastAPI):
    tickets = load_historical_tickets()
    app.state.tickets = tickets
    app.state.engine = TicketSimilarityEngine(tickets, threshold=MIN_SIMILARITY)
    yield

app = FastAPI(title="TicketIQ API", description="Historical support-ticket intelligence for Solari Analytics.", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "TicketIQ API", "version": "2.0.0"}

@app.get("/api/overview")
def overview():
    tickets = app.state.tickets
    categories = {}
    for ticket in tickets:
        key = ticket.get("category", "other")
        categories[key] = categories.get(key, 0) + 1
    resolved = sum(str(t.get("status", "")).strip().lower() == "resolved" for t in tickets)
    return {"historical_tickets": len(tickets), "resolved_tickets": resolved, "categories": categories,
            "resolution_rate": round((resolved / len(tickets)) * 100) if tickets else 0,
            "open_tickets": len(tickets) - resolved}

@app.get("/api/examples")
def examples():
    return load_example_tickets()

@app.get("/api/tickets")
def list_tickets(q: str = "", category: str = "all", status: str = "all", page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    rows = app.state.tickets
    if category != "all": rows = [t for t in rows if t.get("category") == category]
    if status != "all": rows = [t for t in rows if t.get("status") == status]
    if q.strip():
        term = q.casefold()
        rows = [t for t in rows if term in " ".join([str(t.get("ticket_id", "")), str(t.get("subject", "")), str(t.get("description", "")), " ".join(t.get("tags", []))]).casefold()]
    total = len(rows)
    start = (page - 1) * page_size
    return {"items": rows[start:start + page_size], "total": total, "page": page, "page_size": page_size}

@app.post("/api/v1/tickets/similar", response_model=TicketSearchResponse)
def find_similar_tickets(request: TicketSearchRequest):
    try:
        matches = app.state.engine.search(request.subject, request.description, request.top_k, request.category, request.min_score)
        strong = sum(m["relevance"] == "strong" for m in matches)
        message = f"{strong} strong match(es) and {len(matches)-strong} additional candidate(s) found." if matches else "No relevant candidates found. Continue with the standard investigation process."
        return TicketSearchResponse(query_id=f"Q-{uuid4().hex[:8].upper()}", total_matches=len(matches), threshold=MIN_SIMILARITY, matches=matches, message=message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Ticket matching is temporarily unavailable.") from exc

@app.post("/api/feedback")
def save_feedback(payload: FeedbackRequest):
    record = {**payload.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    with FEEDBACK_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"saved": True, "message": "Feedback recorded for evaluation."}
