import { createApp, ref, computed, watch, nextTick } from 'vue';
import { store } from '../js/store.js';
import { api } from '../js/api.js';
import { getColorLabel, loadAssets } from '../js/utils.js';

export async function mountSettingsModal() {
  const template = await loadAssets('SettingsModal');

  createApp({
    template,
    setup() {
      const settingsTab = ref('booth');
      const dbStatus = ref(null);
      const dbChecking = ref(false);
      const fixing = ref(false);
      const creating = ref(false);
      const installingMaster = ref(false);

      // ---- 更新状态 ----
      const updateStatus = ref(null);
      const updateBoothRunning = ref(false);
      const updateMasterRunning = ref(false);
      const updateLog = ref([]);
      const updateLogBox = ref(null);

      // 已去掉 v-if="showUpdateTab"，此处保留变量以防你用其判断其他，但不再用于隐藏标签
      const showUpdateTab = computed(() =>
        !!(updateStatus.value && updateStatus.value.booth && updateStatus.value.booth.git)
      );

      const loadUpdateStatus = async () => {
        try {
          updateStatus.value = await api.getUpdateStatus();
        } catch (e) {
          console.error('加载更新状态失败:', e);
        }
      };

      const appendLog = (line) => {
        updateLog.value.push(line);
        nextTick(() => {
          if (updateLogBox.value) {
            updateLogBox.value.scrollTop = updateLogBox.value.scrollHeight;
          }
        });
      };

      const runUpdate = async (which) => {
        const runningRef = which === 'booth' ? updateBoothRunning : updateMasterRunning;
        if (runningRef.value) return;
        updateLog.value = [];
        runningRef.value = true;
        appendLog(`==== 开始更新 ${which} ====`);
        try {
          const streamFn = which === 'booth' ? api.streamUpdateBooth : api.streamUpdateMaster;
          await streamFn(appendLog);
          appendLog(`==== 更新结束 ====`);
          appendLog('');
          if (which === 'booth') {
            appendLog('提示：booth 已更新，请刷新页面加载新代码，并重启网关：');
            appendLog('  hermes gateway restart');
          } else {
            appendLog('提示：master 已更新，请重启网关使其生效：');
            appendLog('  hermes gateway restart');
          }
        } catch (e) {
          appendLog(`[错误] ${e.message || e}`);
        } finally {
          runningRef.value = false;
        }
      };

      const runUpdateBooth = () => runUpdate('booth');
      const runUpdateMaster = () => runUpdate('master');

      const installMaster = async () => {
        if (!confirm('确定要为默认 Agent 安装 monitor_action_master 吗？')) return;
        installingMaster.value = true;
        try {
          const res = await api.installDefaultMaster();
          alert(res.message || '安装成功');
          window.location.reload();
        } catch (e) {
          alert('安装失败: ' + (e.message || e));
        } finally {
          installingMaster.value = false;
        }
      };

      const checkDbRoot = async () => {
        const path = (store.cfg.master && store.cfg.master.db_root) || '';
        if (!path.trim()) {
          dbStatus.value = { exists: false, ok: false, message: '未配置', path: '' };
          return;
        }
        dbChecking.value = true;
        try {
          dbStatus.value = await api.getDbRootStatus(path);
        } catch (e) {
          dbStatus.value = { exists: false, ok: false, message: '检测失败', path: '' };
        } finally {
          dbChecking.value = false;
        }
      };

      const fixPerm = async () => {
        const path = (store.cfg.master && store.cfg.master.db_root) || '';
        if (!path.trim()) return;
        fixing.value = true;
        try {
          dbStatus.value = await api.fixDbRootPermission(path);
          if (dbStatus.value && !dbStatus.value.ok && dbStatus.value.message) {
            alert('权限已尝试修改，但当前仍为：' + dbStatus.value.message);
          }
        } catch (e) {
          alert('设置权限失败: ' + (e.message || e));
        } finally {
          fixing.value = false;
        }
      };

      const createDbRoot = async () => {
        const path = (store.cfg.master && store.cfg.master.db_root) || '';
        if (!path.trim()) return;
        creating.value = true;
        try {
          dbStatus.value = await api.ensureDbRoot(path);
          if (dbStatus.value && !dbStatus.value.exists) {
            alert('创建失败: ' + (dbStatus.value.message || '未知原因'));
          } else if (dbStatus.value && dbStatus.value.exists && !dbStatus.value.ok) {
            alert('目录已创建，但权限异常：' + dbStatus.value.message);
          }
        } catch (e) {
          alert('创建目录失败: ' + (e.message || e));
        } finally {
          creating.value = false;
        }
      };

      const saveConfig = async () => {
        try {
          const resp = await api.saveConfig({
            booth: store.cfg.booth,
            master: store.cfg.master_exists ? store.cfg.master : null
          });
          if (!resp || !resp.ok) throw new Error(`HTTP ${resp && resp.status}`);
        } catch (e) {
          alert('保存失败: ' + e);
          return;
        }
        store.showSettings = false;
      };

      const openInstall = () => {
        store.showSettings = false;
        store.showInstall = true;
        window.dispatchEvent(new CustomEvent('open-install'));
      };

      watch(() => store.showSettings, (v) => {
        if (!v) return;
        if (store.cfg.db_root_status) dbStatus.value = store.cfg.db_root_status;
        checkDbRoot();
        loadUpdateStatus();
      });

      const dbStatusText = () => {
        const s = dbStatus.value;
        if (!s) return '';
        if (!s.exists) return s.message || '不存在';
        if (s.ok) return '正常';
        return s.message || '异常';
      };

      const dbStatusClass = () => {
        const s = dbStatus.value;
        if (!s) return 'db-badge db-badge-unknown';
        return s.ok ? 'db-badge db-badge-ok' : 'db-badge db-badge-bad';
      };

      return {
        store, settingsTab, saveConfig, getColorLabel, openInstall,
        dbStatus, dbChecking, fixing, creating, installingMaster,
        checkDbRoot, fixPerm, createDbRoot, installMaster,
        dbStatusText, dbStatusClass,
        // 更新
        updateStatus, updateBoothRunning, updateMasterRunning,
        updateLog, updateLogBox, showUpdateTab,
        loadUpdateStatus, runUpdateBooth, runUpdateMaster,
      };
    }
  }).mount('#area-settings-modal');
}