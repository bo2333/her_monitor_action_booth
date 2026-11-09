# Her Monitor Action Booth (监察大师监控大厅)

这是一个为 Hermes 系统量身定制的插件级监控面板，采用**模块化 FastAPI 后端**与 **React 前端架构**，支持跨 Agent 多库 SQLite 聚合查询，零 Token 开销。

## ✨ 核心特性

- **多库聚合查询**：`core/db_reader.py` 通过读取 master 配置，直连并聚合扫描 `db_root` 下的所有 `.db` 文件，实现全局数据合并。
- **前后端分离架构**：后端提供标准的 RESTful API（按 `routers` 模块拆分），前端采用 React + 打包构建，结构清晰，易于扩展。
- **全链路日志解析**：内置 Markdown 渲染、JSON 美化、工具调用（Tool Call/Result）提取，沉浸式暗黑主题 UI。
- **一键集群部署**：在设置页中通过 `install` 路由批量创建软链接，调用 `hermes` CLI 自动激活插件并重载网关。
- **CSV 数据导出**：支持历史记录和 Token 明细一键下载 CSV。

## 📁 完整目录结构

```text
~/.hermes/plugins/her_monitor_action_booth/
├── plugin.yaml                  # 插件元数据
├── booth_config.json            # 大厅本地配置文件
└── dashboard/
    ├── __init__.py
    ├── manifest.json            # 前端挂载点配置
    ├── plugin_api.py            # FastAPI 总入口 (包含 routers)
    ├── core/                    # ★ 核心业务逻辑模块
    │   ├── __init__.py
    │   ├── paths.py             # 路径解析 (hermes root, profiles, db)
    │   ├── utils.py             # 工具函数 (子进程执行等)
    │   ├── master_config.py     # 读写监察大师配置
    │   └── db_reader.py         # 多库 SQLite 连接与聚合查询封装
    ├── routers/                 # ★ API 路由模块
    │   ├── __init__.py
    │   ├── config.py            # 配置读写 (/ui_config)
    │   ├── meta.py              # 用户与动作列表 (/users, /actions)
    │   ├── history.py           # 历史记录 (/history)
    │   ├── token.py             # Token 明细与导出 (/token_details)
    │   ├── stats.py             # Token 趋势聚合 (/stats/trends)
    │   ├── status.py            # 集群状态检查 (/install_status)
    │   ├── install.py           # 集群部署执行 (/install_master)
    │   └── update.py            # 插件更新相关
    ├── config/                  # 静态配置
    │   ├── constants.json
    │   └── ui.json
    ├── src/                     # ★ React 源码目录
    │   ├── index.jsx            # React 挂载入口
    │   ├── App.jsx              # 主应用容器
    │   ├── lib/                 # 核心库
    │   │   ├── sdk.js           # Hermes SDK 交互封装
    │   │   ├── store.jsx        # 全局状态管理
    │   │   ├── api.js           # 后端接口请求封装
    │   │   ├── config.js
    │   │   ├── format.js        # 时间/金额格式化
    │   │   ├── parsers.js       # 智能解析器
    │   │   └── data/
    │   │       ├── actions.js   # 动作分类字典
    │   │       └── colors.js    # 颜色主题字典
    │   └── components/          # ★ React 组件库
    │       ├── TopBar.jsx       # 顶部筛选操作栏
    │       ├── LogsView.jsx     # 日志主渲染区
    │       ├── TokenModal.jsx   # Token 统计弹窗
    │       ├── SettingsModal.jsx# 设置弹窗
    │       └── InstallModal.jsx # 集群部署弹窗 (含平滑状态提示)
    ├── styles/                  # 样式表目录 (CSS)
    │   ├── index.css
    │   ├── base.css
    │   ├── modals.css
    │   ├── topbar.css
    │   ├── logs.css
    │   └── settings.css
    ├── dist/                    # 构建产物
    │   ├── index.js             # 编译后的 JS
    │   └── style.css            # 编译后的 CSS
    ├── package.json             # Node.js 依赖配置
    └── .gitignore
```

## 🚀 开发与构建

1. 安装前端依赖：
   `cd dashboard && npm install`
2. 开发模式：
   `npm run dev`
3. 构建产物：
   `npm run build`（产物输出到 `dist/` 目录）

## ⚙️ 核心模块说明

- **`core/db_reader.py`**：封装了获取所有有效 SQLite 路径、建立连接、执行 SQL 以及结果合并排序的逻辑，供各个 router 直接调用，避免代码冗余。
- **`routers/install.py`**：执行集群部署的调度中心。它会遍历 `profiles` 目录，创建软链接，调用 `core.utils` 里的命令执行器运行 `hermes profile list`、`hermes --profile <name> plugins enable` 和 `hermes gateway restart`，返回详细的激活状态。
- **`src/components/InstallModal.jsx`**：负责可视化部署过程。**不使用原生 `alert`**，而是通过 React 的 state 驱动一个平滑的 Status Banner 提示条，实时反馈部署成功或失败的明细。