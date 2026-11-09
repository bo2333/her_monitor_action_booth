import { React, useState, useEffect, useMemo, useCallback } from '../lib/sdk';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { formatAction } from '../lib/format';
import { ACTION_CATEGORIES } from '../lib/data/actions';

const h = React.createElement;

export default function TopBar() {
  const s = useStore();
  const { constants, uiConfig } = s;
  const texts = uiConfig.texts;
  const ev = constants.eventNames;
  const pollMs = constants.polling.statusIntervalMs;
  const loadingMs = constants.polling.queryLoadingMs;
  const rangeSec = constants.defaults.queryRangeSeconds;
  const cols = uiConfig.topbar.statusPanelColumns;
  const groupSpecs = uiConfig.topbar.actionGroups;

  const [actionOpen, setActionOpen]         = useState(false);
  const [showStatus, setShowStatus]         = useState(false);
  const [runtime, setRuntime]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [loadingStatus, setLoadingStatus]   = useState(false);

  useEffect(() => {
    const now = new Date();
    const fmt = (d) => {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    s.setQueryStart(fmt(new Date(now.getTime() - rangeSec * 1000)));
    s.setQueryEnd(fmt(now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try { setRuntime(await api.getRuntimeStatus()); }
    catch (e) { console.error('获取运行状态失败:', e); setRuntime([]); }
    finally { setLoadingStatus(false); }
  }, []);

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, pollMs);
    return () => clearInterval(t);
  }, [loadStatus, pollMs]);

  // 进程是否真的有依赖缺失（仅对存活进程生效）
  const hasDepsError = (st) => !!(st.deps && Object.values(st.deps).some(v => v === false));

  // 只有存活的进程才参与"整体健康"判定；死进程不拉红按钮
  const allHealthy = runtime.length === 0 || runtime.every(st => {
    if (st._alive === false) return true;
    return !hasDepsError(st);
  });

  useEffect(() => {
    const close = () => { setActionOpen(false); setShowStatus(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const actionGroups = useMemo(() => {
    return groupSpecs.map(spec => {
      if (spec.type === 'flow') {
        return { label: spec.label, options: spec.options };
      }
      if (spec.type === 'category') {
        const cats = ACTION_CATEGORIES[spec.category] || [];
        const opts = s.actions.filter(a => cats.includes(a))
          .map(a => ({ label: formatAction(a), value: 'action:' + a }));
        return opts.length ? { label: spec.label, options: opts } : null;
      }
      if (spec.type === 'dynamic') {
        const prefixes = spec.match || [];
        const opts = s.actions.filter(a => prefixes.some(p => a.startsWith(p)))
          .map(a => ({ label: formatAction(a), value: 'action:' + a }));
        return opts.length
          ? { label: spec.label, options: opts }
          : { label: spec.label, options: [{ label: texts.notFoundPlaceholder, value: '__placeholder__', disabled: true }] };
      }
      return null;
    }).filter(Boolean);
  }, [groupSpecs, s.actions, texts.notFoundPlaceholder]);

  const allValues = useMemo(
    () => actionGroups.flatMap(g => g.options.map(o => o.value)).filter(v => v !== '__placeholder__'),
    [actionGroups]
  );

  const triggerText = useMemo(() => {
    if (s.filterAction.mode === 'none') return '暂无';
    const total = allValues.length;
    if (total === 0) return '全部';
    const c = s.filterAction.checked;
    if (c === null) return `全部 (${total})`;
    if (c.length === 0) return `已选 0/${total}`;
    if (c.length >= total) return `全部 (${total})`;
    return `已选 ${c.length}/${total}`;
  }, [s.filterAction, allValues]);

  const isChecked = (v) => {
    if (s.filterAction.mode === 'none') return false;
    if (v === '__placeholder__') return false;
    const c = s.filterAction.checked;
    return c === null || c.includes(v);
  };

  const toggleAction = (v) => {
    if (v === '__placeholder__') return;
    let next;
    if (s.filterAction.checked === null) {
      const n = allValues.filter(x => x !== v);
      next = n.length === allValues.length ? null : n;
    } else {
      const c = [...s.filterAction.checked];
      const i = c.indexOf(v);
      if (i >= 0) c.splice(i, 1); else c.push(v);
      next = c.length >= allValues.length ? null : c;
    }
    s.setFilterAction({ mode: 'all', checked: next });
  };
  const selectNone = () => s.setFilterAction({ mode: 'none', checked: null });
  const selectAll  = () => s.setFilterAction({ mode: 'all',  checked: null });

  const doQuery = () => {
    setLoading(true);
    window.dispatchEvent(new CustomEvent(ev.doQuery, { detail: { start: s.queryStart, end: s.queryEnd } }));
    setTimeout(() => setLoading(false), loadingMs);
  };
  const clearLogs = () => window.dispatchEvent(new CustomEvent(ev.clearLogs));

  const renderStatusCell = (col, st) => {
    if (col.key === 'status') {
      // 三态：已退出 / 依赖缺失 / 正常
      if (st._alive === false) {
        return h('td', { key: col.key },
          h('span', { style: { color: 'var(--text-low)', fontWeight: 'bold' } }, '已退出'));
      }
      if (hasDepsError(st)) {
        return h('td', { key: col.key },
          h('span', { style: { color: '#d29922', fontWeight: 'bold' } }, '依赖缺失'));
      }
      return h('td', { key: col.key },
        h('span', { style: { color: 'var(--success)', fontWeight: 'bold' } }, '正常'));
    }
    const style = {};
    if (col.style === 'user')  { style.fontWeight = 'bold'; style.color = '#7ee787'; }
    if (col.style === 'muted') { style.color = 'var(--text-low)'; }
    return h('td', { key: col.key, style }, st[col.key]);
  };

  return h('div', { className: 'top-bar' },
    h('div', { className: 'filter-group' },
      h('div', { className: 'input-wrapper' },
        h('span', null, '👤 用户'),
        h('select', { value: s.filterUser, onChange: e => s.setFilterUser(e.target.value) },
          h('option', { value: '' }, texts.allUsers),
          s.users.map(u => h('option', { key: u, value: u }, u))
        )
      ),
      h('div', { className: 'input-wrapper action-dropdown' },
        h('span', null, '🎯 动作 / 方向'),
        h('div', { className: 'dropdown-trigger', onClick: e => { e.stopPropagation(); setActionOpen(v => !v); } }, triggerText),
        actionOpen && h('div', { className: 'dropdown-panel', onClick: e => e.stopPropagation() },
          h('div', { className: 'dropdown-item', onClick: selectNone },
            h('span', { className: s.filterAction.mode === 'none' ? 'selected' : '' }, '暂无')
          ),
          h('div', { className: 'dropdown-item', onClick: selectAll },
            h('span', { className: (s.filterAction.mode === 'all' && s.filterAction.checked === null) ? 'selected' : '' }, '全部')
          ),
          h('div', { className: 'dropdown-divider' }),
          actionGroups.map(g => h('div', { key: g.label },
            h('div', { className: 'dropdown-category' }, g.label),
            g.options.map(o => h('div', { key: o.value, className: 'dropdown-item' },
              h('input', {
                type: 'checkbox',
                checked: isChecked(o.value),
                disabled: !!o.disabled,
                onChange: () => toggleAction(o.value),
              }),
              h('label', { style: o.disabled ? { color: '#8b949e', fontStyle: 'italic' } : null }, o.label)
            ))
          ))
        )
      ),
      h('div', { className: 'input-wrapper time-wrapper' },
        h('span', null, '📅 开始'),
        h('input', { type: 'datetime-local', value: s.queryStart, onChange: e => s.setQueryStart(e.target.value) })
      ),
      h('div', { className: 'input-wrapper time-wrapper' },
        h('span', null, '📅 结束'),
        h('input', { type: 'datetime-local', value: s.queryEnd, onChange: e => s.setQueryEnd(e.target.value) })
      ),
      h('button', { className: 'btn btn-primary', onClick: doQuery, disabled: loading },
        loading ? `⏳ ${texts.loadingQuery}` : '🔍 查询'),
      h('button', { className: 'btn', onClick: clearLogs }, '🗑 清空')
    ),

    h('div', { className: 'spacer' }),

    h('div', { className: 'right-group' },
      h('button', { className: 'btn', onClick: () => s.setShowToken(true) }, '🪙 Token 明细'),
      h('button', { className: 'btn', onClick: () => s.setShowSettings(true) }, '⚙ 设置'),

      h('div', { className: 'status-container' },
        h('div', {
          className: 'status-btn ' + (allHealthy ? 'status-ok' : 'status-error'),
          onClick: e => { e.stopPropagation(); setShowStatus(v => !v); if (!showStatus) loadStatus(); },
        },
          h('span', { className: 'status-dot' }),
          allHealthy ? texts.statusHealthy : texts.statusUnhealthy
        ),
        showStatus && h('div', { className: 'status-panel', onClick: e => e.stopPropagation() },
          h('div', { className: 'status-panel-header' },
            h('span', null, 'Agent 运行状态'),
            h('button', { className: 'close-btn', style: { fontSize: 14, padding: '0 4px' }, onClick: () => setShowStatus(false) }, '✕')
          ),
          h('div', { className: 'status-panel-body' },
            h('table', null,
              h('thead', null, h('tr', null, cols.map(c => h('th', { key: c.key }, c.label)))),
              h('tbody', null,
                runtime.length === 0
                  ? h('tr', null, h('td', { colSpan: cols.length, style: { textAlign: 'center', color: 'var(--text-low)', padding: 20 } }, texts.emptyAgent))
                  : runtime.map(st => h('tr', { key: st._file }, cols.map(c => renderStatusCell(c, st))))
              )
            )
          ),
          h('div', { className: 'status-panel-footer' },
            h('button', { className: 'btn', style: { padding: '4px 10px', fontSize: 12 }, onClick: loadStatus, disabled: loadingStatus },
              loadingStatus ? `⏳ ${texts.loadingRefresh}` : '🔄 刷新')
          )
        )
      )
    )
  );
}