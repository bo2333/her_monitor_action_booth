import { store } from './store.js';
import { api } from './api.js';
import { PRESET_ACTIONS } from './data/actions.js';
import { mountTopBar } from '../views/TopBar.js';
import { mountLogsView } from '../views/LogsView.js';
import { mountTokenModal } from '../views/TokenModal.js';
import { mountSettingsModal } from '../views/SettingsModal.js';
import { mountInstallModal } from '../views/InstallModal.js';

async function initApp() {
  try {
    store.cfg = await api.getConfig();
  } catch (e) {
    console.error("加载配置失败", e); return;
  }
  try {
    store.users = await api.getUsers();
    const dbActions = await api.getActions();
    store.actions = Array.from(new Set([...PRESET_ACTIONS, ...dbActions])).sort();
  } catch (e) {
    console.error("加载用户/动作失败", e);
  }
  await Promise.all([
    mountTopBar(), mountLogsView(), mountTokenModal(), mountSettingsModal(), mountInstallModal()
  ]);
}
initApp();