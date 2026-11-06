import json, os
from core.paths import DEFAULT_MASTER, MASTER_CONFIG, default_db_root, resolve_path
from core.utils import load_json, save_json

def _default_master():
    return json.loads(json.dumps(DEFAULT_MASTER))

def merge_defaults(master):
    if not isinstance(master, dict): master = {}
    m = _default_master()
    for k, v in master.items():
        if k == "remote" and isinstance(v, dict): m["remote"].update(v)
        else: m[k] = v
    return m

def effective_db_root():
    if os.path.exists(MASTER_CONFIG):
        master = load_json(MASTER_CONFIG, {})
        db_root = (master.get("db_root") or "").strip()
        if db_root: return resolve_path(db_root)
    return default_db_root()

def save_master_config(master):
    existing = load_json(MASTER_CONFIG, {})
    if not isinstance(existing, dict): existing = {}
    merged = {**existing, **master}
    if isinstance(master.get("remote"), dict):
        merged["remote"] = {**(existing.get("remote") or {}), **master["remote"]}
    raw = (merged.get("db_root") or "").strip()
    if raw:
        try:
            if os.path.realpath(resolve_path(raw)) == os.path.realpath(default_db_root()):
                merged["db_root"] = ""
            else: merged["db_root"] = raw
        except Exception: merged["db_root"] = raw
    else: merged["db_root"] = ""
    save_json(MASTER_CONFIG, merged)