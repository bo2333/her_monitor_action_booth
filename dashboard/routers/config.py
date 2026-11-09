import os
from fastapi import APIRouter, HTTPException, Query
from core.paths import BOOTH_CONFIG, DEFAULT_BOOTH, MASTER_CONFIG, MASTER_DIR, default_db_root
from core.utils import load_json, save_json, probe_dir, safe_abs
from core.master_config import effective_db_root, merge_defaults, save_master_config

# ★ 新常量容错：paths.py 未更新也能启动
try:
    from core.paths import BOOTH_CONFIG_DEF
except ImportError:
    BOOTH_CONFIG_DEF = os.path.join(os.path.dirname(BOOTH_CONFIG), "booth_config.def.json")

try:
    from core.paths import CONSTANTS_FILE, CONSTANTS_DEF, UI_FILE, UI_DEF
except ImportError:
    _CFG_DIR = os.path.join(os.path.dirname(BOOTH_CONFIG), "dashboard", "config")
    CONSTANTS_FILE = os.path.join(_CFG_DIR, "constants.json")
    CONSTANTS_DEF  = os.path.join(_CFG_DIR, "constants.def.json")
    UI_FILE        = os.path.join(_CFG_DIR, "ui.json")
    UI_DEF         = os.path.join(_CFG_DIR, "ui.def.json")

# ★ ensure_config_file 容错：utils.py 未更新也能启动
try:
    from core.utils import ensure_config_file
except ImportError:
    def ensure_config_file(target, def_path, fallback=None):
        return False

router = APIRouter()


@router.get("/constants")
def get_constants():
    ensure_config_file(CONSTANTS_FILE, CONSTANTS_DEF, {})
    return load_json(CONSTANTS_FILE, {})


@router.get("/ui-config")
def get_ui_config_frontend():
    ensure_config_file(UI_FILE, UI_DEF, {})
    return load_json(UI_FILE, {})


@router.get("/ui_config")
def get_ui_config():
    ensure_config_file(BOOTH_CONFIG, BOOTH_CONFIG_DEF, DEFAULT_BOOTH)
    booth = load_json(BOOTH_CONFIG, DEFAULT_BOOTH)
    master = merge_defaults(load_json(MASTER_CONFIG, {}))
    master_exists = os.path.isdir(MASTER_DIR)
    if not (master.get("db_root") or "").strip():
        master["db_root"] = default_db_root()
    return {"booth": booth, "master": master, "master_exists": master_exists,
            "master_config_path": MASTER_CONFIG,
            "db_root_status": probe_dir(master["db_root"]) if master_exists else None}


@router.post("/ui_config")
def save_ui_config(cfg: dict):
    try:
        booth = cfg.get("booth"); master = cfg.get("master")
        if booth is not None: save_json(BOOTH_CONFIG, booth)
        if master is not None and os.path.isdir(MASTER_DIR):
            rpc_success = False
            try:
                from tui_gateway.methods_config_set import _CONFIG_SETTERS
                setter = _CONFIG_SETTERS.get("her_monitor_action_master")
                if setter:
                    res = setter(1, {}, "her_monitor_action_master", master, None)
                    if isinstance(res, dict) and "error" not in res: rpc_success = True
            except ImportError: pass
            if not rpc_success: save_master_config(master)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/db_root_status")
def get_db_root_status(path: str = Query(None)):
    if path is None or not str(path).strip(): return probe_dir(effective_db_root())
    return probe_dir(path)


@router.post("/fix_db_root_permission")
def fix_db_root_permission(payload: dict):
    path = (payload or {}).get("path", "").strip()
    if not path: raise HTTPException(400, "缺少路径")
    try: p = safe_abs(path)
    except ValueError as e: raise HTTPException(400, str(e))
    if not os.path.exists(p): raise HTTPException(400, "目录不存在，无法设置权限")
    if not os.path.isdir(p): raise HTTPException(400, "路径不是目录")
    try: os.chmod(p, 0o777)
    except PermissionError as e: raise HTTPException(403, f"设置权限失败（权限不足）: {e}")
    except Exception as e: raise HTTPException(500, f"设置权限失败: {e}")
    return probe_dir(p)


@router.post("/ensure_db_root")
def ensure_db_root(payload: dict):
    path = (payload or {}).get("path", "").strip()
    if not path: raise HTTPException(400, "缺少路径")
    try: p = safe_abs(path)
    except ValueError as e: raise HTTPException(400, str(e))
    if os.path.exists(p):
        if not os.path.isdir(p): raise HTTPException(400, "路径已存在但不是目录")
        return probe_dir(p)
    parent = os.path.dirname(p) or "/"
    if not os.path.isdir(parent): raise HTTPException(400, f"父目录不存在，无法创建: {parent}")
    try: os.makedirs(p, exist_ok=False)
    except PermissionError as e: raise HTTPException(403, f"创建失败（权限不足）: {e}")
    except Exception as e: raise HTTPException(500, f"创建失败: {e}")
    return probe_dir(p)