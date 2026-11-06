import { createApp, ref, computed, nextTick } from 'vue';
import { store } from '../js/store.js';
import { api } from '../js/api.js';
import { formatAction, getLevelColor, loadAssets } from '../js/utils.js';
import { parseConnToHtml } from '../js/parsers.js';

export async function mountLogsView() {
  const template = await loadAssets('LogsView');

  createApp({
    template,
    setup() {
      const logs = ref([]);
      const logEl = ref(null);
      const queried = ref(false);

      const displayLogs = computed(() => logs.value.filter(l => {
        const fa = store.filterAction;
        if (fa.mode === 'none') return false;
        if (fa.checked === null) return true;
        if (fa.checked.length === 0) return false;

        // ★ 修复
        const actionMatch = fa.checked.includes('action:' + String(l.action));
        const flowMatch =
          (l.flow === 0 && fa.checked.includes('__flow_0__')) ||
          (l.flow === 1 && fa.checked.includes('__flow_1__'));
        return actionMatch || flowMatch;
      }));

      const levelColor = (lv, flow) => getLevelColor(lv, flow, store.cfg.booth.colors);

      const scrollToBottom = async () => {
        await nextTick();
        if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
      };

      const doQuery = async (startStr, endStr) => {
        queried.value = true;
        logs.value = [];
        try {
          const startTs = startStr ? Math.floor(new Date(startStr).getTime() / 1000) : null;
          const endTs = endStr ? Math.floor(new Date(endStr).getTime() / 1000) : null;

          const data = await api.getHistoryFiltered({
            user: store.filterUser,
            start: (startTs && !isNaN(startTs)) ? startTs : null,
            end: (endTs && !isNaN(endTs)) ? endTs : null,
            limit: 2000
          });

          data.reverse();
          logs.value = data.map(item => ({
            ...item,
            _html: parseConnToHtml(item.conn || item.conn_text)
          }));
          scrollToBottom();
          store.connected = true;
        } catch (e) {
          store.connected = false;
          console.error('查询失败:', e);
        }
      };

      window.addEventListener('do-query', (e) => {
        const { start, end } = e.detail || {};
        doQuery(start, end);
      });

      window.addEventListener('clear-logs', () => {
        logs.value = [];
        queried.value = false;
      });

      return { store, logEl, queried, logs, displayLogs, formatAction, levelColor };
    }
  }).mount('#area-logs');
}