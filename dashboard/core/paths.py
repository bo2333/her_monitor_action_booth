import os

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_DASHBOARD_DIR = os.path.dirname(_CORE_DIR)
BOOTH_DIR = os.path.dirname(_DASHBOARD_DIR)

# ---- booth 自身配置 ----
BOOTH_CONFIG = os.path.join(BOOTH_DIR, "booth_config.json")
BOOTH_CONFIG_DEF = os.path.join(BOOTH_DIR, "booth_config.def.json")

# ---- dashboard/config/ 下静态文件 ----
_CONFIG_DIR = os.path.join(_DASHBOARD_DIR, "config")
CONSTANTS_FILE = os.path.join(_CONFIG_DIR, "constants.json")
CONSTANTS_DEF = os.path.join(_CONFIG_DIR, "constants.def.json")
UI_FILE = os.path.join(_CONFIG_DIR, "ui.json")
UI_DEF = os.path.join(_CONFIG_DIR, "ui.def.json")

# ---- 上下游路径 ----
PLUGINS_DIR = os.path.dirname(BOOTH_DIR)
HERMES_ROOT = os.path.dirname(PLUGINS_DIR)
MASTER_DIR = os.path.join(PLUGINS_DIR, "her_monitor_action_master")
MASTER_CONFIG = os.path.join(MASTER_DIR, "config", "master_config.json")
MASTER_DEF_CONFIG = os.path.join(MASTER_DIR, "config", "master_config.def.json")  # ★ 新增
MASTER_STATUS_DIR = os.path.join(MASTER_DIR, "status")
MASTER_LOG_DIR = os.path.join(MASTER_DIR, "logs")
PROFILES_DIR = os.path.join(HERMES_ROOT, "profiles")
HERMES_BIN = os.environ.get("HERMES_BIN", "hermes")
MASTER_GIT_URL = "https://github.com/bo2333/her_monitor_action_master"

SYSTEM_TOP = {"/", "/bin", "/boot", "/dev", "/etc", "/lib", "/lib64", "/proc",
              "/root", "/run", "/sbin", "/srv", "/sys", "/usr", "/var",
              "/home", "/opt", "/tmp"}


def resolve_path(path):
    if not path or not str(path).strip():
        return ""
    p = os.path.expanduser(str(path).strip())
    if not os.path.isabs(p):
        p = os.path.join(BOOTH_DIR, p)
    return os.path.abspath(p)


def default_db_root():
    return os.path.join(os.path.realpath(MASTER_DIR), "data")