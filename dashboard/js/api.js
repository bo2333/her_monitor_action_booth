const API = '/api/plugins/her_monitor_action_booth';

async function _streamPost(url, onLine) {
  const resp = await fetch(url, { method: 'POST' });
  if (!resp.ok || !resp.body) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const evt of events) {
      for (const line of evt.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const text = line.substring(6);
        if (text === '[DONE]') return;
        onLine && onLine(text);
      }
    }
  }
}

export const api = {
  getUsers: () => fetch(API + '/users').then(r => r.json()),
  getActions: () => fetch(API + '/actions').then(r => r.json()),
  getConfig: () => fetch(API + '/ui_config').then(r => r.json()),
  saveConfig: (cfg) => fetch(API + '/ui_config', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg)
  }),
  getTrends: ({ period = 'total', start = null, end = null } = {}) => {
    const p = new URLSearchParams();
    if (start !== null && end !== null) {
      p.append('start', String(start));
      p.append('end', String(end));
    } else {
      p.append('period', period);
    }
    return fetch(`${API}/stats/trends?${p.toString()}`).then(r => r.json());
  },
  getTokenDetails: (user, limit, start = null, end = null) => {
    const p = new URLSearchParams();
    if (user) p.append('user', user);
    p.append('limit', String(limit));
    if (start != null) p.append('start', String(start));
    if (end != null) p.append('end', String(end));
    return fetch(`${API}/token_details?${p.toString()}`).then(r => r.json());
  },

  // 增加汇总导出 URL 拼接
  getExportTrendsUrl: (period, start, end) => {
    const p = new URLSearchParams();
    if (start != null && end != null) {
      p.append('start', String(start));
      p.append('end', String(end));
    } else {
      p.append('period', period);
    }
    return `${API}/export/trends?${p.toString()}`;
  },
  getHistory: (user, limit) => fetch(API + `/history?user=${user}&limit=${limit}`).then(r => r.json()),

  getHistoryFiltered: ({ user, start, end, limit = 2000 }) => {
    const p = new URLSearchParams();
    if (user) p.append('user', user);
    if (start != null) p.append('start', String(start));
    if (end != null) p.append('end', String(end));
    p.append('limit', String(limit));
    return fetch(`${API}/history?${p.toString()}`).then(r => r.json());
  },

  getInstallStatus: () => fetch(API + '/install_status').then(r => r.json()),
  installMaster: () => fetch(API + '/install_master', { method: 'POST' }).then(r => r.json()),
  installDefaultMaster: () => fetch(API + '/install_default_master', { method: 'POST' }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
    return data;
  }),
  getDbRootStatus: (path) => fetch(API + `/db_root_status?path=${encodeURIComponent(path || '')}`).then(r => r.json()),
  fixDbRootPermission: (path) => fetch(API + '/fix_db_root_permission', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path })
  }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
    return data;
  }),
  ensureDbRoot: (path) => fetch(API + '/ensure_db_root', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path })
  }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
    return data;
  }),

  getUpdateStatus: () => fetch(API + '/update_status').then(r => r.json()),
  streamUpdateBooth: (onLine) => _streamPost(API + '/update_booth', onLine),
  streamUpdateMaster: (onLine) => _streamPost(API + '/update_master', onLine),

  // ★ 新增：获取运行状态
  getRuntimeStatus: () => fetch(API + '/status').then(r => r.json()),
};