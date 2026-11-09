function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TOOL_RESULT_RE = /^\s*status:\s*(\w+)\s*\|\s*result:\s*([\s\S]*)$/;

export function parseToolResult(text) {
  if (!text) return null;
  const m = String(text).trim().match(TOOL_RESULT_RE);
  if (!m) return null;
  const rest = m[2].trim();
  let resultObj = null, content = null;
  try {
    resultObj = JSON.parse(rest);
    if (resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj)) content = resultObj.content;
  } catch (e) {
    resultObj = rest;
  }
  return { status: m[1], result: resultObj, content };
}

const JSON_CONTENT_KEYS = ['output', 'content', 'message', 'text', 'result', 'data'];

export function parseJsonObject(text) {
  if (!text) return null;
  const stripped = String(text).trim();
  if (!(stripped.startsWith('{') && stripped.endsWith('}'))) return null;
  try {
    const obj = JSON.parse(stripped);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch (e) {
    return null;
  }
  return null;
}

function renderJsonObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  let contentKey = null;
  for (const k of JSON_CONTENT_KEYS) {
    if (k in obj && obj[k] !== null && obj[k] !== undefined && obj[k] !== '') {
      contentKey = k;
      break;
    }
  }
  if (contentKey === null) {
    const pretty = JSON.stringify(obj, null, 2);
    return `<pre style="background:#161b22;padding:8px;border-radius:4px;overflow-x:auto;margin:0;"><code>${escapeHtml(pretty)}</code></pre>`;
  }
  const contentValue = obj[contentKey];
  const contentStr = typeof contentValue === 'string' ? contentValue : JSON.stringify(contentValue, null, 2);
  const bodyHtml = parseConnToHtml(contentStr);
  const otherMeta = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === contentKey) continue;
    if (v === null || v === undefined || v === '') continue;
    const display = (typeof v === 'object') ? JSON.stringify(v) : String(v);
    otherMeta.push(`${k}=${display}`);
  }
  const metaHtml = otherMeta.length
    ? `<div style="color:#8b949e;font-size:11px;margin-top:6px;padding-top:4px;border-top:1px dashed #30363d;">${otherMeta.map(escapeHtml).join(' | ')}</div>`
    : '';
  return `<div>${bodyHtml}${metaHtml}</div>`;
}

const LINE_NUM_RE = /^(\d+)\s*[|:\-]\s?(.*)$/;

export function stripLineNumbers(text) {
  if (!text) return ['', {}];
  const lines = String(text).split('\n');
  const cleanLines = [], lineMap = {};
  for (const line of lines) {
    const m = line.match(LINE_NUM_RE);
    if (m) {
      lineMap[parseInt(m[1], 10)] = m[2];
      cleanLines.push(m[2]);
    } else {
      cleanLines.push(line);
    }
  }
  return [cleanLines.join('\n'), lineMap];
}

export function markdownToHtml(text) {
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) =>
    `<pre style="background:#161b22;padding:8px;border-radius:4px;overflow-x:auto;"><code>${escapeHtml(code)}</code></pre>`);
  text = text.replace(/`([^`]+)`/g, '<code style="background:#161b22;padding:1px 4px;border-radius:3px;">$1</code>');
  for (let i = 6; i >= 1; i--) {
    text = text.replace(new RegExp(`^${'#'.repeat(i)}\\s+(.+)$`, 'gm'), `<h${i}>$1</h${i}>`);
  }
  text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<i>$2</i>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const lines = text.split('\n');
  const out = [];
  let inUl = false;
  for (const line of lines) {
    if (/^\s*[-*+]\s+/.test(line)) {
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${line.replace(/^\s*[-*+]\s+/, '')}</li>`);
    } else {
      if (inUl) { out.push('</ul>'); inUl = false; }
      out.push(line);
    }
  }
  if (inUl) out.push('</ul>');
  return out.join('\n').replace(/\n/g, '<br>');
}

function textToHtml(text) {
  if (!text) return '';
  let escaped = escapeHtml(String(text));
  return escaped.replace(/\n/g, '<br>').replace(/\\n/g, '<br>');
}

const HTML_TAG_RE = /<\/?(a|b|i|u|em|strong|div|span|p|br|pre|code|ul|ol|li|table|tr|td|th|h[1-6]|img|hr|blockquote)\b[^>]*>/i;
const MD_FEATURE_RE = /(^|\n)(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|>\s)|```|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)/m;

export function parseConnToHtml(conn) {
  if (conn === null || conn === undefined) return '';
  const text = String(conn);
  if (!text.trim()) return '';

  const tool = parseToolResult(text);
  if (tool) {
    const status = tool.status || 'ok';
    let inner = tool.content;
    if (inner === null || inner === undefined) inner = tool.result;
    let bodyHtml;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) bodyHtml = renderJsonObject(inner);
    else if (typeof inner === 'string') bodyHtml = parseConnToHtml(inner);
    else bodyHtml = textToHtml(inner ? String(inner) : '');
    const statusColor = status === 'ok' ? '#3fb950' : '#f85149';
    return `<div style="border:1px solid #30363d;border-radius:6px;margin-top:6px;overflow:hidden;"><div style="background:#21262d;padding:4px 10px;font-size:12px;color:#8b949e;"><span style="color:${statusColor};font-weight:bold;">● ${escapeHtml(status)}</span><span style="margin-left:8px;">工具结果</span></div><div style="padding:8px 12px;background:#0d1117;">${bodyHtml}</div></div>`;
  }

  const jsonObj = parseJsonObject(text);
  if (jsonObj) {
    const rendered = renderJsonObject(jsonObj);
    if (rendered !== null) return rendered;
  }

  if (HTML_TAG_RE.test(text)) return text;

  if (MD_FEATURE_RE.test(text)) return markdownToHtml(text);

  return textToHtml(text);
}