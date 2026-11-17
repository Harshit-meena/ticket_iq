import json
from app.config import HISTORICAL_TICKETS_PATH, EXAMPLE_TICKETS_PATH

def _read_records(path: str, key: str) -> list[dict]:
    with open(path, encoding="utf-8") as file:
        payload = json.load(file)
    records = payload.get(key, [])
    if not isinstance(records, list):
        raise ValueError(f"Expected '{key}' to contain a list")
    return records

def load_historical_tickets() -> list[dict]:
    records = _read_records(HISTORICAL_TICKETS_PATH, "tickets")
    required = {"ticket_id", "subject", "description"}
    valid = []
    for record in records:
        if isinstance(record, dict) and required.issubset(record):
            valid.append(record)
    if not valid:
        raise RuntimeError("No valid historical tickets were loaded")
    return valid

def load_example_tickets() -> list[dict]:
    return _read_records(EXAMPLE_TICKETS_PATH, "new_tickets")
