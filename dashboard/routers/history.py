import csv, io
from datetime import datetime
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from core.db_reader import query_history
from core.master_config import effective_db_root
router = APIRouter()

@router.get("/history")
def history(start: int = Query(None), end: int = Query(None), after_ts: int = Query(0),
            user: str = Query(None), limit: int = Query(1000, ge=1, le=100000)):
    return query_history(effective_db_root(), start=start, end=end, after_ts=after_ts, user=user, limit=limit)

@router.get("/export/history")
def export_history(user: str = Query(None), limit: int = Query(100000, ge=1)):
    data = query_history(effective_db_root(), user=user, limit=limit)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["时间", "User", "Action", "方向", "Level", "预估费用(元)", "内容"])
    for r in reversed(data):
        w.writerow([r["time"], r["user"], r["action"], "发送" if r["flow"] == 0 else "接收", r["level"], f"{r['cost']:.6f}", r["conn"]])
    buf.seek(0)
    filename = f"history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})