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
      const tokenLimit = ref(1000);
      const tokenUser = ref('');

      // ★ 自定义日期相关
      const isCustomRange = ref(false);
      const customStart = ref('');
      const customEnd = ref('');

      const loadTrends = async () => {
        tokenSummary.value = await api.getTrends({ period: trendPeriod.value });
      };

      const doCustomRange = async () => {
        if (!customStart.value || !customEnd.value) {
          alert('请选择完整的开始和结束日期');
          return;
        }
        isCustomRange.value = true;
        // 转换为秒级时间戳
        const startTs = Math.floor(new Date(customStart.value).getTime() / 1000);
        const endTs = Math.floor(new Date(customEnd.value).getTime() / 1000) + 86399; // 包含当天结束

        tokenSummary.value = await api.getTrends({ start: startTs, end: endTs });
      };

      const fetchTokenDetails = async () => { tokenDetails.value = await api.getTokenDetails(tokenUser.value, tokenLimit.value); };

      onMounted(() => { loadTrends(); });

      return {
        store, tokenTab, trendPeriod, tokenSummary, tokenDetails,
        tokenLimit, tokenUser, loadTrends, fetchTokenDetails, formatAction,
        // ★ 返回日期相关变量
        isCustomRange, customStart, customEnd, doCustomRange
      };
    }
  }).mount('#area-token-modal');
}