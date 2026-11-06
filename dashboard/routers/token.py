import csv, io
from datetime import datetime
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from core.db_reader import query_token_details
from core.master_config import effective_db_root

router = APIRouter()

@router.get("/token_details")
def token_details(user: str = Query(None), limit: int = Query(1000, ge=1, le=100000)):
    return query_token_details(effective_db_root(), user=user, limit=limit)

@router.get("/export/tokens")
def export_tokens(user: str = Query(None), limit: int = Query(2000, ge=1, le=100000)):
    data = query_token_details(effective_db_root(), user=user, limit=limit)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["时间", "用户", "类型", "模型/任务", "输入", "输出", "总计", "预估费用(元)"])
    for r in reversed(data):
        w.writerow([r["time"], r["user"], r["action"], r["model"], r["in"], r["out"], r["total"], f"{r['cost']:.6f}"])
    buf.seek(0)
    filename = f"tokens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})