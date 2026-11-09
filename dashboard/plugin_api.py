import os, sys, traceback
_DASH = os.path.dirname(os.path.abspath(__file__))
if _DASH not in sys.path:
    sys.path.insert(0, _DASH)

from fastapi import APIRouter

# ★ 加载 startup_log；失败则降级到 stderr
try:
    from core.startup_log import clear_startup_log, log_startup_error
except Exception as _e:
    _startup_tb = traceback.format_exc()

    def clear_startup_log():
        pass

    def log_startup_error(msg, tb=None):
        try:
            print(f"[booth] 启动错误: {msg}", file=sys.stderr)
            if tb:
                print(tb, file=sys.stderr)
        except Exception:
            pass

    try:
        print(f"[booth] startup_log 模块不可用: {_e!r}", file=sys.stderr)
        print(_startup_tb, file=sys.stderr)
    except Exception:
        pass

# ★ 清空上一次启动的错误日志（每次 booth 被加载时执行一次）
try:
    clear_startup_log()
except Exception:
    pass

router = APIRouter()

_ROUTE_MODULES = (
    "config", "meta", "history", "token", "stats",
    "status", "install", "update", "logs",
)

_loaded = []
_failed = []

for _name in _ROUTE_MODULES:
    try:
        _mod = __import__(f"routers.{_name}", fromlist=[_name])
        if not hasattr(_mod, "router"):
            raise AttributeError(f"routers.{_name} 缺少 router 变量")
        router.include_router(_mod.router)
        _loaded.append(_name)
    except Exception as e:
        _failed.append((_name, repr(e)))
        try:
            log_startup_error(
                f"路由加载失败 routers.{_name}: {e!r}",
                tb=traceback.format_exc(),
            )
        except Exception:
            pass

try:
    if _loaded:
        print(f"[booth] 已加载路由: {', '.join(_loaded)}", file=sys.stderr)
    if _failed:
        print(f"[booth] 失败路由: {[n for n, _ in _failed]}", file=sys.stderr)
except Exception:
    pass