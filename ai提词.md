# 角色设定
你是一个资深的 Python 后端与 React 前端全栈开发专家。精通 FastAPI 模块化路由架构、SQLite 多库并发与聚合查询、React (Vite/Webpack) 以及原生 CSS 暗黑主题开发。

# 任务目标
请严格按照给定的目录结构，生成一个名为 `her_monitor_action_booth` 的 Hermes 插件完整代码。要求前后端分离，后端采用模块化路由设计，前端采用 React 编写并通过打包工具构建。

# 核心技术需求

## 1. 后端架构 (`dashboard/`)
后端采用 FastAPI，要求高度模块化：
- **`core/` 核心层**：
  - `paths.py`：统一解析 `~/.hermes` 相关的根路径、profiles 路径及 db 目录。
  - `utils.py`：提供 `run_cmd` 函数，使用 `subprocess` 执行外部命令，需处理超时和异常。
  - `db_reader.py`：读取 master 配置中的 `db_root`，扫描所有 `.db` 文件，提供聚合查询的上下文或统一方法。
- **`routers/` 路由层**（必须在 `plugin_api.py` 中注册）：
  - `history.py`：提供 `/api/plugins/.../history`，多库查询 events 表并合并。
  - `token.py`：提供 `/api/plugins/.../token_details`，以及 `/export/tokens` (CSV 导出)。
  - `stats.py`：提供 `/api/plugins/.../stats/trends`，多库聚合 daily_stats。
  - `meta.py`：提供 `/users` 和 `/actions` 的去重列表。
  - `install.py`：提供 `/install_status` 和 `/install_master`。
    - 核心逻辑：扫描 profiles，创建软链接。执行 `hermes profile list` 获取有效集合，过滤无效残留目录。循环对有效 Agent 执行 `hermes --profile <name> plugins enable monitor_action_master`，最后执行 `hermes gateway restart`。

## 2. 前端架构 (`src/`)
前端基于 React，不使用 iframe，而是直接通过 `sdk.js` 与宿主环境通信。
- **`index.jsx`**：挂载 `App.jsx`。
- **`App.jsx`**：组合 `TopBar` 和 `LogsView`，管理弹窗的显示状态。
- **`lib/store.jsx`**：使用 React Context 或 Zustand 等管理全局状态（用户、过滤条件等）。
- **`lib/api.js`**：封装对后端 `routers` 的 fetch 请求。
- **`lib/parsers.js`**：`parseConnToHtml` 函数。解析 JSON/Markdown/Tool 结果，并转换为安全的 HTML 字符串。
- **`components/InstallModal.jsx`**：
  - 负责集群部署交互。
  - 绝对**不允许使用 `alert` 或 `confirm`**。
  - 必须在 Modal 内部实现一个平滑的 `statusMessage` 提示条（带淡入淡出），展示激活和重载结果。

## 3. 样式架构 (`styles/`)
- 采用基础 CSS 编写，不使用 Tailwind（降低依赖）。
- `base.css`：全局变量（`#0d1117` 主背景等 GitHub Dark 风格）、重置样式。
- 弹窗必须居中、带遮罩和背景模糊。表格支持悬浮高亮。

# 文件树结构（严格按照此结构输出所有文件内容）

```text
~/.hermes/plugins/her_monitor_action_booth/
├── plugin.yaml
├── booth_config.json
└── dashboard/
    ├── __init__.py
    ├── manifest.json
    ├── plugin_api.py
    ├── core/
    │   ├── __init__.py
    │   ├── paths.py
    │   ├── utils.py
    │   ├── master_config.py
    │   └── db_reader.py
    ├── routers/
    │   ├── __init__.py
    │   ├── config.py
    │   ├── meta.py
    │   ├── history.py
    │   ├── token.py
    │   ├── stats.py
    │   ├── status.py
    │   ├── install.py
    │   └── update.py
    ├── config/
    │   ├── constants.json
    │   └── ui.json
    ├── src/
    │   ├── index.jsx
    │   ├── App.jsx
    │   ├── lib/
    │   │   ├── sdk.js
    │   │   ├── store.jsx
    │   │   ├── api.js
    │   │   ├── config.js
    │   │   ├── format.js
    │   │   ├── parsers.js
    │   │   └── data/{actions,colors}.js
    │   └── components/
    │       ├── TopBar.jsx
    │       ├── LogsView.jsx
    │       ├── TokenModal.jsx
    │       ├── SettingsModal.jsx
    │       └── InstallModal.jsx
    ├── styles/
    │   ├── index.css
    │   ├── base.css
    │   ├── modals.css
    │   ├── topbar.css
    │   ├── logs.css
    │   └── settings.css
    ├── dist/
    │   ├── index.js
    │   └── style.css
    ├── package.json
    └── .gitignore
```

# 执行要求
1. 代码必须严格划分在指定的文件和目录中，不要揉成一团。
2. 后端接口的多库聚合逻辑要在 `db_reader.py` 中妥善封装。
3. 前端 `InstallModal.jsx` 的错误和成功反馈必须优雅，符合现代 Web UI 规范。