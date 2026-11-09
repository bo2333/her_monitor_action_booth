import { fetchJSON } from './sdk';

export const FALLBACK_CONSTANTS = {
  apiPrefix: '/api/plugins/her_monitor_action_booth',
  polling: { statusIntervalMs: 10000, queryLoadingMs: 500 },
  defaults: { queryRangeSeconds: 3600, historyLimit: 2000, tokenDetailLimit: 0 },
  eventNames: { doQuery: 'do-query', clearLogs: 'clear-logs', openInstall: 'open-install' },
};

export const FALLBACK_UI = {
  texts: {
    loading: '加载中…', emptyQuery: '设置好时间范围后点击上方"查询"按钮',
    emptyLogs: '未查询到任何记录', emptyFiltered: '没有匹配过滤条件的记录',
    emptyAgent: '暂无运行中的 Agent', emptySummary: '暂无数据',
    emptyDetailHint: '请选择条件后点击查询', globalTotal: '全局合计',
    notFoundPlaceholder: '（暂无数据）', allUsers: '全部用户',
    loadingQuery: '查询中...', loadingRefresh: '刷新中...',
    statusHealthy: '运行正常', statusUnhealthy: '运行异常',
  },
  topbar: {
    statusPanelColumns: [
      { key: 'agent', label: 'Agent', style: 'user' }, { key: 'role', label: '角色' },
      { key: 'pid', label: 'PID', style: 'muted' }, { key: 'status', label: '状态', style: 'status' },
    ],
    actionGroups: [
      { label: '消息方向 (Flow)', type: 'flow', options: [
        { label: '📤 发送 (Send)', value: '__flow_0__' }, { label: '📥 接收 (Receive)', value: '__flow_1__' },
      ]},
      { label: '模型与 API 交互', type: 'category', category: 'api' },
      { label: '工具调用 (动态)', type: 'dynamic', match: ['tool_', 'transform_tool:'] },
      { label: '生命周期与上下文', type: 'category', category: 'lifecycle' },
      { label: '子代理与审批', type: 'category', category: 'subagent' },
    ],
  },
  token: {
    periodButtons: [
      { key: 'total', label: '总计' }, { key: 'year', label: '今年' }, { key: 'month', label: '本月' },
      { key: 'week', label: '本周' }, { key: 'day', label: '今日' },
    ],
    summaryColumns: [
      { key: 'user', label: '用户 / Agent', style: 'user' }, { key: 'cnt', label: '请求次数' },
      { key: 'in_tok', label: '输入 Token' }, { key: 'out_tok', label: '输出 Token' },
      { key: 'tot_tok', label: '总计' }, { key: 'total_cost', label: '预估费用 (元)', style: 'cost4' },
    ],
    detailColumns: [
      { key: 'time', label: '时间', style: 'muted' }, { key: 'user', label: '用户', style: 'user' },
      { key: 'action', label: '类型', style: 'action' }, { key: 'model', label: '模型/任务' },
      { key: 'in', label: '输入' }, { key: 'out', label: '输出' }, { key: 'total', label: '总计' },
      { key: 'cost', label: '预估费用(元)', style: 'cost6' },
    ],
  },
  settings: {
    tabs: [
      { key: 'booth', label: '大厅配置' }, { key: 'master', label: '监察大师配置' },
      { key: 'colors', label: '颜色外观' }, { key: 'update', label: '更新', onOpen: 'loadUpdateStatus' },
    ],
  },
  install: {
    statusLabels: {
      linked: '✅ 已链接', linked_inactive: '⚠️ 未激活', skipped: '⚪ 残留目录',
      missing: '❌ 未链接', broken: '⚠️ 链接错误', conflict: '⚪ 独立安装',
      error: '❌ 错误', unknown: '?',
    },
    statCounts: [
      { status: 'linked', label: '已链接', color: 'var(--success)' },
      { status: 'linked_inactive', label: '未激活', color: '#d29922' },
      { status: 'skipped', label: '残留', color: 'var(--text-low)' },
      { status: 'broken', label: '错误', color: '#d29922' },
      { status: 'conflict', label: '独立', color: 'var(--text-low)' },
    ],
  },
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return patch ?? base;
  if (Array.isArray(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = (k in base && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]))
      ? deepMerge(base[k], v) : v;
  }
  return out;
}

export async function loadFrontendConfig() {
  const [constants, ui] = await Promise.all([
    fetchJSON('/api/plugins/her_monitor_action_booth/constants').catch(() => ({})),
    fetchJSON('/api/plugins/her_monitor_action_booth/ui-config').catch(() => ({})),
  ]);
  return { constants: deepMerge(FALLBACK_CONSTANTS, constants || {}), uiConfig: deepMerge(FALLBACK_UI, ui || {}) };
}