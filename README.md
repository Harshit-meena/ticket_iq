# TicketIQ 2.0 — Support Ticket Similarity Assistant

TicketIQ helps Solari Analytics support agents retrieve relevant historical tickets and inspect their original resolutions. The MVP uses explainable TF-IDF + cosine similarity over the supplied 40-ticket case-study dataset.

## What is included

- Similarity search with category filter, candidate floor and configurable result count (3/5/8/10).
- Ranked candidate labels: **strong** (>= 30%), **possible** (15–29%), and **weak** (< 15%). These are textual-relevance bands, not probabilities that a resolution will work.
- Historical knowledge library with full-text filtering, category/status filters, pagination and ticket detail modal.
- Browser-local search history with reopen and clear actions.
- Overview analytics derived from the loaded sample dataset.
- CSV export for search results and the currently visible library page.
- Helpful / not-helpful feedback persisted to `backend/data/feedback.jsonl`.
- Explicit no-candidate state and agent-review warning.

## Requirements

- Python 3.12 or 3.13 recommended
- Node.js 20+ and npm
- Windows PowerShell commands below

## Run backend

```powershell
cd TicketIQ\backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## Run frontend (new terminal)

```powershell
cd TicketIQ\frontend
npm install
npm run dev
```

Open http://localhost:5173

## Similarity behavior

The engine keeps the original 30% strong-match threshold but now returns lower-scoring candidates above a configurable candidate floor (default 8%). This is why a query can show multiple alternatives instead of only one. Results are labeled by relevance band. For example, a 28% result is a *possible* match, not a strong recommendation. A novel issue can still surface loosely related candidates; agents must inspect category, description and resolution before acting.

The subject is weighted by repeating it in the TF-IDF input; category and tags provide additional context. This remains a lexical retrieval baseline, not semantic understanding. Tune the candidate floor using a labeled evaluation set before production use.

## API endpoints

- `GET /api/health`
- `GET /api/overview`
- `GET /api/examples`
- `GET /api/tickets?q=&category=all&status=all&page=1&page_size=20`
- `POST /api/v1/tickets/similar`
- `POST /api/feedback`

## Data and limitations

The supplied case-study records are synthetic and small (40 historical tickets). Analytics describe only this sample. Search history is stored in the current browser's local storage. Feedback is appended locally to `backend/data/feedback.jsonl`. Authentication, role-based access, production database, live ticket ingestion, semantic embeddings and deployment are intentionally outside this MVP.
