from fastapi import APIRouter, Query
from core.db_reader import aggregate_trends
from core.master_config import effective_db_root
router = APIRouter()

@router.get("/stats/trends")
def trends(period: str = Query("total"), start: int = Query(None), end: int = Query(None)):
    return aggregate_trends(effective_db_root(), start_ts=start, end_ts=end)