import { React, useState, useEffect, useMemo, useRef } from '../lib/sdk';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { formatAction, getLevelColor } from '../lib/format';
import { parseConnToHtml } from '../lib/parsers';

const h = React.createElement;

export default function LogsView() {
  const s = useStore();
  const { constants, uiConfig } = s;
  const texts = uiConfig.texts;
  const ev = constants.eventNames;
  const histLimit = constants.defaults.historyLimit;

  const [logs, setLogs]       = useState([]);
  const [queried, setQueried] = useState(false);
  const logEl = useRef(null);

  const filterUserRef = useRef(s.filterUser);
  useEffect(() => { filterUserRef.current = s.filterUser; }, [s.filterUser]);

  useEffect(() => {
    const onQuery = async (e) => {
      const { start, end } = e.detail || {};
      setQueried(true);
      setLogs([]);
      try {
        const startTs = start ? Math.floor(new Date(start).getTime() / 1000) : null;
        const endTs   = end   ? Math.floor(new Date(end).getTime()   / 1000) : null;

        const data = await api.getHistoryFiltered({
          user: filterUserRef.current,
          start: (startTs && !isNaN(startTs)) ? startTs : null,
          end:   (endTs   && !isNaN(endTs))   ? endTs   : null,
          limit: histLimit,
        });

        data.reverse();
        setLogs(data.map(item => ({
          ...item,
          _html: parseConnToHtml(item.conn || item.conn_text),
        })));
        s.setConnected(true);
      } catch (err) {
        s.setConnected(false);
        console.error('查询失败:', err);
      }
    };

    const onClear = () => {
      setLogs([]);
      setQueried(false);
    };

    window.addEventListener(ev.doQuery, onQuery);
    window.addEventListener(ev.clearLogs, onClear);
    return () => {
      window.removeEventListener(ev.doQuery, onQuery);
      window.removeEventListener(ev.clearLogs, onClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.doQuery, ev.clearLogs, histLimit, s.setConnected]);

  const displayLogs = useMemo(() => logs.filter(l => {
    const fa = s.filterAction;
    if (fa.mode === 'none')       return false;
    if (fa.checked === null)      return true;
    if (fa.checked.length === 0)  return false;

    const actionMatch = fa.checked.includes('action:' + String(l.action));
    const flowMatch =
      (l.flow === 0 && fa.checked.includes('__flow_0__')) ||
      (l.flow === 1 && fa.checked.includes('__flow_1__'));
    return actionMatch || flowMatch;
  }), [logs, s.filterAction]);

  useEffect(() => {
    if (!logs.length) return;
    if (logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight;
  }, [logs]);

  const colors = s.cfg?.booth?.colors || {};
  const levelColor = (lv, flow) => getLevelColor(lv, flow, colors);

  return h('div', { className: 'log-container', ref: logEl },
    displayLogs.map((l, i) => h('div', { className: 'log-card', key: i },
      h('div', { className: 'log-header' },
        h('span', { className: 'meta-time' }, l.time),
        h('span', { className: 'tag tag-ip' }, l.ip || '127.0.0.1'),
        h('span', { className: 'tag tag-user' }, l.user),
        l.action && h('span', { className: 'tag tag-action' }, formatAction(l.action)),
        h('span', {
          className: 'tag tag-flow',
          style: { color: l.flow === 0 ? colors.flow_send : colors.flow_recv },
        }, l.flow === 0 ? '发送' : '接收')
      ),
      h('div', {
        className: 'log-content',
        style: { borderLeftColor: levelColor(l.level, l.flow) },
      },
        h('span', { dangerouslySetInnerHTML: { __html: l._html } })
      )
    )),

    !queried && h('div', { className: 'empty-state' },
      h('div', { className: 'empty-icon' }, '🔍'),
      texts.emptyQuery
    ),
    queried && displayLogs.length === 0 && h('div', { className: 'empty-state' },
      h('div', { className: 'empty-icon' }, '📭'),
      logs.length === 0 ? texts.emptyLogs : texts.emptyFiltered
    )
  );
}