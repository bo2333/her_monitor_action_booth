import os, sys
_DASH = os.path.dirname(os.path.abspath(__file__))
if _DASH not in sys.path:
    sys.path.insert(0, _DASH)

from fastapi import APIRouter
from routers import config, meta, history, token, stats, status, install, update, logs

router = APIRouter()
for m in (config, meta, history, token, stats, status, install, update, logs):
    router.include_router(m.router)