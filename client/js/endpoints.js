const STORAGE_KEY = 'hooklens_endpoints';
const MAX_STORED = 20;

export function getStoredEndpointIds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to read stored endpoints', error);
    return [];
  }
}

export function addEndpointId(id) {
  if (!id) return;
  
  const ids = getStoredEndpointIds();
  if (!ids.includes(id)) {
    ids.unshift(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_STORED)));
  }
}

export function removeEndpointId(id) {
  const ids = getStoredEndpointIds().filter(i => i !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export async function fetchEndpointList() {
  const ids = getStoredEndpointIds();
  if (!ids.length) return [];

  try {
    const response = await fetch(`/api/endpoints?ids=${ids.join(',')}`);
    if (!response.ok) throw new Error('Failed to fetch endpoints');
    
    const data = await response.json();
    return data.endpoints || [];
  } catch (error) {
    console.error('Failed to fetch endpoint list', error);
    return [];
  }
}

export function renderEndpointSidebar(endpoints, currentId) {
  const container = document.getElementById('endpoint-list');
  if (!container) return;

  if (!endpoints.length) {
    container.innerHTML = '<div class="empty-state">No endpoints yet</div>';
    return;
  }

  const items = endpoints
    .map(endpoint => {
      const isActive = endpoint.id === currentId;
      const expiresIn = Math.max(0, endpoint.expiresAt - Date.now());
      const days = Math.floor(expiresIn / (1000 * 60 * 60 * 24));
      const hours = Math.floor((expiresIn % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return `
        <div class="endpoint-list-item ${isActive ? 'is-active' : ''}" data-endpoint-id="${endpoint.id}">
          <div class="endpoint-list-item__id">${endpoint.id}</div>
          <div class="endpoint-list-item__meta">
            ${endpoint.requestCount} requests · ${days}d ${hours}h left
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = items;
}
