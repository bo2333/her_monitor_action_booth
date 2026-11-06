import { ACTION_MAP } from './data/actions.js';
import { COLOR_LABELS } from './data/colors.js';

export const formatAction = (act) => {
  if (!act) return '';
  if (act.startsWith('tool_call:')) return `🛠️ 调用工具: ${act.substring(10)} (Tool Call)`;
  if (act.startsWith('tool_result:')) return `✅ 工具返回: ${act.substring(12)} (Tool Result)`;
  if (act.startsWith('transform_tool:')) return `🔄 工具结果转换: ${act.substring(15)} (Transform Tool)`;
  return ACTION_MAP[act] || act;
};

export const getLevelColor = (lv, flow, colors) => {
  const bg = colors?.level_bg;
  if (!bg || !bg[lv]) return flow === 0 ? colors.flow_send : colors.flow_recv;
  const { color, alpha } = bg[lv];
  let h = color.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha / 100})`;
};

export const getColorLabel = (k) => COLOR_LABELS[k] || k;

const PLUGIN_VIEWS_BASE = '/dashboard-plugins/monitor_action_booth/views';

export async function loadAssets(name) {
  const htmlUrl = `${PLUGIN_VIEWS_BASE}/${name}.html`;
  const cssUrl = `${PLUGIN_VIEWS_BASE}/${name}.css`;
  const [html, css] = await Promise.all([
    fetch(htmlUrl).then(r => r.ok ? r.text() : ''),
    fetch(cssUrl).then(r => r.ok ? r.text() : '').catch(() => '')
  ]);
  if (css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  return html;
}