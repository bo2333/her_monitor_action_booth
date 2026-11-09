from fastapi import APIRouter
from core.utils import get_master_status
router = APIRouter()
@router.get("/status")
def status(): return get_master_status()