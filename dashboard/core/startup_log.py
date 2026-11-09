import os
import sys
import threading
import time
import traceback

# booth 启动错误日志
# 文件：<booth>/logs/startup_error.log
# 每次 booth 被加载（plugin_api.py import）时清空
# 加载期间出现错误就写入

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_DASHBOARD_DIR = os.path.dirname(_CORE_DIR)
_BOOTH_DIR = os.path.dirname(_DASHBOARD_DIR)
_LOG_DIR = os.path.join(_BOOTH_DIR, "logs")
_STARTUP_LOG = os.path.join(_LOG_DIR, "startup_error.log")

_lock = threading.Lock()


def _ensure_log_dir():
    try:
        os.makedirs(_LOG_DIR, exist_ok=True)
        return True
    except Exception as e:
        try:
            print(f"[booth] 无法创建日志目录 {_LOG_DIR}: {e}", file=sys.stderr)
        except Exception:
            pass
        return False


def get_log_dir():
    return _LOG_DIR


def get_startup_log_path():
    return _STARTUP_LOG


def clear_startup_log():
    """清空启动错误日志。每次 booth 被加载时调一次。"""
    if not _ensure_log_dir():
        return
    with _lock:
        try:
            if os.path.exists(_STARTUP_LOG):
                os.remove(_STARTUP_LOG)
        except Exception:
            pass


def log_startup_error(msg, tb=None):
    """写启动错误。不受任何配置控制。

    - tb: 可选的 traceback 字符串（在 except 块内先 format 好再传入）
    """
    if not _ensure_log_dir():
        return
    text = str(msg)
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with _lock:
        try:
            with open(_STARTUP_LOG, "a", encoding="utf-8") as f:
                f.write(f"[{ts}] {text}\n")
                if tb:
                    f.write(tb)
                    if not tb.endswith("\n"):
                        f.write("\n")
                    f.write("\n")
        except Exception:
            pass
    try:
        print(f"[booth] 启动错误: {text}", file=sys.stderr)
        if tb:
            print(tb, file=sys.stderr)
    except Exception:
        pass