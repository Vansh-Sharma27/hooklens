import {
  createEndpoint,
  getEndpoint,
  updateConfig,
  clearRequests,
  getCurl
} from './api.js';
import WebSocketClient from './websocket.js';
import {
  renderRequestList,
  renderRequestDetail,
  renderConnectionStatus,
  announceNewRequest,
  showCopyFeedback
} from './ui.js';
import { copyToClipboard } from './utils.js';

const endpointUrlInput = document.getElementById('endpoint-url');
const copyEndpointButton = document.getElementById('copy-endpoint');
const endpointMeta = document.getElementById('endpoint-meta');
const responseStatus = document.getElementById('response-status');
const responseBody = document.getElementById('response-body');
const responseContentType = document.getElementById('response-content-type');
const responseDelay = document.getElementById('response-delay');
const saveConfigButton = document.getElementById('save-config');
const clearRequestsButton = document.getElementById('clear-requests');
const requestList = document.getElementById('request-list');
const toggleResponseButton = document.getElementById('toggle-response');
const responsePanelContent = document.getElementById('response-panel-content');
const footerCount = document.getElementById('footer-count');
const copyHeadersButton = document.getElementById('copy-headers');
const copyCurlButton = document.getElementById('copy-curl');
const copyBodyButton = document.getElementById('copy-body');

const state = {
  endpoint: null,
  requests: [],
  selectedRequestId: null,
  ws: null
};

function getEndpointIdFromPath() {
  const match = window.location.pathname.match(/\/endpoint\/([^/]+)/);
  return match ? match[1] : null;
}

function updateEndpointMeta(endpoint) {
  const expiresIn = Math.max(0, endpoint.expiresAt - Date.now());
  const hours = Math.floor(expiresIn / (1000 * 60 * 60));
  const minutes = Math.floor((expiresIn % (1000 * 60 * 60)) / (1000 * 60));
  endpointMeta.textContent = `Expires in ${hours}h ${minutes}m · Created ${new Date(
    endpoint.createdAt
  ).toLocaleTimeString()}`;
}

function updateFooterCount() {
  footerCount.textContent = `${state.requests.length} requests captured`;
}

function selectRequest(requestId) {
  state.selectedRequestId = requestId;
  const selected = state.requests.find(item => item.id === requestId) || null;
  renderRequestList(state.requests, state.selectedRequestId);
  renderRequestDetail(selected);
}

async function initializeEndpoint() {
  const endpointId = getEndpointIdFromPath();
  let endpoint;

  if (endpointId) {
    endpoint = await getEndpoint(endpointId);
  } else {
    endpoint = await createEndpoint();
    window.history.replaceState(null, '', `/endpoint/${endpoint.id}`);
  }

  state.endpoint = endpoint;
  state.requests = endpoint.requests || [];
  endpointUrlInput.value = endpoint.url;
  responseStatus.value = String(endpoint.config.statusCode);
  responseBody.value = endpoint.config.responseBody;
  responseContentType.value = endpoint.config.contentType;
  responseDelay.value = String(endpoint.config.delay);
  updateEndpointMeta(endpoint);
  renderRequestList(state.requests, state.selectedRequestId);
  updateFooterCount();

  if (state.requests.length) {
    selectRequest(state.requests[0].id);
  } else {
    renderRequestDetail(null);
  }

  state.ws = new WebSocketClient(
    endpoint.id,
    handleWebSocketMessage,
    status => renderConnectionStatus(status)
  );
  state.ws.connect();
}

function handleWebSocketMessage(message) {
  if (message.type !== 'NEW_REQUEST') return;

  state.requests.unshift(message.data);
  state.requests = state.requests.slice(0, 100);
  updateFooterCount();
  renderRequestList(state.requests, state.selectedRequestId);
  announceNewRequest(message.data);

  if (!state.selectedRequestId) {
    selectRequest(message.data.id);
  }
}

copyEndpointButton.addEventListener('click', async () => {
  try {
    await copyToClipboard(endpointUrlInput.value);
    showCopyFeedback(copyEndpointButton, true);
  } catch (error) {
    showCopyFeedback(copyEndpointButton, false);
  }
});

requestList.addEventListener('click', event => {
  const target = event.target.closest('.request-item');
  if (!target) return;
  const requestId = target.getAttribute('data-request-id');
  if (requestId) {
    selectRequest(requestId);
  }
});

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.getAttribute('data-tab');
    document.querySelectorAll('.tab-button').forEach(item => {
      item.classList.toggle('is-active', item === button);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `tab-${tab}`);
    });
  });
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    responseStatus.value = chip.getAttribute('data-status');
  });
});

toggleResponseButton.addEventListener('click', () => {
  const isHidden = responsePanelContent.classList.toggle('hidden');
  toggleResponseButton.textContent = isHidden ? 'Show' : 'Hide';
});

saveConfigButton.addEventListener('click', async () => {
  if (!state.endpoint) return;
  saveConfigButton.disabled = true;
  saveConfigButton.textContent = 'Saving...';

  try {
    const config = await updateConfig(state.endpoint.id, {
      statusCode: Number(responseStatus.value),
      responseBody: responseBody.value,
      contentType: responseContentType.value,
      delay: Number(responseDelay.value)
    });
    state.endpoint.config = config;
    saveConfigButton.textContent = 'Saved ✓';
  } catch (error) {
    saveConfigButton.textContent = 'Save failed';
  }

  setTimeout(() => {
    saveConfigButton.textContent = 'Save Config';
    saveConfigButton.disabled = false;
  }, 1200);
});

clearRequestsButton.addEventListener('click', async () => {
  if (!state.endpoint) return;
  if (!state.requests.length) return;

  try {
    await clearRequests(state.endpoint.id);
    state.requests = [];
    state.selectedRequestId = null;
    renderRequestList(state.requests, state.selectedRequestId);
    renderRequestDetail(null);
    updateFooterCount();
  } catch (error) {
    console.error('Failed to clear requests', error);
  }
});

copyHeadersButton.addEventListener('click', async () => {
  const request = state.requests.find(item => item.id === state.selectedRequestId);
  if (!request) return;
  try {
    await copyToClipboard(JSON.stringify(request.headers || {}, null, 2));
    showCopyFeedback(copyHeadersButton, true);
  } catch (error) {
    showCopyFeedback(copyHeadersButton, false);
  }
});

copyCurlButton.addEventListener('click', async () => {
  const request = state.requests.find(item => item.id === state.selectedRequestId);
  if (!request || !state.endpoint) return;
  try {
    const { curl } = await getCurl(state.endpoint.id, request.id);
    await copyToClipboard(curl);
    showCopyFeedback(copyCurlButton, true);
  } catch (error) {
    showCopyFeedback(copyCurlButton, false);
  }
});

copyBodyButton.addEventListener('click', async () => {
  const request = state.requests.find(item => item.id === state.selectedRequestId);
  if (!request) return;
  try {
    await copyToClipboard(request.body || '');
    showCopyFeedback(copyBodyButton, true);
  } catch (error) {
    showCopyFeedback(copyBodyButton, false);
  }
});

initializeEndpoint().catch(error => {
  console.error('Failed to initialize endpoint', error);
  endpointMeta.textContent = 'Failed to initialize endpoint. Refresh to retry.';
});
