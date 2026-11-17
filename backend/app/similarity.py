from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class TicketSimilarityEngine:
    """Explainable lexical retrieval. Returns candidates, then labels their strength."""
    def __init__(self, tickets: list[dict], threshold: float = 0.30, candidate_floor: float = 0.08):
        if not tickets:
            raise ValueError("Historical ticket corpus cannot be empty")
        self.tickets = tickets
        self.threshold = threshold
        self.candidate_floor = candidate_floor
        self.vectorizer = TfidfVectorizer(lowercase=True, stop_words="english", ngram_range=(1, 2), sublinear_tf=True, strip_accents="unicode")
        self.matrix = self.vectorizer.fit_transform([self._ticket_text(t) for t in tickets]) 
        #

    @staticmethod
    def _ticket_text(ticket: dict) -> str:
        # Include category and tags as useful context, while keeping text explainable.
        return " ".join([
            str(ticket.get("subject") or ""), str(ticket.get("subject") or ""),
            str(ticket.get("description") or ""), str(ticket.get("category") or ""),
            " ".join(ticket.get("tags") or [])
        ])

    def search(self, subject: str, description: str, top_k: int = 5, category: str | None = None, min_score: float | None = None) -> list[dict]:
        query = f"{subject}. {subject}. {description}. {category or ''}".strip()
        scores = cosine_similarity(self.vectorizer.transform([query]), self.matrix).flatten()
        floor = self.candidate_floor if min_score is None else max(0.0, min(float(min_score), 1.0))
        ranked = scores.argsort()[::-1]
        results = []
        for idx in ranked:
            ticket = self.tickets[int(idx)]
            if category and ticket.get("category") != category:
                continue
            score = float(scores[idx])
            if score < floor:
                continue
            band = "strong" if score >= self.threshold else "possible" if score >= 0.15 else "weak"
            results.append({**ticket, "similarity_score": round(score, 4), "relevance": band})
            if len(results) >= top_k:
                break
        return results
