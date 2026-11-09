import { ACTION_MAP } from './data/actions';
import { COLOR_LABELS } from './data/colors';

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
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha / 100})`;
};

export const getColorLabel = (k) => COLOR_LABELS[k] || k;