function generateCurl(request, baseUrl) {
  const parts = ['curl'];

  if (request.method && request.method !== 'GET') {
    parts.push(`-X ${request.method}`);
  }

  if (request.headers) {
    for (const [key, value] of Object.entries(request.headers)) {
      if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
        parts.push(`-H '${key}: ${escapeShell(String(value))}'`);
      }
    }
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

module.exports = { generateCurl };
