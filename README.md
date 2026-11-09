~/.hermes/plugins/her_monitor_action_booth/
├── plugin.yaml
├── booth_config.json
└── dashboard/
    ├── __init__.py
    ├── manifest.json
    ├── plugin_api.py          ← 必须在 dashboard/ 内
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