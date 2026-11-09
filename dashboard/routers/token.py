import csv, io
from datetime import datetime
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from core.db_reader import query_token_details, aggregate_trends
from core.master_config import effective_db_root
router = APIRouter()

@router.get("/token_details")
def token_details(user: str = Query(None), limit: int = Query(0, ge=0, le=1000000),
                  start: int = Query(None), end: int = Query(None)):
    return query_token_details(effective_db_root(), user=user, limit=limit, start_ts=start, end_ts=end)

@router.get("/export/tokens")
def export_tokens(user: str = Query(None), limit: int = Query(0, ge=0, le=1000000),
                  start: int = Query(None), end: int = Query(None)):
    data = query_token_details(effective_db_root(), user=user, limit=limit, start_ts=start, end_ts=end)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["时间", "用户", "类型", "模型/任务", "输入", "输出", "总计", "预估费用(元)"])
    for r in reversed(data):
        w.writerow([r["time"], r["user"], r["action"], r["model"], r["in"], r["out"], r["total"], f"{r['cost']:.6f}"])
    buf.seek(0)
    filename = f"tokens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

@router.get("/export/trends")
def export_trends(period: str = Query("total"), start: int = Query(None), end: int = Query(None)):
    data = aggregate_trends(effective_db_root(), start_ts=start, end_ts=end)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["Agent / 用户", "请求次数", "输入 Token", "输出 Token", "总计 Token", "预估费用(元)"])
    for r in data:
        w.writerow([r["user"], r["cnt"], r["in_tok"], r["out_tok"], r["tot_tok"], f"{r['total_cost']:.6f}"])
    buf.seek(0)
    filename = f"tokens_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})