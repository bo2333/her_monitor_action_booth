from fastapi import APIRouter
from core.utils import get_master_status

router = APIRouter()

@router.get("/status")
def status():
    """获取所有 Agent 的运行时进程状态"""
    return get_master_status()