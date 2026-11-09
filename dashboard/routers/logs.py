import os
from fastapi import APIRouter, Query, HTTPException

# ---- master 日志目录 ----
try:
    from core.paths import MASTER_LOG_DIR
except ImportError:
    _here = os.path.dirname(os.path.abspath(__file__))   # dashboard/routers
    _dash = os.path.dirname(_here)                        # dashboard
    _booth = os.path.dirname(_dash)                       # booth 根
    _plugins = os.path.dirname(_booth)                    # plugins
    MASTER_LOG_DIR = os.path.join(_plugins, "her_monitor_action_master", "logs")

# ---- booth 日志目录 ----
try:
    from core.startup_log import get_log_dir as _booth_log_dir_fn
    BOOTH_LOG_DIR = _booth_log_dir_fn()
except Exception:
    _here = os.path.dirname(os.path.abspath(__file__))
    _dash = os.path.dirname(_here)
    _booth = os.path.dirname(_dash)
    BOOTH_LOG_DIR = os.path.join(_booth, "logs")


router = APIRouter()

_ALLOWED_EXT = (".log", ".txt", ".out")
_STARTUP_PREFIX = "startup_error."


def _safe_path(log_dir, name):
    if not name or not isinstance(name, str):
        return None
    if "/" in name or "\\" in name or name.startswith("."):
        return None
    if not name.endswith(_ALLOWED_EXT):
        return None
    p = os.path.join(log_dir, name)
    try:
        real = os.path.realpath(p)
        base = os.path.realpath(log_dir)
        if not real.startswith(base + os.sep):
            return None
    except Exception:
        return None
    return p


def _list_files(log_dir):
    if not os.path.isdir(log_dir):
        return []
    files = []
    try:
        for name in os.listdir(log_dir):
            if not name.endswith(_ALLOWED_EXT):
                continue
            p = os.path.join(log_dir, name)
            if not os.path.isfile(p):
                continue
            try:
                st = os.stat(p)
                files.append({
                    "name": name,
                    "size": st.st_size,
                    "mtime": int(st.st_mtime),
                    "is_startup_error": name.startswith(_STARTUP_PREFIX),
                })
            except Exception:
                pass
    except Exception:
        pass
    files.sort(key=lambda x: (not x["is_startup_error"], -x["mtime"]))
    return files


def _read_content(path, tail):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception as e:
        raise HTTPException(500, f"读取失败: {e}")
    total = len(lines)
    if total > tail:
        lines = lines[-tail:]
    return total, "".join(lines)


# ============================================================================
# master 日志
# ============================================================================
@router.get("/master_logs")
def list_master_logs():
    if not os.path.isdir(MASTER_LOG_DIR):
        return {"log_dir": MASTER_LOG_DIR, "files": [], "error": "日志目录不存在"}
    return {"log_dir": MASTER_LOG_DIR, "files": _list_files(MASTER_LOG_DIR)}


@router.get("/master_log_content")
def get_master_log_content(
    name: str = Query(...),
    tail: int = Query(500, ge=1, le=10000),
):
    path = _safe_path(MASTER_LOG_DIR, name)
    if path is None:
        raise HTTPException(400, "非法文件名")
    if not os.path.isfile(path):
        raise HTTPException(404, "文件不存在")
    total, content = _read_content(path, tail)
    return {
        "name": name,
        "total_lines": total,
        "returned_lines": min(total, tail),
        "content": content,
    }


@router.post("/master_log_clear")
def clear_master_log(name: str = Query(...)):
    path = _safe_path(MASTER_LOG_DIR, name)
    if path is None:
        raise HTTPException(400, "非法文件名")
    if not os.path.isfile(path):
        raise HTTPException(404, "文件不存在")
    try:
        # 用 truncate 而不是 remove：master 的 FileHandler 可能还持有 fd
        with open(path, "w", encoding="utf-8"):
            pass
    except Exception as e:
        raise HTTPException(500, f"清空失败: {e}")
    return {"ok": True, "name": name}


# ============================================================================
# booth 日志
# ============================================================================
@router.get("/booth_logs")
def list_booth_logs():
    if not os.path.isdir(BOOTH_LOG_DIR):
        return {"log_dir": BOOTH_LOG_DIR, "files": [], "error": "日志目录不存在"}
    return {"log_dir": BOOTH_LOG_DIR, "files": _list_files(BOOTH_LOG_DIR)}


@router.get("/booth_log_content")
def get_booth_log_content(
    name: str = Query(...),
    tail: int = Query(500, ge=1, le=10000),
):
    path = _safe_path(BOOTH_LOG_DIR, name)
    if path is None:
        raise HTTPException(400, "非法文件名")
    if not os.path.isfile(path):
        raise HTTPException(404, "文件不存在")
    total, content = _read_content(path, tail)
    return {
        "name": name,
        "total_lines": total,
        "returned_lines": min(total, tail),
        "content": content,
    }


@router.post("/booth_log_clear")
def clear_booth_log(name: str = Query(...)):
    path = _safe_path(BOOTH_LOG_DIR, name)
    if path is None:
        raise HTTPException(400, "非法文件名")
    if not os.path.isfile(path):
        raise HTTPException(404, "文件不存在")
    try:
        with open(path, "w", encoding="utf-8"):
            pass
    except Exception as e:
        raise HTTPException(500, f"清空失败: {e}")
    return {"ok": True, "name": name}