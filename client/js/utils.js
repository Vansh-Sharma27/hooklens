export function formatTimestamp(ms) {
  const date = new Date(ms);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateCurl(request, baseUrl) {
  const parts = ['curl'];

  if (request.method && request.method !== 'GET') {
    parts.push(`-X ${request.method}`);
  }

  if (request.headers) {
    Object.entries(request.headers).forEach(([key, value]) => {
      if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
        parts.push(`-H '${escapeShell(value)}'`);
      }
    });
  }

  if (request.body) {
    if (request.isJson) {
      parts.push(`-d '${escapeShell(request.body)}'`);
    } else {
      parts.push(`--data-raw '${escapeShell(request.body)}'`);
    }
  }

  const fullUrl = joinUrl(baseUrl, request.path || '');
  parts.push(`'${fullUrl}'`);
  return parts.join(' \\\n  ');
}

function escapeShell(value) {
  return String(value).replace(/'/g, "'\\''");
}

function joinUrl(baseUrl, path) {
  if (!baseUrl) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
