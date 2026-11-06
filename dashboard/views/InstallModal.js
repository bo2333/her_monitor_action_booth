import { createApp, ref, onMounted } from 'vue';
import { store } from '../js/store.js';
import { api } from '../js/api.js';
import { loadAssets } from '../js/utils.js';

export async function mountInstallModal() {
  const template = await loadAssets('InstallModal');
  createApp({
    template,
    setup() {
      const result = ref({ master_exists: false, master_plugin_dir: '', profiles_dir: '', profiles: [], activation: [], reload: null });
      const loading = ref(false);
      const statusMessage = ref(null);

      const loadStatus = async () => {
        try { result.value = await api.getInstallStatus(); } catch (e) { console.error('加载安装状态失败:', e); }
      };

      const doInstall = async () => {
        loading.value = true; statusMessage.value = null;
        try {
          const data = await api.installMaster();
          result.value = data;
          if (data.reload && !data.reload.ok) statusMessage.value = { type: 'error', text: '链接与激活已处理，但重启网关失败: ' + data.reload.message };
          else {
            const realFailures = data.activation ? data.activation.filter(a => !a.ok && !a.skipped) : [];
            if (realFailures.length > 0) statusMessage.value = { type: 'error', text: `执行完成，但有 ${realFailures.length} 个 Agent 激活失败，请查看列表信息` };
            else statusMessage.value = { type: 'success', text: '所有有效 Agent 已成功链接并激活！' };
          }
        } catch (e) { statusMessage.value = { type: 'error', text: '执行异常: ' + e }; } finally { loading.value = false; }
      };

      const statusText = (s) => ({ linked: '✅ 已链接', linked_inactive: '⚠️ 未激活', skipped: '⚪ 残留目录', missing: '❌ 未链接', broken: '⚠️ 链接错误', conflict: '⚪ 独立安装', error: '❌ 错误', unknown: '?' }[s] || s);
      const countBy = (status) => result.value.profiles.filter(p => p.status === status).length;

      window.addEventListener('open-install', loadStatus);
      onMounted(() => { loadStatus(); });

      return { store, result, loading, statusMessage, loadStatus, doInstall, statusText, countBy };
    }
  }).mount('#area-install-modal');
}