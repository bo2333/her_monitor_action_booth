import json, os, sys
from core.paths import MASTER_CONFIG, MASTER_DEF_CONFIG, default_db_root, resolve_path
from core.utils import load_json, save_json

_def_cache = None
_def_cache_mtime = 0.0


def _load_master_default():
    """从 master 插件的 master_config.def.json 读默认结构。"""
    global _def_cache, _def_cache_mtime
    try:
        m = os.path.getmtime(MASTER_DEF_CONFIG)
    except Exception:
        return {}
    if _def_cache is not None and _def_cache_mtime == m:
        return json.loads(json.dumps(_def_cache))
    try:
        with open(MASTER_DEF_CONFIG, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise ValueError("顶层不是 JSON 对象")
    except Exception as e:
        print(
            f"[Booth] 无法加载 master 默认配置 {MASTER_DEF_CONFIG}: {e!r}",
            file=sys.stderr,
        )
        data = {}
    _def_cache = json.loads(json.dumps(data))
    _def_cache_mtime = m
    return data


def merge_defaults(master):
    """用 master_config.def.json 补全 master 配置。"""
    default = _load_master_default()
    if not isinstance(master, dict):
        master = {}
    if not default:
        return master
    m = json.loads(json.dumps(default))
    for k, v in master.items():
        if isinstance(v, dict) and isinstance(m.get(k), dict):
            m[k].update(v)
        else:
            m[k] = v
    return m


def effective_db_root():
    if os.path.exists(MASTER_CONFIG):
        master = load_json(MASTER_CONFIG, {})
        db_root = (master.get("db_root") or "").strip()
        if db_root:
            return resolve_path(db_root)
    return default_db_root()


def save_master_config(master):
    existing = load_json(MASTER_CONFIG, {})
    if not isinstance(existing, dict):
        existing = {}
    merged = {**existing, **master}
    if isinstance(master.get("remote"), dict):
        merged["remote"] = {**(existing.get("remote") or {}), **master["remote"]}
    raw = (merged.get("db_root") or "").strip()
    if raw:
        try:
            if os.path.realpath(resolve_path(raw)) == os.path.realpath(default_db_root()):
                merged["db_root"] = ""
            else:
                merged["db_root"] = raw
        except Exception:
            merged["db_root"] = raw
    else:
        merged["db_root"] = ""
    save_json(MASTER_CONFIG, merged)