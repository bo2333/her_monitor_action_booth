import os, shlex
from fastapi import APIRouter, HTTPException
from core.paths import HERMES_BIN, MASTER_DIR, MASTER_GIT_URL, PROFILES_DIR
from core.utils import get_valid_profiles, run_cmd

router = APIRouter()

def _scan_and_link(do_link=False):
    result = {"master_exists": os.path.isdir(MASTER_DIR), "master_plugin_dir": MASTER_DIR, "profiles_dir": PROFILES_DIR, "profiles": [], "activation": [], "reload": None}
    if not result["master_exists"] or not os.path.isdir(PROFILES_DIR): return result
    expected_realpath = os.path.realpath(MASTER_DIR)
    need_activate = []

    for name in sorted(os.listdir(PROFILES_DIR)):
        if name.startswith("."): continue
        profile_path = os.path.join(PROFILES_DIR, name)
        if not os.path.isdir(profile_path): continue
        plugins_dir = os.path.join(profile_path, "plugins")
        link_path = os.path.join(plugins_dir, "her_monitor_action_master")
        info = {"name": name, "path": profile_path, "link_path": link_path, "status": "unknown", "target": "", "message": ""}

        if not os.path.lexists(link_path):
            info["status"] = "missing"; info["message"] = "未链接"
            if do_link:
                try:
                    os.makedirs(plugins_dir, exist_ok=True); os.symlink(MASTER_DIR, link_path, target_is_directory=True)
                    info.update(status="linked", target=MASTER_DIR, message="已创建软链接"); need_activate.append(name)
                except Exception as e: info.update(status="error", message=f"创建失败: {e}")
        elif os.path.islink(link_path):
            actual = os.path.realpath(link_path); info["target"] = actual
            if actual == expected_realpath:
                info.update(status="linked", message="已正确链接")
                if do_link: need_activate.append(name)
            else:
                info.update(status="broken", message="链接指向错误")
                if do_link:
                    try:
                        os.unlink(link_path); os.symlink(MASTER_DIR, link_path, target_is_directory=True)
                        info.update(status="linked", target=MASTER_DIR, message="已修复为正确链接"); need_activate.append(name)
                    except Exception as e: info.update(status="error", message=f"修复失败: {e}")
        else: info.update(status="conflict", message="已独立安装，不覆盖")
        result["profiles"].append(info)

    if do_link and need_activate:
        valid, msg = get_valid_profiles()
        if valid is None or not valid: valid = set(need_activate)
        bin_q = shlex.quote(HERMES_BIN); activated_any = False
        for name in need_activate:
            if name not in valid:
                result["activation"].append({"profile": name, "ok": False, "skipped": True, "message": "Profile 不存在（目录残留），已跳过激活"})
                for p in result["profiles"]:
                    if p["name"] == name: p["status"] = "skipped"; p["message"] = "目录残留，已跳过激活"; break
                continue
            activated_any = True
            cmd = f"{bin_q} --profile {shlex.quote(name)} plugins enable her_monitor_action_master"
            ok, out = run_cmd(cmd, timeout=30)
            result["activation"].append({"profile": name, "ok": ok, "message": out})
            for p in result["profiles"]:
                if p["name"] == name:
                    if ok: p["status"] = "linked"; p["message"] = "已创建/修复链接并激活"
                    else: p["status"] = "linked_inactive"; p["message"] = f"已链接，激活失败: {out}"
                    break
        if activated_any:
            ok, out = run_cmd(f"{bin_q} gateway restart", timeout=120)
            result["reload"] = {"ok": ok, "message": out}
        else: result["reload"] = {"ok": True, "message": "没有需要激活的有效 Profile，跳过网关重启"}
    return result

@router.get("/install_status")
def get_install_status(): return _scan_and_link(do_link=False)

@router.post("/install_master")
def install_master(): return _scan_and_link(do_link=True)

@router.post("/install_default_master")
def install_default_master():
    bin_q = shlex.quote(HERMES_BIN); url_q = shlex.quote(MASTER_GIT_URL)
    ok, msg = run_cmd(f"{bin_q} plugins install {url_q} --enable --force", timeout=180)
    if not ok: raise HTTPException(500, f"安装失败: {msg}")
    ok2, msg2 = run_cmd(f"{bin_q} gateway restart", timeout=120)
    if not ok2: return {"success": True, "message": f"插件已安装，但网关重启失败: {msg2}。请手动重启网关"}
    return {"success": True, "message": "安装成功，网关已重启"}