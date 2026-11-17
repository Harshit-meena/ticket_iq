from pydantic import BaseModel, Field, ConfigDict

class TicketSearchRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    subject: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=5, max_length=3000)
    category: str | None = None
    top_k: int = Field(default=5, ge=1, le=10)
    min_score: float = Field(default=0.08, ge=0, le=1)

class TicketMatch(BaseModel):
    ticket_id: str
    category: str
    subject: str
    description: str
    resolution_notes: str
    tags: list[str]
    created_at: str
    status: str
    similarity_score: float
    relevance: str = "possible"

class TicketSearchResponse(BaseModel):
    query_id: str
    total_matches: int
    threshold: float
    matches: list[TicketMatch]
    message: str

class FeedbackRequest(BaseModel):
    ticket_id: str = Field(min_length=1, max_length=40)
    query_id: str = Field(min_length=1, max_length=40)
    helpful: bool
    comment: str = Field(default="", max_length=500)
