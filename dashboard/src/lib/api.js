import { fetchJSON } from './sdk';
import { FALLBACK_CONSTANTS } from './config';
const API = FALLBACK_CONSTANTS.apiPrefix;

async function _streamPost(url, onLine) {
  const resp = await fetch(url, { method: 'POST' });
  if (!resp.ok || !resp.body) throw new Error((await resp.json().catch(() => ({}))).detail || `HTTP ${resp.status}`);
  const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n'); buffer = events.pop() || '';
    for (const evt of events) for (const line of evt.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const text = line.substring(6); if (text === '[DONE]') return;
      onLine && onLine(text);
    }
  }
}

export const api = {
  getUsers: () => fetchJSON(`${API}/users`), getActions: () => fetchJSON(`${API}/actions`),
  getConfig: () => fetchJSON(`${API}/ui_config`),
  saveConfig: (cfg) => fetchJSON(`${API}/ui_config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }),
  getTrends: ({ period = 'total', start = null, end = null } = {}) => {
    const p = new URLSearchParams();
    if (start !== null && end !== null) { p.append('start', start); p.append('end', end); } else p.append('period', period);
    return fetchJSON(`${API}/stats/trends?${p}`);
  },
  getTokenDetails: (user, limit, start = null, end = null) => {
    const p = new URLSearchParams(); if (user) p.append('user', user); p.append('limit', String(limit));
    if (start != null) p.append('start', String(start)); if (end != null) p.append('end', String(end));
    return fetchJSON(`${API}/token_details?${p}`);
  },
  getExportTrendsUrl: (period, start, end) => {
    const p = new URLSearchParams();
    if (start != null && end != null) { p.append('start', start); p.append('end', end); } else p.append('period', period);
    return `${API}/export/trends?${p}`;
  },
  getHistoryFiltered: ({ user, start, end, limit = 2000 }) => {
    const p = new URLSearchParams(); if (user) p.append('user', user);
    if (start != null) p.append('start', start); if (end != null) p.append('end', end);
    p.append('limit', String(limit)); return fetchJSON(`${API}/history?${p}`);
  },
  getInstallStatus: () => fetchJSON(`${API}/install_status`),
  installMaster: () => fetchJSON(`${API}/install_master`, { method: 'POST' }),
  installDefaultMaster: () => fetchJSON(`${API}/install_default_master`, { method: 'POST' }),
  getDbRootStatus: (path) => fetchJSON(`${API}/db_root_status?path=${encodeURIComponent(path || '')}`),
  fixDbRootPermission: (path) => fetchJSON(`${API}/fix_db_root_permission`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) }),
  ensureDbRoot: (path) => fetchJSON(`${API}/ensure_db_root`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) }),
  getUpdateStatus: () => fetchJSON(`${API}/update_status`),
  streamUpdateBooth: (onLine) => _streamPost(`${API}/update_booth`, onLine),
  streamUpdateMaster: (onLine) => _streamPost(`${API}/update_master`, onLine),
  getRuntimeStatus: () => fetchJSON(`${API}/status`),

  // ★ 新增：master 日志
  getMasterLogs: () => fetchJSON(`${API}/master_logs`),
  getMasterLogContent: (name, tail = 500) => {
    const p = new URLSearchParams();
    p.append('name', name);
    p.append('tail', String(tail));
    return fetchJSON(`${API}/master_log_content?${p}`);
  },
};