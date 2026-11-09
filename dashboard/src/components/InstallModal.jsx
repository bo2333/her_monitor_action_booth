import { React, useState, useEffect, useCallback } from '../lib/sdk';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

const h = React.createElement;

const INITIAL_RESULT = {
  master_exists: false, master_plugin_dir: '', profiles_dir: '',
  profiles: [], activation: [], reload: null,
};

export default function InstallModal() {
  const s = useStore();
  const { constants, uiConfig } = s;
  const statusLabels = uiConfig.install.statusLabels;
  const statCounts   = uiConfig.install.statCounts;

  const [result, setResult]   = useState(INITIAL_RESULT);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const loadStatus = useCallback(async () => {
    try { setResult(await api.getInstallStatus()); }
    catch (e) { console.error('加载安装状态失败:', e); }
  }, []);

  useEffect(() => {
    loadStatus();
    window.addEventListener(constants.eventNames.openInstall, loadStatus);
    return () => window.removeEventListener(constants.eventNames.openInstall, loadStatus);
  }, [constants.eventNames.openInstall, loadStatus]);

  const doInstall = async () => {
    setLoading(true); setMsg(null);
    try {
      const data = await api.installMaster();
      setResult(data);
      if (data.reload && !data.reload.ok) {
        setMsg({ type: 'error', text: '链接与激活已处理，但重启网关失败: ' + data.reload.message });
      } else {
        const fails = data.activation ? data.activation.filter(a => !a.ok && !a.skipped) : [];
        if (fails.length > 0) setMsg({ type: 'error', text: `执行完成，但有 ${fails.length} 个 Agent 激活失败，请查看列表信息` });
        else setMsg({ type: 'success', text: '所有有效 Agent 已成功链接并激活！' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: '执行异常: ' + e });
    } finally {
      setLoading(false);
    }
  };

  const countBy = (status) => result.profiles.filter(p => p.status === status).length;
  const failures = (result.activation || []).filter(a => !a.ok && !a.skipped);

  return h('div', { className: 'modal-mask', onClick: e => { if (e.target === e.currentTarget) s.setShowInstall(false); } },
    h('div', { className: 'modal', style: { maxWidth: 750, height: '72vh' } },
      h('div', { className: 'modal-header' },
        h('span', null, '📦 部署监察大师到各 Agent'),
        h('button', { className: 'close-btn', onClick: () => s.setShowInstall(false) }, '✕')
      ),
      h('div', { className: 'modal-body', style: { display: 'flex', flexDirection: 'column' } },

        msg && h('div', {
          style: {
            padding: '10px 16px', marginBottom: 16, borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: msg.type === 'success' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
            border: '1px solid ' + (msg.type === 'success' ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'),
            color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          },
        },
          h('span', null, msg.text),
          h('button', { style: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, opacity: 0.7 }, onClick: () => setMsg(null) }, '✕')
        ),

        !result.master_exists && h('div', { className: 'warn-box' },
          '⚠️ 未找到主插件目录：', h('br'),
          h('code', null, result.master_plugin_dir), h('br'),
          '请先将 ', h('code', null, 'her_monitor_action_master'), ' 安装到该目录，然后重新打开本弹窗。'
        ),

        result.master_exists && h(React.Fragment, null,
          h('div', { className: 'info-box' },
            '将遍历 ', h('code', null, result.profiles_dir), ' 下所有 Agent 的 ', h('code', null, 'plugins/her_monitor_action_master'), '，检查软链接状态。', h('br'),
            '缺失或错误会自动修复；已正确链接的节点点击修复也会重新激活。', h('br'),
            h('b', null, '注意：'), '激活前会先检查 Profile 是否真实存在，残留目录将被跳过。'
          ),

          h('div', { className: 'action-bar' },
            h('button', { className: 'btn btn-primary', disabled: loading, onClick: doInstall },
              loading ? '⏳ 处理中(执行激活和重启)...' : '🔧 自动安装 / 修复 / 激活'),
            h('button', { className: 'btn', disabled: loading, onClick: loadStatus }, '🔄 重新检查'),
            h('div', { className: 'spacer' }),
            h('span', { className: 'stat-text' },
              statCounts.map((c, i) => h(React.Fragment, { key: c.status },
                i > 0 && ' / ',
                `${c.label} `,
                h('b', { style: { color: c.color } }, countBy(c.status))
              ))
            )
          ),

          result.reload && h('div', {
            className: 'info-box',
            style: {
              marginTop: 0, marginBottom: 16,
              background: result.reload.ok ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)',
              borderColor: result.reload.ok ? 'rgba(63,185,80,0.25)' : 'rgba(248,81,73,0.3)',
            },
          },
            (result.reload.ok ? '✅ 重启网关成功' : '❌ 重启网关失败') + '：',
            h('code', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11 } }, result.reload.message || '无输出')
          ),

          failures.length > 0 && h('div', { className: 'warn-box', style: { marginTop: 0, marginBottom: 16 } },
            h('div', { style: { fontWeight: 'bold', marginBottom: 6 } }, '以下 Agent 激活失败：'),
            failures.map(a => h('div', { key: a.profile, style: { marginBottom: 4 } },
              h('b', null, a.profile), ': ',
              h('code', { style: { fontSize: 11 } }, a.message)
            ))
          ),

          h('div', { className: 'result-table' },
            h('table', null,
              h('thead', null, h('tr', null,
                h('th', { style: { width: 220 } }, 'Agent / Profile'),
                h('th', { style: { width: 120 } }, '状态'),
                h('th', null, '说明')
              )),
              h('tbody', null,
                result.profiles.map(p => h('tr', { key: p.name },
                  h('td', { style: { fontWeight: 600, color: 'var(--text-high)' } }, p.name),
                  h('td', null, h('span', { className: 'status-' + p.status }, statusLabels[p.status] || p.status)),
                  h('td', { style: { fontSize: 12, color: 'var(--text-low)', wordBreak: 'break-all' } },
                    p.message,
                    p.target && h('div', { style: { marginTop: 2, fontFamily: 'monospace', fontSize: 11 } }, '→ ' + p.target)
                  )
                )),
                result.profiles.length === 0 && h('tr', null,
                  h('td', { colSpan: 3, style: { textAlign: 'center', padding: 40, color: 'var(--text-low)' } }, '未发现任何 Agent Profile（profiles 目录下无子目录）')
                )
              )
            )
          )
        )
      ),
      h('div', { style: { padding: '16px 24px', background: 'var(--bg-elevated)', textAlign: 'right', borderTop: '1px solid var(--border-subtle)' } },
        h('button', { className: 'btn', onClick: () => s.setShowInstall(false) }, '关闭')
      )
    )
  );
}