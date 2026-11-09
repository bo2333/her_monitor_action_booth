import { React, useState, useEffect, useCallback } from '../lib/sdk';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { formatAction } from '../lib/format';

const h = React.createElement;

export default function TokenModal() {
  const s = useStore();
  const { constants, uiConfig } = s;
  const texts = uiConfig.texts;
  const periodButtons = uiConfig.token.periodButtons;
  const summaryCols = uiConfig.token.summaryColumns;
  const detailCols = uiConfig.token.detailColumns;

  const [tab, setTab]               = useState('summary');
  const [period, setPeriod]         = useState('total');
  const [summary, setSummary]       = useState([]);
  const [details, setDetails]       = useState([]);

  const [tokenUser, setTokenUser]   = useState('');
  const [tokenLimit, setTokenLimit] = useState(constants.defaults.tokenDetailLimit);
  const [detailStart, setDetailStart] = useState('');
  const [detailEnd, setDetailEnd]     = useState('');

  const [isCustom, setIsCustom]       = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');

  const loadTrends = useCallback(async (p) => {
    try { setSummary(await api.getTrends({ period: p })); }
    catch (e) { console.error(e); setSummary([]); }
  }, []);

  useEffect(() => { loadTrends('total'); }, [loadTrends]);

  const pickPeriod = (p) => { setPeriod(p); setIsCustom(false); loadTrends(p); };

  const doCustomRange = async () => {
    if (!customStart || !customEnd) { alert('请选择完整的开始和结束时间'); return; }
    const startTs = Math.floor(new Date(customStart).getTime() / 1000);
    const endTs   = Math.floor(new Date(customEnd).getTime()   / 1000);
    if (startTs > endTs) { alert('开始时间不能晚于结束时间'); return; }
    setIsCustom(true);
    try { setSummary(await api.getTrends({ start: startTs, end: endTs })); }
    catch (e) { console.error(e); }
  };

  const fetchDetails = async () => {
    const startTs = detailStart ? Math.floor(new Date(detailStart).getTime() / 1000) : null;
    const endTs   = detailEnd   ? Math.floor(new Date(detailEnd).getTime()   / 1000) : null;
    try { setDetails(await api.getTokenDetails(tokenUser, tokenLimit, startTs, endTs)); }
    catch (e) { console.error(e); setDetails([]); }
  };

  const trendsUrl = () => {
    if (isCustom && customStart && customEnd) {
      const st = Math.floor(new Date(customStart).getTime() / 1000);
      const en = Math.floor(new Date(customEnd).getTime()   / 1000);
      return api.getExportTrendsUrl(null, st, en);
    }
    return api.getExportTrendsUrl(period, null, null);
  };
  const detailsUrl = () => {
    const p = new URLSearchParams();
    if (tokenUser) p.append('user', tokenUser);
    p.append('limit', String(tokenLimit));
    if (detailStart) p.append('start', String(Math.floor(new Date(detailStart).getTime() / 1000)));
    if (detailEnd)   p.append('end',   String(Math.floor(new Date(detailEnd).getTime()   / 1000)));
    return `${constants.apiPrefix}/export/tokens?${p}`;
  };

  const renderCell = (col, row, isSummary) => {
    const v = row[col.key];
    if (col.style === 'cost4') return h('td', { key: col.key, style: { color: 'var(--success)', fontWeight: 'bold' } }, `¥ ${(v || 0).toFixed(4)}`);
    if (col.style === 'cost6') return h('td', { key: col.key, style: { color: 'var(--success)', fontWeight: 'bold' } }, `¥ ${(v || 0).toFixed(6)}`);
    if (col.style === 'action') return h('td', { key: col.key }, formatAction(v));
    const style = {};
    if (col.style === 'user')  { style.color = '#7ee787'; if (isSummary) style.fontWeight = 600; }
    if (col.style === 'muted') { style.color = 'var(--text-low)'; }
    return h('td', { key: col.key, style }, v);
  };

  const totalIn  = summary.reduce((a, b) => a + b.in_tok, 0);
  const totalOut = summary.reduce((a, b) => a + b.out_tok, 0);
  const totalTok = summary.reduce((a, b) => a + b.tot_tok, 0);
  const totalCost= summary.reduce((a, b) => a + (b.total_cost || 0), 0);

  return h('div', { className: 'modal-mask', onClick: e => { if (e.target === e.currentTarget) s.setShowToken(false); } },
    h('div', { className: 'modal' },
      h('div', { className: 'modal-header' },
        h('span', null, '🪙 Token 消耗明细'),
        h('button', { className: 'close-btn', onClick: () => s.setShowToken(false) }, '✕')
      ),
      h('div', { className: 'tabs' },
        h('div', { className: 'tab ' + (tab === 'summary' ? 'active' : ''), onClick: () => { setTab('summary'); loadTrends(period); } }, '按 Agent 汇总'),
        h('div', { className: 'tab ' + (tab === 'detail'  ? 'active' : ''), onClick: () => setTab('detail') }, '详细记录')
      ),
      h('div', { className: 'modal-body' },

        tab === 'summary' && h('div', null,
          h('div', { className: 'controls', style: { marginBottom: 12, flexWrap: 'wrap' } },
            periodButtons.map(pb =>
              h('button', {
                key: pb.key, className: 'btn', onClick: () => pickPeriod(pb.key),
                style: (period === pb.key && !isCustom) ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : null,
              }, pb.label)
            ),
            h('div', { className: 'spacer' }),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('input', { type: 'datetime-local', step: '1', value: customStart, onChange: e => setCustomStart(e.target.value),
                style: { width: 185, background: 'var(--bg-base)', color: 'var(--text-high)', border: '1px solid var(--border-strong)', padding: '6px 10px', borderRadius: 4, outline: 'none' } }),
              h('span', { style: { color: 'var(--text-low)' } }, '-'),
              h('input', { type: 'datetime-local', step: '1', value: customEnd, onChange: e => setCustomEnd(e.target.value),
                style: { width: 185, background: 'var(--bg-base)', color: 'var(--text-high)', border: '1px solid var(--border-strong)', padding: '6px 10px', borderRadius: 4, outline: 'none' } }),
              h('button', { className: 'btn btn-primary', onClick: doCustomRange, style: isCustom ? { background: 'var(--primary)', color: '#fff' } : null }, '查询')
            ),
            h('a', { className: 'btn-download', style: { marginLeft: 12 }, href: trendsUrl(), download: true }, '📥 导出 CSV')
          ),
          h('table', null,
            h('thead', null, h('tr', null, summaryCols.map(c => h('th', { key: c.key }, c.label)))),
            h('tbody', null,
              summary.map(r => h('tr', { key: r.user }, summaryCols.map(c => renderCell(c, r, true)))),
              summary.length === 0
                ? h('tr', null, h('td', { colSpan: summaryCols.length, style: { textAlign: 'center', color: 'var(--text-low)', padding: 30 } }, texts.emptySummary))
                : h('tr', { style: { fontWeight: 'bold', background: 'var(--bg-elevated)' } },
                    summaryCols.map((c, i) => {
                      if (i === 0) return h('td', { key: c.key }, texts.globalTotal);
                      if (c.key === 'cnt' || c.key === 'out_tok') return h('td', { key: c.key });
                      if (c.key === 'in_tok')     return h('td', { key: c.key }, totalIn);
                      if (c.key === 'tot_tok')    return h('td', { key: c.key }, totalTok);
                      if (c.key === 'total_cost') return h('td', { key: c.key, style: { color: 'var(--success)' } }, `¥ ${totalCost.toFixed(4)}`);
                      return h('td', { key: c.key });
                    })
                  )
            )
          )
        ),

        tab === 'detail' && h('div', null,
          h('div', { className: 'controls' },
            h('label', null, '用户:'),
            h('select', { value: tokenUser, onChange: e => setTokenUser(e.target.value) },
              h('option', { value: '' }, '全部'),
              s.users.map(u => h('option', { key: u, value: u }, u))
            ),
            h('label', null, '时间段:'),
            h('input', { type: 'datetime-local', step: '1', value: detailStart, onChange: e => setDetailStart(e.target.value),
              style: { width: 185, background: 'var(--bg-base)', color: 'var(--text-high)', border: '1px solid var(--border-strong)', padding: '6px 10px', borderRadius: 4, outline: 'none' } }),
            h('span', { style: { color: 'var(--text-low)' } }, '-'),
            h('input', { type: 'datetime-local', step: '1', value: detailEnd, onChange: e => setDetailEnd(e.target.value),
              style: { width: 185, background: 'var(--bg-base)', color: 'var(--text-high)', border: '1px solid var(--border-strong)', padding: '6px 10px', borderRadius: 4, outline: 'none' } }),
            h('label', null, '条数 (0=全部):'),
            h('input', { type: 'number', value: tokenLimit, min: 0, style: { width: 100 }, onChange: e => setTokenLimit(+e.target.value) }),
            h('button', { className: 'btn btn-primary', onClick: fetchDetails }, '查询'),
            h('div', { className: 'spacer' }),
            h('a', { className: 'btn-download', href: detailsUrl(), download: true }, '📥 导出 CSV')
          ),
          details.length > 0
            ? h('table', null,
                h('thead', null, h('tr', null, detailCols.map(c => h('th', { key: c.key }, c.label)))),
                h('tbody', null,
                  details.map((r, i) => h('tr', { key: i }, detailCols.map(c => renderCell(c, r, false))))
                )
              )
            : h('div', { style: { textAlign: 'center', color: 'var(--text-low)', padding: 30 } }, texts.emptyDetailHint)
        )
      )
    )
  );
}