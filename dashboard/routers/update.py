import os, subprocess
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from core.paths import BOOTH_DIR, MASTER_DIR

router = APIRouter()

def _has_git(path): return os.path.isdir(os.path.join(path, ".git"))

@router.get("/update_status")
def get_update_status():
    return {"booth": {"git": _has_git(BOOTH_DIR), "path": BOOTH_DIR},
            "master": {"installed": os.path.isdir(MASTER_DIR), "git": os.path.isdir(MASTER_DIR) and _has_git(MASTER_DIR), "path": MASTER_DIR}}

def _stream_git_pull(path):
    def gen():
        yield f"data: $ cd {path} && git pull\n\n"
        p = None
        try:
            env = os.environ.copy(); env["GIT_TERMINAL_PROMPT"] = "0"; env["GIT_ASKPASS"] = "echo"
            p = subprocess.Popen("git pull", shell=True, cwd=path, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            for line in iter(p.stdout.readline, ""):
                if not line: break
                yield f"data: {line.rstrip(chr(10)).rstrip(chr(13))}\n\n"
            p.wait(timeout=120)
            yield f"data: [exit {p.returncode}]\n\n"
        except subprocess.TimeoutExpired:
            if p:
                try: p.kill()
                except Exception: pass
            yield "data: [超时 120s，已终止]\n\n"
        except Exception as e: yield f"data: [异常: {e}]\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")

@router.post("/update_booth")
def update_booth():
    if not _has_git(BOOTH_DIR): raise HTTPException(400, "booth 根目录不是 git 仓库，无法更新")
    return _stream_git_pull(BOOTH_DIR)

@router.post("/update_master")
def update_master():
    if not os.path.isdir(MASTER_DIR): raise HTTPException(400, "monitor_action_master 未安装")
    if not _has_git(MASTER_DIR): raise HTTPException(400, "monitor_action_master 不是 git 仓库，无法更新")
    return _stream_git_pull(MASTER_DIR)