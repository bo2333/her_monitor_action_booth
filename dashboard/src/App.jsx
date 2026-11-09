import { React, useEffect, useState } from './lib/sdk';
import { api } from './lib/api';
import { loadFrontendConfig, FALLBACK_CONSTANTS, FALLBACK_UI } from './lib/config';
import { StoreProvider, useStore } from './lib/store';
import { PRESET_ACTIONS } from './lib/data/actions';
import TopBar from './components/TopBar';
import LogsView from './components/LogsView';
import TokenModal from './components/TokenModal';
import SettingsModal from './components/SettingsModal';
import InstallModal from './components/InstallModal';

const h = React.createElement;

function InnerApp() {
  const s = useStore();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settled = await Promise.allSettled([
        loadFrontendConfig(), api.getConfig(), api.getUsers(), api.getActions(),
      ]);
      if (cancelled) return;
      const pick = (r, name, fb) => {
        if (r.status === 'fulfilled') return r.value;
        console.warn(`[booth] ${name} 加载失败:`, r.reason);
        return fb;
      };
      const frontCfg = pick(settled[0], 'frontend-config', { constants: FALLBACK_CONSTANTS, uiConfig: FALLBACK_UI });
      s.setConstants(frontCfg.constants);
      s.setUiConfig(frontCfg.uiConfig);
      s.setCfg(pick(settled[1], '/ui_config', {}));
      s.setUsers(pick(settled[2], '/users', []));
      const actions = pick(settled[3], '/actions', []);
      s.setActions(Array.from(new Set([...PRESET_ACTIONS, ...actions])).sort());
      setReady(true);
    })().catch(e => { if (!cancelled) setInitError(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, []);

  if (initError) return h('div', { className: 'booth-app', style: { padding: 24, color: 'var(--danger)' } }, '初始化失败：', initError);
  if (!ready) return null;

  return h('div', { className: 'booth-app' },
    h(TopBar), h(LogsView),
    s.showToken && h(TokenModal),
    s.showSettings && h(SettingsModal),
    s.showInstall && h(InstallModal),
  );
}

export default function App(props) {
  return h(StoreProvider, null, h(InnerApp, props));
}