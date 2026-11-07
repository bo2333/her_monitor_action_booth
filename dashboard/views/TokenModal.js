import { createApp, ref, onMounted } from 'vue';
import { store } from '../js/store.js';
import { api } from '../js/api.js';
import { formatAction, loadAssets } from '../js/utils.js';

export async function mountTokenModal() {
  const template = await loadAssets('TokenModal');

  createApp({
    template,
    setup() {
      const tokenTab = ref('summary');
      const trendPeriod = ref('total');
      const tokenSummary = ref([]);
      const tokenDetails = ref([]);

      // 详细记录筛选
      const tokenUser = ref('');
      const tokenLimit = ref(0); // ★ 默认 0 = 全部
      const detailStart = ref('');
      const detailEnd = ref('');

      // 自定义汇总范围
      const isCustomRange = ref(false);
      const customStart = ref('');
      const customEnd = ref('');

      const loadTrends = async () => {
        tokenSummary.value = await api.getTrends({ period: trendPeriod.value });
      };

      const doCustomRange = async () => {
        if (!customStart.value || !customEnd.value) {
          alert('请选择完整的开始和结束时间');
          return;
        }
        isCustomRange.value = true;
        const startTs = Math.floor(new Date(customStart.value).getTime() / 1000);
        const endTs = Math.floor(new Date(customEnd.value).getTime() / 1000);
        if (startTs > endTs) { alert('开始时间不能晚于结束时间'); return; }
        tokenSummary.value = await api.getTrends({ start: startTs, end: endTs });
      };

      // 获取详细记录
      const fetchTokenDetails = async () => {
        const startTs = detailStart.value ? Math.floor(new Date(detailStart.value).getTime() / 1000) : null;
        const endTs = detailEnd.value ? Math.floor(new Date(detailEnd.value).getTime() / 1000) : null;
        tokenDetails.value = await api.getTokenDetails(tokenUser.value, tokenLimit.value, startTs, endTs);
      };

      // 生成汇总导出 URL
      const getExportTrendsUrl = () => {
        if (isCustomRange.value && customStart.value && customEnd.value) {
          const startTs = Math.floor(new Date(customStart.value).getTime() / 1000);
          const endTs = Math.floor(new Date(customEnd.value).getTime() / 1000);
          return api.getExportTrendsUrl(null, startTs, endTs);
        }
        return api.getExportTrendsUrl(trendPeriod.value, null, null);
      };

      // 生成详细记录导出 URL
      const getExportDetailsUrl = () => {
        const p = new URLSearchParams();
        if (tokenUser.value) p.append('user', tokenUser.value);
        p.append('limit', String(tokenLimit.value));
        if (detailStart.value) p.append('start', String(Math.floor(new Date(detailStart.value).getTime() / 1000)));
        if (detailEnd.value) p.append('end', String(Math.floor(new Date(detailEnd.value).getTime() / 1000)));
        return `/api/plugins/her_monitor_action_booth/export/tokens?${p.toString()}`;
      };

      onMounted(() => { loadTrends(); });

      return {
        store, tokenTab, trendPeriod, tokenSummary, tokenDetails,
        tokenUser, tokenLimit, detailStart, detailEnd,
        loadTrends, fetchTokenDetails, formatAction,
        isCustomRange, customStart, customEnd, doCustomRange,
        getExportTrendsUrl, getExportDetailsUrl
      };
    }
  }).mount('#area-token-modal');
}