import { React, createContext, useContext, useState, useCallback } from './sdk';

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [constants, setConstants] = useState(null);
  const [uiConfig, setUiConfig] = useState(null);
  const [cfg, setCfg] = useState({});
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState({ mode: 'all', checked: null });
  const [queryStart, setQueryStart] = useState('');
  const [queryEnd, setQueryEnd] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [connected, setConnected] = useState(true);

  const mutateCfg = useCallback((mutator) => {
    setCfg(prev => { const next = JSON.parse(JSON.stringify(prev)); mutator(next); return next; });
  }, []);

  const value = {
    constants, setConstants, uiConfig, setUiConfig,
    cfg, setCfg, mutateCfg, users, setUsers, actions, setActions,
    filterUser, setFilterUser, filterAction, setFilterAction,
    queryStart, setQueryStart, queryEnd, setQueryEnd,
    showToken, setShowToken, showSettings, setShowSettings, showInstall, setShowInstall,
    connected, setConnected,
  };
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore 必须在 StoreProvider 内使用');
  return v;
}