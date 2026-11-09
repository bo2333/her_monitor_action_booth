import os, shutil
from fastapi import APIRouter
from core.paths import MASTER_DIR, PROFILES_DIR
router = APIRouter()

def _master_plugin_dir(profile):
    return os.path.join(PROFILES_DIR, profile, "plugins", "her_monitor_action_master")

def _profile_exists(profile):
    return os.path.isdir(os.path.join(PROFILES_DIR, profile))

@router.get("/install_status")
def install_status():
    master_exists = os.path.isdir(MASTER_DIR)
    profiles = []
    if os.path.isdir(PROFILES_DIR):
        for name in sorted(os.listdir(PROFILES_DIR)):
            pdir = os.path.join(PROFILES_DIR, name)
            if not os.path.isdir(pdir): continue
            target = _master_plugin_dir(name)
            status = "missing"; message = "未链接"; tgt = ""
            if os.path.islink(target):
                tgt = os.readlink(target)
                if os.path.exists(target): status = "linked"; message = "已链接"
                else: status = "broken"; message = "链接错误"
            elif os.path.exists(target):
                status = "conflict"; message = "独立安装"
            elif _profile_exists(name):
                status = "linked_inactive"; message = "未激活"
            profiles.append({"name": name, "status": status, "message": message, "target": tgt})
    return {"master_exists": master_exists, "master_plugin_dir": MASTER_DIR,
            "profiles_dir": PROFILES_DIR, "profiles": profiles,
            "activation": [], "reload": None}

@router.post("/install_master")
def install_master():
    if not os.path.isdir(MASTER_DIR):
        return {"ok": False, "message": "master 插件目录不存在"}
    activation = []
    if os.path.isdir(PROFILES_DIR):
        for name in sorted(os.listdir(PROFILES_DIR)):
            pdir = os.path.join(PROFILES_DIR, name)
            if not os.path.isdir(pdir): continue
            target = _master_plugin_dir(name)
            ok = True; msg = "已链接"
            try:
                os.makedirs(os.path.dirname(target), exist_ok=True)
                if os.path.islink(target) or os.path.exists(target):
                    if os.path.islink(target): os.unlink(target)
                    else: shutil.rmtree(target, ignore_errors=True)
                os.symlink(MASTER_DIR, target)
            except Exception as e:
                ok = False; msg = str(e)
            activation.append({"profile": name, "ok": ok, "skipped": False, "message": msg})
    return {"master_exists": True, "master_plugin_dir": MASTER_DIR,
            "profiles_dir": PROFILES_DIR, "profiles": [],
            "activation": activation, "reload": {"ok": True, "message": "请手动重启 gateway"}}

@router.post("/install_default_master")
def install_default_master():
    target = os.path.join(PROFILES_DIR, "default", "plugins", "her_monitor_action_master")
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        if os.path.islink(target): os.unlink(target)
        elif os.path.exists(target): shutil.rmtree(target, ignore_errors=True)
        os.symlink(MASTER_DIR, target)
        return {"ok": True, "message": "默认 Agent 安装成功"}
    except Exception as e:
        return {"ok": False, "message": str(e)}