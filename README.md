monitor_action_booth/
├── plugin.yaml
├── booth_config.json
└── dashboard/
    ├── manifest.json
    ├── index.html
    ├── plugin_api.py
    ├── dist/
    │   └── index.js
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
    │   ├── install.py
    │   └── update.py
    ├── css/
    │   ├── base.css
    │   └── view-base.css
    ├── js/
    │   ├── app.js
    │   ├── store.js
    │   ├── api.js
    │   ├── utils.js
    │   ├── parsers.js
    │   └── data/
    │       ├── actions.js
    │       └── colors.js
    └── views/
        ├── TopBar.html, TopBar.js, TopBar.css
        ├── LogsView.html, LogsView.js, LogsView.css
        ├── TokenModal.html, TokenModal.js, TokenModal.css
        ├── SettingsModal.html, SettingsModal.js, SettingsModal.css
        └── InstallModal.html, InstallModal.js, InstallModal.css
        (删除 HistoryModal.*)