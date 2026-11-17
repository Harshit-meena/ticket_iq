from app.similarity import TicketSimilarityEngine

def test_returns_relevant_ticket_first():
    tickets = [
        {"ticket_id": "A", "subject": "Password reset email missing", "description": "Reset email never arrives"},
        {"ticket_id": "B", "subject": "Export CSV fails", "description": "CSV download returns an error"},
    ]
    engine = TicketSimilarityEngine(tickets, threshold=0.0)
    matches = engine.search("Password reset email not received", "The reset email never arrives", top_k=2)
    assert matches
    assert matches[0]["ticket_id"] == "A"

def test_empty_corpus_rejected():
    try:
        TicketSimilarityEngine([])
    except ValueError:
        assert True
    else:
        assert False, "Expected empty corpus to be rejected"
