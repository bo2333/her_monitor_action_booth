import { React, useState, useEffect, useRef, useCallback } from '../lib/sdk';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { getColorLabel } from '../lib/format';

const h = React.createElement;

export default function SettingsModal() {
  const s = useStore();
  const { constants, uiConfig } = s;
  const tabs = uiConfig.settings.tabs;

  const [tab, setTab]         = useState('booth');
  const [dbStatus, setDbStatus]     = useState(null);
  const [dbChecking, setDbChecking] = useState(false);
  const [fixing, setFixing]         = useState(false);
  const [creating, setCreating]     = useState(false);
  const [installing, setInstalling] = useState(false);

  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateBoothRunning, setUboothRun]   = useState(false);
  const [updateMasterRunning, setUmasterRun] = useState(false);
  const [updateLog, setUpdateLog] = useState([]);
  const updateLogBox = useRef(null);

  const cfgRef = useRef(s.cfg);
  useEffect(() => { cfgRef.current = s.cfg; }, [s.cfg]);

  const cfg = s.cfg;

  const loadUpdateStatus = useCallback(async () => {
    try { setUpdateStatus(await api.getUpdateStatus()); }
    catch (e) { console.error('加载更新状态失败:', e); }
  }, []);

  const checkDbRoot = useCallback(async () => {
    const path = (cfgRef.current.master && cfgRef.current.master.db_root) || '';
    if (!path.trim()) {
      setDbStatus({ exists: false, ok: false, message: '未配置', path: '' });
      return;
    }
    setDbChecking(true);
    try { setDbStatus(await api.getDbRootStatus(path)); }
    catch (e) { setDbStatus({ exists: false, ok: false, message: '检测失败', path: '' }); }
    finally { setDbChecking(false); }
  }, []);

  useEffect(() => {
    if (!s.showSettings) return;
    if (s.cfg.db_root_status) setDbStatus(s.cfg.db_root_status);
    checkDbRoot();
    loadUpdateStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.showSettings]);

  useEffect(() => {
    if (updateLogBox.current) updateLogBox.current.scrollTop = updateLogBox.current.scrollHeight;
  }, [updateLog]);

  const appendLog = (line) => setUpdateLog(prev => [...prev, line]);

  const runUpdate = async (which) => {
    if (which === 'booth' ? updateBoothRunning : updateMasterRunning) return;
    const setRun = which === 'booth' ? setUboothRun : setUmasterRun;
    setUpdateLog([]);
    setRun(true);
    appendLog(`==== 开始更新 ${which} ====`);
    try {
      const fn = which === 'booth' ? api.streamUpdateBooth : api.streamUpdateMaster;
      await fn(appendLog);
      appendLog('==== 更新结束 ====');
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
      setRun(false);
    }
  };

  const installMaster = async () => {
    if (!confirm('确定要为默认 Agent 安装 her_monitor_action_master 吗？')) return;
    setInstalling(true);
    try {
      const res = await api.installDefaultMaster();
      alert(res.message || '安装成功');
      window.location.reload();
    } catch (e) {
      alert('安装失败: ' + (e.message || e));
    } finally {
      setInstalling(false);
    }
  };

  const fixPerm = async () => {
    const path = (cfgRef.current.master && cfgRef.current.master.db_root) || '';
    if (!path.trim()) return;
    setFixing(true);
    try {
      const st = await api.fixDbRootPermission(path);
      setDbStatus(st);
      if (st && !st.ok && st.message) alert('权限已尝试修改，但当前仍为：' + st.message);
    } catch (e) { alert('设置权限失败: ' + (e.message || e)); }
    finally { setFixing(false); }
  };

  const createDbRoot = async () => {
    const path = (cfgRef.current.master && cfgRef.current.master.db_root) || '';
    if (!path.trim()) return;
    setCreating(true);
    try {
      const st = await api.ensureDbRoot(path);
      setDbStatus(st);
      if (st && !st.exists) alert('创建失败: ' + (st.message || '未知原因'));
      else if (st && st.exists && !st.ok) alert('目录已创建，但权限异常：' + st.message);
    } catch (e) { alert('创建目录失败: ' + (e.message || e)); }
    finally { setCreating(false); }
  };

  const saveConfig = async () => {
    try {
      await api.saveConfig({
        booth: cfgRef.current.booth,
        master: cfgRef.current.master_exists ? cfgRef.current.master : null,
      });
    } catch (e) {
      alert('保存失败: ' + (e.message || e));
      return;
    }
    s.setShowSettings(false);
  };

  const openInstall = () => {
    s.setShowSettings(false);
    s.setShowInstall(true);
    window.dispatchEvent(new CustomEvent(constants.eventNames.openInstall));
  };

  const tabOpenMap = { loadUpdateStatus };
  const handleTabClick = (t) => {
    setTab(t.key);
    if (t.onOpen && tabOpenMap[t.onOpen]) tabOpenMap[t.onOpen]();
  };

  const dbStatusText = () => {
    const st = dbStatus;
    if (!st) return '';
    if (!st.exists) return st.message || '不存在';
    if (st.ok) return '正常';
    return st.message || '异常';
  };
  const dbStatusClass = () =>
    !dbStatus ? 'db-badge db-badge-unknown' : (dbStatus.ok ? 'db-badge db-badge-ok' : 'db-badge db-badge-bad');

  const setCfgPath = (path, v) => {
    s.mutateCfg(c => {
      let obj = c;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (obj[k] == null || typeof obj[k] !== 'object') obj[k] = {};
        obj = obj[k];
      }
      obj[path[path.length - 1]] = v;
    });
  };
  const getCfgPath = (path) => path.reduce((o, k) => (o == null ? o : o[k]), cfg);

  const bindCfg = (path, opts = {}) => ({
    value: getCfgPath(path) ?? (opts.fallback ?? ''),
    onChange: (e) => setCfgPath(path, opts.number ? +e.target.value : e.target.value),
  });
  const bindCfgCheck = (path) => ({
    checked: !!getCfgPath(path),
    onChange: (e) => setCfgPath(path, e.target.checked),
  });

  return h('div', { className: 'modal-mask', onClick: e => { if (e.target === e.currentTarget) s.setShowSettings(false); } },
    h('div', { className: 'modal', style: { maxWidth: 800, height: '75vh' } },
      h('div', { className: 'modal-header' },
        h('span', null, '⚙ 监控大厅设置'),
        h('button', { className: 'close-btn', onClick: () => s.setShowSettings(false) }, '✕')
      ),

      h('div', { className: 'tabs' },
        tabs.map(t => h('div', {
          key: t.key, className: 'tab ' + (tab === t.key ? 'active' : ''),
          onClick: () => handleTabClick(t),
        }, t.label))
      ),

      h('div', { className: 'modal-body' },

        tab === 'booth' && h('div', { style: { paddingTop: 10 } },
          h('div', { className: 'setting-grid' },
            h('div', { className: 'setting-card' },
              h('label', null, '屏幕最大展示条数'),
              h('input', { type: 'number', ...bindCfg(['booth', 'max_screen_entries'], { number: true }) })
            )
          )
        ),

        tab === 'master' && h('div', { style: { paddingTop: 10 } },
          h('h3', { style: { fontSize: 13, margin: '0 0 16px', color: 'var(--text-high)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 } }, '安装插件'),
          h('div', { className: 'setting-grid', style: { marginBottom: 28 } },
            h('div', { className: 'setting-card', style: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 12 } },
              h('label', null, '安装监察大师插件'),
              cfg.master_exists
                ? h('div', { style: { color: 'var(--success)', fontWeight: 600, fontSize: 14, padding: '8px 0' } }, '✅ 已安装')
                : h('div', { style: { width: '100%' } },
                    h('div', { style: { background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', padding: 10, borderRadius: 6, color: 'var(--danger)', fontSize: 12, lineHeight: 1.6, marginBottom: 12 } },
                      '⚠️ 未检测到监察大师插件。', h('br'), '请点击下方按钮安装。'),
                    h('button', {
                      className: 'btn', disabled: installing,
                      style: { background: 'rgba(88,166,255,0.1)', color: 'var(--primary)', borderColor: 'rgba(88,166,255,0.3)', width: '100%', justifyContent: 'center' },
                      onClick: installMaster,
                    }, installing ? '⏳ 安装中...' : '📦 安装 Master')
                  )
            ),
            h('div', { className: 'setting-card', style: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 12 } },
              h('label', null, '集群维护'),
              h('div', { style: { width: '100%' } },
                h('div', { style: { color: 'var(--text-low)', fontSize: 12, marginBottom: 12, lineHeight: 1.6 } }, '自动为 profiles 目录下未链接/链接错误的 Agent 创建软链接。'),
                h('button', {
                  className: 'btn',
                  style: { background: 'rgba(88,166,255,0.1)', color: 'var(--primary)', borderColor: 'rgba(88,166,255,0.3)', width: '100%', justifyContent: 'center' },
                  onClick: openInstall,
                }, '📦 部署到各 Agent')
              )
            )
          ),

          h('h3', { style: { fontSize: 13, margin: '0 0 16px', color: 'var(--text-high)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 } }, '目录相关'),
          h('div', { className: 'setting-grid', style: { marginBottom: 28 } },
            h('div', { className: 'setting-card', style: { gridColumn: '1 / -1' } },
              h('label', null, '配置目录'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' } },
                h('code', { className: 'path-code', title: cfg.master_config_path }, cfg.master_config_path || '-')
              )
            ),
            h('div', { className: 'setting-card', style: { gridColumn: '1 / -1', alignItems: 'center' } },
              h('label', null, '数据库根目录'),
              h('div', { className: 'db-root-row' },
                h('input', {
                  type: 'text',
                  ...bindCfg(['master', 'db_root']),
                  placeholder: '留空使用默认：her_monitor_action_master/data',
                  onBlur: checkDbRoot,
                  style: { width: 320, background: 'var(--bg-base)', border: '1px solid var(--border-strong)', color: 'var(--text-high)', padding: 6, borderRadius: 4 },
                }),
                h('span', { className: dbStatusClass(), title: dbStatus && dbStatus.path ? dbStatus.path : '' }, dbStatusText()),
                (dbStatus && !dbStatus.exists && dbStatus.message === '目录不存在') &&
                  h('button', {
                    className: 'btn',
                    style: { background: 'rgba(88,166,255,0.1)', color: 'var(--primary)', borderColor: 'rgba(88,166,255,0.3)' },
                    disabled: creating, onClick: createDbRoot,
                  }, creating ? '⏳ 创建中...' : '创建目录'),
                (dbStatus && dbStatus.exists && !dbStatus.ok) &&
                  h('button', {
                    className: 'btn',
                    style: { background: 'rgba(248,81,73,0.1)', color: 'var(--danger)', borderColor: 'rgba(248,81,73,0.3)' },
                    disabled: fixing, onClick: fixPerm,
                  }, fixing ? '⏳ 设置中...' : '设置权限'),
                h('button', { className: 'btn', disabled: dbChecking, onClick: checkDbRoot, title: '重新检测目录状态' }, '🔄')
              )
            )
          ),

          h('h3', { style: { fontSize: 13, margin: '0 0 16px', color: 'var(--text-high)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 } }, '日志开关'),
          h('div', { className: 'setting-grid', style: { marginBottom: 28 } },
            h('div', { className: 'setting-card' },
              h('label', null, '启用事件写入'),
              h('input', { type: 'checkbox', ...bindCfgCheck(['master', 'enabled']), style: { width: 20, height: 20 } })
            ),
            h('div', { className: 'setting-card' },
              h('label', null, '输出运行日志'),
              h('input', { type: 'checkbox', ...bindCfgCheck(['master', 'logging']), style: { width: 20, height: 20 } })
            )
          ),

          h('h3', { style: { fontSize: 13, margin: '0 0 16px', color: 'var(--text-high)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 } }, 'TCP 远程推送 （配套windows软件：monitor-server-tcp）'),
          h('div', { style: { display: 'flex', gap: 20, alignItems: 'stretch' } },
            h('div', { className: 'setting-card', style: { flex: 1, justifyContent: 'flex-start', gap: 32 } },
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' } },
                h('input', { type: 'checkbox', ...bindCfgCheck(['master', 'remote', 'enabled']), style: { width: 20, height: 20, margin: 0 } }),
                '启用推送'
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' } },
                h('label', { style: { margin: 0 } }, '地址'),
                h('input', { type: 'text', ...bindCfg(['master', 'remote', 'host']),
                  style: { width: 160, background: 'var(--bg-base)', border: '1px solid var(--border-strong)', color: 'var(--text-high)', padding: 6, borderRadius: 4 } }),
                h('span', { style: { color: 'var(--text-low)', fontWeight: 'bold' } }, ':'),
                h('input', { type: 'number', ...bindCfg(['master', 'remote', 'port'], { number: true }),
                  style: { width: 90, background: 'var(--bg-base)', border: '1px solid var(--border-strong)', color: 'var(--text-high)', padding: 6, borderRadius: 4 } })
              )
            ),
            h('div', { className: 'setting-card', style: { width: 240 } },
              h('label', null, '心跳间隔 (秒)'),
              h('input', { type: 'number', ...bindCfg(['master', 'remote', 'check_interval'], { number: true }),
                style: { width: 80, background: 'var(--bg-base)', border: '1px solid var(--border-strong)', color: 'var(--text-high)', padding: 6, borderRadius: 4 } })
            )
          )
        ),

        tab === 'colors' && h('div', null,
          h('h3', { style: { fontSize: 13, marginBottom: 20, color: 'var(--text-high)', textTransform: 'uppercase' } }, '字段前景色'),
          h('div', { className: 'setting-grid' },
            Object.keys(cfg.booth?.colors || {}).filter(k => k !== 'level_bg').map(k =>
              h('div', { key: k, className: 'setting-card' },
                h('span', null, getColorLabel(k)),
                h('input', {
                  type: 'color', className: 'color-input',
                  value: cfg.booth.colors[k],
                  onChange: (e) => setCfgPath(['booth', 'colors', k], e.target.value),
                })
              )
            )
          ),
          h('h3', { style: { fontSize: 13, margin: '32px 0 20px', color: 'var(--text-high)', textTransform: 'uppercase' } }, 'Level 竖线色 (支持透明度)'),
          Object.keys(cfg.booth?.colors?.level_bg || {}).map(k =>
            h('div', { className: 'slider-row', key: k },
              h('span', { style: { width: 70, fontWeight: 'bold', color: 'var(--text-high)' } }, 'Level ' + k),
              h('input', {
                type: 'color', className: 'color-input',
                value: cfg.booth.colors.level_bg[k].color,
                onChange: (e) => setCfgPath(['booth', 'colors', 'level_bg', k, 'color'], e.target.value),
              }),
              h('span', { style: { fontSize: 12, color: 'var(--text-low)', marginLeft: 12 } }, '透明度'),
              h('input', {
                type: 'range', min: 0, max: 100,
                value: cfg.booth.colors.level_bg[k].alpha,
                onChange: (e) => setCfgPath(['booth', 'colors', 'level_bg', k, 'alpha'], +e.target.value),
              }),
              h('span', { style: { width: 50, textAlign: 'right', color: 'var(--primary)', fontWeight: 'bold' } }, cfg.booth.colors.level_bg[k].alpha + '%')
            )
          )
        ),

        tab === 'update' && h('div', { style: { paddingTop: 10 } },
          h('div', { className: 'setting-grid' },
            h('div', { className: 'setting-card', style: { gridColumn: '1 / -1' } },
              h('div', null,
                h('label', null, '监控大厅 (booth)'),
                h('div', { style: { color: 'var(--text-low)', fontSize: 12, marginTop: 4 } },
                  updateStatus && updateStatus.booth ? updateStatus.booth.path : '')
              ),
              h('button', { className: 'btn btn-primary', disabled: updateBoothRunning, onClick: () => runUpdate('booth') },
                updateBoothRunning ? '⏳ 更新中...' : '⬆️ 更新 Booth')
            ),
            (updateStatus && updateStatus.master && updateStatus.master.installed)
              ? h('div', { className: 'setting-card', style: { gridColumn: '1 / -1' } },
                  h('div', null,
                    h('label', null, '监察大师 (master)'),
                    h('div', { style: { color: 'var(--text-low)', fontSize: 12, marginTop: 4 } }, updateStatus.master.path)
                  ),
                  updateStatus.master.git
                    ? h('button', { className: 'btn btn-primary', disabled: updateMasterRunning, onClick: () => runUpdate('master') },
                        updateMasterRunning ? '⏳ 更新中...' : '⬆️ 更新 Master')
                    : h('span', { style: { color: 'var(--text-low)', fontSize: 13, fontWeight: 600 } }, '非 github 安装（无法通过此处更新）')
                )
              : h('div', { className: 'setting-card', style: { gridColumn: '1 / -1' } },
                  h('label', null, '监察大师 (master)'),
                  h('span', { style: { color: 'var(--text-low)', fontSize: 13 } }, '未安装')
                )
          ),
          h('div', {
            ref: updateLogBox, className: 'update-log-box',
            style: { display: (updateLog.length > 0 || updateBoothRunning || updateMasterRunning) ? 'block' : 'none' },
          },
            updateLog.map((l, i) => h('div', { key: i, className: 'update-log-line' }, l)),
            (updateBoothRunning || updateMasterRunning) && h('div', { className: 'update-log-line', style: { color: 'var(--primary)' } }, '执行中...')
          )
        )
      ),

      h('div', { style: { padding: '16px 24px', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-subtle)' } },
        h('button', { className: 'btn', onClick: () => s.setShowSettings(false) }, '取消'),
        h('button', { className: 'btn btn-primary', onClick: saveConfig }, '保存并应用')
      )
    )
  );
}