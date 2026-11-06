import os

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_DASHBOARD_DIR = os.path.dirname(_CORE_DIR)
BOOTH_DIR = os.path.dirname(_DASHBOARD_DIR)

BOOTH_CONFIG = os.path.join(BOOTH_DIR, "booth_config.json")
PLUGINS_DIR = os.path.dirname(BOOTH_DIR)
HERMES_ROOT = os.path.dirname(PLUGINS_DIR)
MASTER_DIR = os.path.join(PLUGINS_DIR, "monitor_action_master")

# 严格依据 monitor_action_master 的目录结构
MASTER_CONFIG = os.path.join(MASTER_DIR, "config", "master_config.json")
MASTER_STATUS_DIR = os.path.join(MASTER_DIR, "status")

PROFILES_DIR = os.path.join(HERMES_ROOT, "profiles")
HERMES_BIN = os.environ.get("HERMES_BIN", "hermes")
MASTER_GIT_URL = "https://github.com/bo2333/monitor_action_master"

DEFAULT_BOOTH = {
    "max_screen_entries": 2000,
    "colors": {
        "ts": "#8b949e", "ip": "#d2a8ff", "user": "#7ee787",
        "flow_send": "#ffa657", "flow_recv": "#79c0ff", "action": "#ff7b72",
        "level_bg": {
            "0": {"color": "#8b949e", "alpha": 30},
            "1": {"color": "#58a6ff", "alpha": 30},
            "2": {"color": "#3fb950", "alpha": 30},
            "3": {"color": "#d29922", "alpha": 40},
            "4": {"color": "#f85149", "alpha": 40},
            "5": {"color": "#ff7b72", "alpha": 50},
        },
    },
}

DEFAULT_MASTER = {
    "enabled": False, "logging": False, "db_root": "",
    "remote": {"enabled": False, "host": "127.0.0.1",
               "port": 9999, "check_interval": 60},
}

SYSTEM_TOP = {"/", "/bin", "/boot", "/dev", "/etc", "/lib", "/lib64",
              "/proc", "/root", "/run", "/sbin", "/srv", "/sys",
              "/usr", "/var", "/home", "/opt", "/tmp"}

def resolve_path(path):
    if not path or not str(path).strip():
        return ""
    p = os.path.expanduser(str(path).strip())
    if not os.path.isabs(p):
        p = os.path.join(BOOTH_DIR, p)
    return os.path.abspath(p)

def default_db_root():
    return os.path.join(os.path.realpath(MASTER_DIR), "data")