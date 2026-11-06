from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from core.db_reader import aggregate_trends
from core.master_config import effective_db_root

router = APIRouter()


def _period_start_ts(period):
    now = datetime.now()
    if period == "day":
        d = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        d = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        d = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        d = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        return None
    return int(d.timestamp())


@router.get("/stats/trends")
def get_trends(
        period: str = Query("total"),
        start: int = Query(None),
        end: int = Query(None)
):
    # ★ 如果前端传了 start/end，优先使用自定义区间，忽略 period 预设
    if start is not None or end is not None:
        return aggregate_trends(effective_db_root(), start_ts=start, end_ts=end)

    return aggregate_trends(effective_db_root(), _period_start_ts(period))