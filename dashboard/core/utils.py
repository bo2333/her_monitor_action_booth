import json, os, glob, time, shlex, subprocess
from core.paths import HERMES_BIN, SYSTEM_TOP, resolve_path, MASTER_STATUS_DIR


def _pid_alive(pid):
    try:
        pid = int(pid)
    except (TypeError, ValueError):
        return False
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except Exception:
        return False


def load_def_json(def_path, default=None):
    """从 .def.json 读默认结构。读不到返回 default（None 则返回 {}）。"""
    try:
        with open(def_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return default if default is not None else {}


def ensure_config_file(target_path, def_path, fallback_default=None):
    """确保 target_path 存在。

    优先级：
    1. 已存在且能解析 → 返回 True
    2. 已存在但损坏 → 删除后尝试从 def_path 复制
    3. 不存在 → 从 def_path 复制
    4. def_path 不存在/复制失败 → 仅在 fallback_default 非 None 时写入
       （当前调用方均不传 fallback_default，即只用 .def.json）
    """
    if os.path.exists(target_path):
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                json.load(f)
            return True
        except Exception as e:
            print(f"[Booth] {target_path} 损坏（{e}），将从模板重新生成")
            try:
                os.remove(target_path)
            except Exception:
                pass

    try:
        d = os.path.dirname(target_path)
        if d:
            os.makedirs(d, exist_ok=True)
    except Exception as e:
        print(f"[Booth] 创建目录失败 {os.path.dirname(target_path)}: {e}")
        return False

    if def_path and os.path.exists(def_path):
        try:
            with open(def_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            tmp = target_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp, target_path)
            print(f"[Booth] 已从 {def_path} 生成默认配置 {target_path}")
            return True
        except Exception as e:
            print(f"[Booth] 从 {def_path} 复制失败: {e}，回退到 fallback_default")

    if fallback_default is not None:
        try:
            tmp = target_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(fallback_default, f, ensure_ascii=False, indent=2)
            os.replace(tmp, target_path)
            return True
        except Exception as e:
            print(f"[Booth] 创建配置文件失败 {target_path}: {e}")
            return False

    print(
        f"[Booth] 无法生成 {target_path}："
        f"{def_path} 不存在且未提供 fallback"
    )
    return False


def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return json.loads(json.dumps(default))


def save_json(path, data):
    try:
        d = os.path.dirname(path)
        if d: os.makedirs(d, exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)
        return True
    except Exception as e:
        print(f"[Booth] 保存失败 {path}: {e}")
        return False


def probe_dir(path):
    info = {"path": "", "exists": False, "is_dir": False, "readable": False,
            "writable": False, "ok": False, "message": ""}
    if not path or not str(path).strip():
        info["message"] = "未配置"; return info
    try: p = resolve_path(path)
    except Exception: info["message"] = "路径无效"; return info
    info["path"] = p
    if not os.path.exists(p): info["message"] = "目录不存在"; return info
    if not os.path.isdir(p): info["message"] = "不是目录"; return info
    info["exists"] = info["is_dir"] = True
    try:
        with os.scandir(p) as it: next(it, None)
        info["readable"] = True
    except Exception: info["readable"] = False
    tmp = os.path.join(p, f".__perm_probe_{os.getpid()}_{int(time.time()*1000)}")
    try:
        with open(tmp, "w", encoding="utf-8") as f: f.write("x")
        try: os.remove(tmp)
        except Exception: pass
        info["writable"] = True
    except Exception: info["writable"] = False
    info["ok"] = info["readable"] and info["writable"]
    if info["ok"]: info["message"] = "正常"
    elif not info["readable"] and not info["writable"]: info["message"] = "不可读写"
    elif not info["writable"]: info["message"] = "不可写"
    else: info["message"] = "不可读"
    return info


def run_cmd(cmd, timeout=60):
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        out = (p.stdout or "").strip(); err = (p.stderr or "").strip()
        if p.returncode == 0: return True, out or "ok"
        return False, err or out or f"exit {p.returncode}"
    except subprocess.TimeoutExpired: return False, f"命令超时({timeout}s): {cmd}"
    except Exception as e: return False, f"命令异常: {e}"


def get_valid_profiles():
    bin_q = shlex.quote(HERMES_BIN)
    ok, msg = run_cmd(f"{bin_q} profile list", timeout=30)
    if not ok: return None, msg
    valid = set()
    for line in msg.splitlines():
        line = line.strip()
        if not line: continue
        low = line.lower()
        if "name" in low and "status" in low: continue
        if low.startswith("-") or low.startswith("="): continue
        parts = line.split()
        if parts: valid.add(parts[0])
    return valid, "ok"


def safe_abs(path):
    p = resolve_path(path)
    if not p: raise ValueError("缺少路径")
    if p == "/" or p in SYSTEM_TOP: raise ValueError(f"拒绝操作系统目录: {p}")
    return p


def get_master_status():
    if not os.path.isdir(MASTER_STATUS_DIR):
        return []
    results = []
    for f in glob.glob(os.path.join(MASTER_STATUS_DIR, "*.json")):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            data["_file"] = os.path.basename(f)
            data["_alive"] = _pid_alive(data.get("pid"))
            results.append(data)
        except Exception:
            pass
    results.sort(key=lambda x: x.get("started_at", 0), reverse=True)
    return results