import { escapeHtml, formatBytes, formatTimestamp } from './utils.js';

const listContainer = document.getElementById('request-list');
const requestCount = document.getElementById('request-count');
const requestTitle = document.getElementById('request-title');
const requestMeta = document.getElementById('request-meta');
const tabHeaders = document.getElementById('tab-headers');
const tabQuery = document.getElementById('tab-query');
const tabBody = document.getElementById('tab-body');
const copyHeadersButton = document.getElementById('copy-headers');
const copyCurlButton = document.getElementById('copy-curl');
const copyBodyButton = document.getElementById('copy-body');
const forwardButton = document.getElementById('forward-request');
const srAnnouncer = document.getElementById('sr-announcer');

export function renderRequestList(requests, selectedId, diffModeData = null) {
  requestCount.textContent = String(requests.length);
  if (!requests.length) {
    listContainer.innerHTML = '<div class="empty-state">Waiting for requests...</div>';
    return;
  }

  const rows = requests
    .map(request => {
      const isSelected = request.id === selectedId;
      const isDiffMode = diffModeData?.isDiffMode || false;
      const isDiffSelected = diffModeData?.selectedForDiff?.includes(request.id) || false;
      
      const classes = ['request-item'];
      if (isSelected && !isDiffMode) classes.push('is-selected');
      if (isDiffMode) classes.push('diff-selectable');
      if (isDiffSelected) classes.push('diff-selected');
      
      const contentType = request.contentType || '—';
      const size = formatBytes(request.bodySize || 0);
      const timestamp = formatTimestamp(request.timestamp);

      return `
        <div class="${classes.join(' ')}" data-request-id="${escapeHtml(request.id)}">
          <div class="request-item__indicator"></div>
          <div class="method-badge" data-method="${escapeHtml(request.method)}">
            ${escapeHtml(request.method)}
          </div>
          <div class="request-item__time">${timestamp}</div>
          <div class="request-item__content">${escapeHtml(contentType)}</div>
          <div class="request-item__size">${size}</div>
        </div>
      `;
    })
    .join('');

  listContainer.innerHTML = rows;
}

export function renderRequestDetail(request) {
  if (!request) {
    requestTitle.textContent = 'Select a request to view details';
    requestMeta.textContent = '';
    tabHeaders.innerHTML = '';
    tabQuery.innerHTML = '';
    tabBody.innerHTML = '';
    setDetailActionsEnabled(false);
    
    // Hide signature panel when no request selected
    const signaturePanel = document.getElementById('signature-panel');
    if (signaturePanel) {
      signaturePanel.style.display = 'none';
    }
    return;
  }

  requestTitle.textContent = `${request.method} ${request.path}`;
  requestMeta.textContent = `Received: ${new Date(request.timestamp).toLocaleString()} · ${
    request.bodySize || 0
  } bytes · ${request.ip || 'unknown'}`;

  tabHeaders.innerHTML = renderKeyValueTable(request.headers || {}, 'No headers');
  tabQuery.innerHTML = renderKeyValueTable(request.query || {}, 'No query params');
  tabBody.innerHTML = renderBody(request);

  setDetailActionsEnabled(true);
  
  // Show signature panel when request is selected
  const signaturePanel = document.getElementById('signature-panel');
  if (signaturePanel) {
    signaturePanel.style.display = 'block';
  }
}

export function renderConnectionStatus(status) {
  const statusBadge = document.getElementById('connection-status');
  const footerStatus = document.getElementById('footer-status');
  const statusMap = {
    connected: { label: 'Connected', className: 'status-pill--connected' },
    connecting: { label: 'Connecting', className: 'status-pill--connecting' },
    reconnecting: { label: 'Reconnecting', className: 'status-pill--reconnecting' },
    disconnected: { label: 'Disconnected', className: 'status-pill--disconnected' }
  };

  const config = statusMap[status] || statusMap.connecting;
  statusBadge.textContent = config.label;
  statusBadge.className = `status-pill ${config.className}`;
  footerStatus.textContent = config.label;
}

export function announceNewRequest(request) {
  if (!srAnnouncer) return;
  srAnnouncer.textContent = `New ${request.method} request received, ${request.bodySize || 0} bytes`;
}

export function showCopyFeedback(button, success) {
  if (!button) return;
  const originalText = button.textContent;
  button.textContent = success ? 'Copied!' : 'Failed';
  button.disabled = true;
  setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 1200);
}

function renderKeyValueTable(obj, emptyText) {
  const entries = Object.entries(obj || {});
  if (!entries.length) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return entries
    .map(([key, value]) => {
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
      return `
        <div class="kv-row">
          <span class="kv-key">${escapeHtml(key)}</span>
          <span class="kv-value">${escapeHtml(displayValue)}</span>
        </div>
      `;
    })
    .join('');
}

function renderBody(request) {
  if (!request.body) {
    return '<div class="empty-state">(empty body)</div>';
  }

  if (request.isJson && request.parsedBody) {
    const pretty = JSON.stringify(request.parsedBody, null, 2);
    return `<pre class="json-display">${highlightJson(pretty)}</pre>`;
  }

  return `<pre>${escapeHtml(request.body)}</pre>`;
}

function highlightJson(json) {
  const escaped = escapeHtml(json);
  return escaped.replace(
    /(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*\"(\\s*:)?|\\b(true|false|null)\\b|\\b-?\\d+(?:\\.\\d+)?\\b)/g,
    match => {
      if (match === 'true' || match === 'false') {
        return `<span class="json-boolean">${match}</span>`;
      }
      if (match === 'null') {
        return `<span class="json-null">${match}</span>`;
      }
      if (match.startsWith('"') && match.endsWith('":')) {
        return `<span class="json-key">${match}</span>`;
      }
      if (match.startsWith('"')) {
        return `<span class="json-string">${match}</span>`;
      }
      return `<span class="json-number">${match}</span>`;
    }
  );
}

function setDetailActionsEnabled(enabled) {
  copyHeadersButton.disabled = !enabled;
  copyCurlButton.disabled = !enabled;
  copyBodyButton.disabled = !enabled;
  if (forwardButton) forwardButton.disabled = !enabled;
}
