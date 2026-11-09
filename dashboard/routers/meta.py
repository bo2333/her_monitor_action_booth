from fastapi import APIRouter
from core.db_reader import distinct_actions, distinct_users
from core.master_config import effective_db_root
router = APIRouter()
@router.get("/users")
def users(): return distinct_users(effective_db_root())
@router.get("/actions")
def actions(): return distinct_actions(effective_db_root())