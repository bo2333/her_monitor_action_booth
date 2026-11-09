import { React, useState, useEffect, useCallback } from '../lib/sdk';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

const h = React.createElement;

export default function LogsModal() {
  const s = useStore();
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState('');
  const [totalLines, setTotalLines] = useState(0);
  const [returnedLines, setReturnedLines] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [logDir, setLogDir] = useState('');
  const [tail, setTail] = useState(500);

  const loadFiles = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.getMasterLogs();
      setFiles(data.files || []);
      setLogDir(data.log_dir || '');
    } catch (e) {
      console.error('[LogsModal] 加载日志列表失败:', e);
      setFiles([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadContent = useCallback(async (name, tailLines) => {
    if (!name) return;
    setLoadingContent(true);
    try {
      const data = await api.getMasterLogContent(name, tailLines);
      setContent(data.content || '');
      setTotalLines(data.total_lines || 0);
      setReturnedLines(data.returned_lines || 0);
    } catch (e) {
      setContent(`读取失败: ${e.message || e}`);
      setTotalLines(0);
      setReturnedLines(0);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => {
    if (selected) loadContent(selected, tail);
  }, [selected, tail, loadContent]);

  const fmtSize = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const fmtTime = (ts) => {
    const d = new Date(ts * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
           `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  return h('div', {
    className: 'modal-mask',
    onClick: e => { if (e.target === e.currentTarget) s.setShowLogs(false); },
  },
    h('div', { className: 'modal', style: { maxWidth: 1200, height: '85vh' } },
      h('div', { className: 'modal-header' },
        h('span', null, '📋 Master 日志'),
        h('button', { className: 'close-btn', onClick: () => s.setShowLogs(false) }, '✕')
      ),
      h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } },
        // 左侧：文件列表
        h('div', {
          style: {
            width: 300, borderRight: '1px solid var(--border-subtle)',
            display: 'flex', flexDirection: 'column', minHeight: 0,
          },
        },
          h('div', {
            style: {
              padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            },
          },
            h('span', { style: { fontSize: 12, color: 'var(--text-low)' } },
              files.length > 0 ? `${files.length} 个文件` : '无文件'),
            h('button', {
              className: 'btn', style: { padding: '2px 10px', fontSize: 12 },
              onClick: loadFiles, disabled: loadingList,
            }, loadingList ? '⏳' : '🔄')
          ),
          h('div', { style: { flex: 1, overflow: 'auto', padding: 6 } },
            files.length === 0
              ? h('div', {
                  style: {
                    padding: 20, color: 'var(--text-low)',
                    fontSize: 12, textAlign: 'center', wordBreak: 'break-all',
                  },
                },
                  '日志目录为空或无权限',
                  h('div', { style: { marginTop: 8, fontSize: 11 } }, logDir)
                )
              : files.map(f => h('div', {
                  key: f.name,
                  onClick: () => setSelected(f.name),
                  style: {
                    padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                    cursor: 'pointer',
                    background: selected === f.name ? 'var(--bg-hover)' : 'transparent',
                    border: '1px solid ' + (selected === f.name ? 'var(--primary)' : 'transparent'),
                    fontSize: 12,
                  },
                },
                  h('div', {
                    style: {
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
                    },
                  },
                    f.is_startup_error &&
                      h('span', { style: { color: 'var(--danger)', fontSize: 12 } }, '⚠'),
                    h('span', {
                      style: {
                        fontWeight: 600,
                        color: f.is_startup_error ? 'var(--danger)' : 'var(--text-high)',
                        wordBreak: 'break-all',
                      },
                    }, f.name)
                  ),
                  h('div', {
                    style: {
                      fontSize: 11, color: 'var(--text-low)',
                      display: 'flex', justifyContent: 'space-between',
                    },
                  },
                    h('span', null, fmtSize(f.size)),
                    h('span', null, fmtTime(f.mtime))
                  )
                ))
          )
        ),
        // 右侧：内容
        h('div', {
          style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
        },
          h('div', {
            style: {
              padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            },
          },
            h('span', { style: { fontWeight: 600, fontSize: 13 } },
              selected || '← 选择左侧文件'),
            totalLines > 0 &&
              h('span', { style: { fontSize: 11, color: 'var(--text-low)' } },
                `（显示最后 ${returnedLines}/${totalLines} 行）`),
            h('div', { className: 'spacer' }),
            selected && h('label', {
              style: {
                fontSize: 12, color: 'var(--text-low)',
                display: 'flex', alignItems: 'center', gap: 6,
              },
            },
              '尾部行数:',
              h('input', {
                type: 'number', min: 10, max: 10000, value: tail,
                onChange: e => setTail(
                  Math.max(10, Math.min(10000, +e.target.value || 500))
                ),
                style: {
                  width: 80, background: 'var(--bg-base)',
                  border: '1px solid var(--border-strong)', color: 'var(--text-high)',
                  padding: '4px 8px', borderRadius: 4, fontSize: 12,
                },
              })
            ),
            selected && h('button', {
              className: 'btn',
              onClick: () => loadContent(selected, tail),
              disabled: loadingContent,
            }, loadingContent ? '⏳' : '🔄 刷新')
          ),
          h('div', {
            style: {
              flex: 1, overflow: 'auto', padding: 14, background: 'var(--bg-base)',
            },
          },
            !selected
              ? h('div', {
                  style: {
                    color: 'var(--text-low)', fontSize: 13,
                    textAlign: 'center', paddingTop: 60,
                  },
                }, '选择左侧文件查看内容')
              : loadingContent
              ? h('div', {
                  style: {
                    color: 'var(--text-low)', fontSize: 13,
                    textAlign: 'center', paddingTop: 60,
                  },
                }, '加载中...')
              : content
                ? h('pre', {
                    style: {
                      margin: 0,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 12, lineHeight: 1.6,
                      color: 'var(--text-high)',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    },
                  }, content)
                : h('div', {
                    style: {
                      color: 'var(--text-low)', fontSize: 13,
                      textAlign: 'center', paddingTop: 60,
                    },
                  }, '文件为空')
          )
        )
      )
    )
  );
}