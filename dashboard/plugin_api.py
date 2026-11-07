"""her_monitor_action_booth Dashboard 后端入口：仅聚合 router。"""
import os
import sys

_DASHBOARD_DIR = os.path.dirname(os.path.abspath(__file__))
if _DASHBOARD_DIR not in sys.path:
    sys.path.append(_DASHBOARD_DIR)

from fastapi import APIRouter
from routers import config, meta, history, token, stats, status, install, update

router = APIRouter()
for m in (config, meta, history, token, stats, status, install, update):
    router.include_router(m.router)