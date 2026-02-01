const API_BASE = '/api';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message = data?.error || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return data;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

export async function createEndpoint() {
  return requestJson('/endpoints', { method: 'POST' });
}

export async function getEndpoint(id) {
  return requestJson(`/endpoints/${id}`);
}

export async function updateConfig(id, config) {
  return requestJson(`/endpoints/${id}/config`, {
    method: 'PATCH',
    body: JSON.stringify(config)
  });
}

export async function clearRequests(id) {
  return requestJson(`/endpoints/${id}/requests`, { method: 'DELETE' });
}

export async function getCurl(endpointId, requestId) {
  return requestJson(`/endpoints/${endpointId}/requests/${requestId}/curl`);
}
