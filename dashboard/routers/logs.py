import os
from fastapi import APIRouter, Query, HTTPException
from core.paths import MASTER_LOG_DIR

router = APIRouter()

# 只允许读这些扩展名，防路径穿越
_ALLOWED_EXT = (".log", ".txt", ".out")
_STARTUP_PREFIX = "startup_error."


def _safe_log_path(name: str):
    """校验 name 是日志目录下的文件，防路径穿越。"""
    if not name or not isinstance(name, str):
        return None
    if "/" in name or "\\" in name or name.startswith("."):
        return None
    if not name.endswith(_ALLOWED_EXT):
        return None
    p = os.path.join(MASTER_LOG_DIR, name)
    # 校验真实路径在日志目录下
    try:
        real = os.path.realpath(p)
        base = os.path.realpath(MASTER_LOG_DIR)
        if not real.startswith(base + os.sep):
            return None
    except Exception:
        return None
    return p


@router.get("/master_logs")
def list_master_logs():
    """列出 master 的 logs/ 目录下的日志文件。"""
    if not os.path.isdir(MASTER_LOG_DIR):
        return {"log_dir": MASTER_LOG_DIR, "files": []}

    files = []
    try:
        for name in os.listdir(MASTER_LOG_DIR):
            if not name.endswith(_ALLOWED_EXT):
                continue
            p = os.path.join(MASTER_LOG_DIR, name)
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

    # 启动错误文件优先，其余按 mtime 降序
    files.sort(key=lambda x: (not x["is_startup_error"], -x["mtime"]))
    return {"log_dir": MASTER_LOG_DIR, "files": files}


@router.get("/master_log_content")
def get_master_log_content(
    name: str = Query(..., description="日志文件名"),
    tail: int = Query(500, ge=1, le=10000, description="只返回最后 N 行"),
):
    """读取指定日志文件的最后 N 行。"""
    path = _safe_log_path(name)
    if path is None:
        raise HTTPException(400, "非法文件名")
    if not os.path.isfile(path):
        raise HTTPException(404, "文件不存在")

    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception as e:
        raise HTTPException(500, f"读取失败: {e}")

    total = len(lines)
    if total > tail:
        lines = lines[-tail:]

    return {
        "name": name,
        "total_lines": total,
        "returned_lines": len(lines),
        "content": "".join(lines),
    }