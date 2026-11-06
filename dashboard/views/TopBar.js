import { createApp, computed, ref, onMounted, onUnmounted } from 'vue';
import { store } from '../js/store.js';
import { formatAction, loadAssets } from '../js/utils.js';
import { ACTION_CATEGORIES } from '../js/data/actions.js';
import { api } from '../js/api.js';

export async function mountTopBar() {
  const template = await loadAssets('TopBar');

  createApp({
    template,
    setup() {
      const actionDropdownOpen = ref(false);
      const loading = ref(false);

      // ---- 运行状态相关 ----
      const runtimeStatus = ref([]);
      const showStatusPopover = ref(false);
      const loadingStatus = ref(false);
      let statusTimer = null;

      const loadStatus = async () => {
        loadingStatus.value = true;
        try {
          runtimeStatus.value = await api.getRuntimeStatus();
        } catch (e) {
          console.error('获取运行状态失败:', e);
          runtimeStatus.value = [];
        } finally {
          loadingStatus.value = false;
        }
      };

      const hasDepsError = (st) => {
        if (!st.deps) return false;
        return Object.values(st.deps).some(v => v === false);
      };

      const isAllHealthy = computed(() => {
        if (!runtimeStatus.value || runtimeStatus.value.length === 0) return true;
        return runtimeStatus.value.every(st => !hasDepsError(st));
      });

      const toggleStatusPopover = () => {
        showStatusPopover.value = !showStatusPopover.value;
        if (showStatusPopover.value) loadStatus();
      };

      // ---- 时间范围初始化 ----
      const initTimeRange = () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
        const fmt = (d) => {
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        store.queryStart = fmt(oneHourAgo);
        store.queryEnd = fmt(now);
      };
      initTimeRange();

      const doQuery = () => {
        loading.value = true;
        window.dispatchEvent(new CustomEvent('do-query', { detail: { start: store.queryStart, end: store.queryEnd } }));
        setTimeout(() => { loading.value = false; }, 500);
      };

      const clearLogs = () => {
        window.dispatchEvent(new CustomEvent('clear-logs'));
      };

      // ---- 动作分组逻辑 ----
      const actionGroups = computed(() => {
        const groups = [{
          label: '消息方向 (Flow)',
          options: [
            { label: '📤 发送 (Send)', value: '__flow_0__' },
            { label: '📥 接收 (Receive)', value: '__flow_1__' }
          ]
        }];

        const apiOpts = store.actions.filter(a => ACTION_CATEGORIES.api.includes(a)).map(a => ({ label: formatAction(a), value: 'action:' + a }));
        if (apiOpts.length) groups.push({ label: '模型与 API 交互', options: apiOpts });

        const toolOpts = store.actions.filter(a => a.startsWith('tool_') || a.startsWith('transform_tool:')).map(a => ({ label: formatAction(a), value: 'action:' + a }));
        if (toolOpts.length) {
          groups.push({ label: '工具调用 (动态)', options: toolOpts });
        } else {
          groups.push({ label: '工具调用 (动态)', options: [{ label: '（暂无数据）', value: '__placeholder_tool__', disabled: true }] });
        }

        const lifecycleOpts = store.actions.filter(a => ACTION_CATEGORIES.lifecycle.includes(a)).map(a => ({ label: formatAction(a), value: 'action:' + a }));
        if (lifecycleOpts.length) groups.push({ label: '生命周期与上下文', options: lifecycleOpts });

        const subagentOpts = store.actions.filter(a => ACTION_CATEGORIES.subagent.includes(a)).map(a => ({ label: formatAction(a), value: 'action:' + a }));
        if (subagentOpts.length) groups.push({ label: '子代理与审批', options: subagentOpts });

        return groups;
      });

      const allOptionValues = computed(() => actionGroups.value.flatMap(g => g.options.map(o => o.value)).filter(v => v !== '__placeholder_tool__'));

      const actionTriggerText = computed(() => {
        if (store.filterAction.mode === 'none') return '暂无';
        const total = allOptionValues.value.length;
        if (total === 0) return '全部';
        const checked = store.filterAction.checked;
        if (checked === null) return `全部 (${total})`;
        if (checked.length === 0) return `已选 0/${total}`;
        if (checked.length >= total) return `全部 (${total})`;
        return `已选 ${checked.length}/${total}`;
      });

      const toggleActionDropdown = () => { actionDropdownOpen.value = !actionDropdownOpen.value; };

      const closeDropdowns = () => {
        actionDropdownOpen.value = false;
        showStatusPopover.value = false;
      };

      const isActionChecked = (value) => {
        if (store.filterAction.mode === 'none') return false;
        if (value === '__placeholder_tool__') return false;
        const checked = store.filterAction.checked;
        if (checked === null) return true;
        return checked.includes(value);
      };

      const toggleAction = (value) => {
        if (value === '__placeholder_tool__') return;
        store.filterAction.mode = 'all';
        const allValues = allOptionValues.value;
        if (store.filterAction.checked === null) {
          const next = allValues.filter(v => v !== value);
          store.filterAction.checked = next.length === allValues.length ? null : next;
        } else {
          const checked = [...store.filterAction.checked];
          const idx = checked.indexOf(value);
          if (idx >= 0) checked.splice(idx, 1);
          else checked.push(value);
          store.filterAction.checked = checked.length >= allValues.length ? null : checked;
        }
      };

      const selectNone = () => { store.filterAction.mode = 'none'; store.filterAction.checked = null; };
      const selectAll = () => { store.filterAction.mode = 'all'; store.filterAction.checked = null; };

      onMounted(() => {
        document.addEventListener('click', closeDropdowns);
        loadStatus();
        statusTimer = setInterval(loadStatus, 10000);
      });

      onUnmounted(() => {
        document.removeEventListener('click', closeDropdowns);
        if (statusTimer) clearInterval(statusTimer);
      });

      return {
        store, actionGroups, actionTriggerText, actionDropdownOpen, loading,
        toggleActionDropdown, isActionChecked, toggleAction,
        selectNone, selectAll, doQuery, clearLogs,
        // 状态
        runtimeStatus, isAllHealthy, hasDepsError, showStatusPopover, toggleStatusPopover, loadStatus, loadingStatus
      };
    }
  }).mount('#area-topbar');
}