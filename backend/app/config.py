from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
HISTORICAL_TICKETS_PATH = DATA_DIR / "tickets.json"
EXAMPLE_TICKETS_PATH = DATA_DIR / "new_tickets_example.json"
TOP_K = 5
MIN_SIMILARITY = 0.30
