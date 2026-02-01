/**
 * Request Forwarding UI
 * Manages forwarding configuration and manual forwarding
 */

let currentEndpointId = null;

export function initForwardingUI() {
  const saveBtn = document.getElementById('save-forwarding');
  const forwardUrlInput = document.getElementById('forward-url');
  const autoForwardCheckbox = document.getElementById('auto-forward');
  const toggleBtn = document.getElementById('toggle-forwarding');
  const panelContent = document.getElementById('forwarding-panel-content');

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const forwardUrl = forwardUrlInput.value.trim() || null;
      const autoForward = autoForwardCheckbox.checked;
      
      await updateForwardingConfig(forwardUrl, autoForward);
    });
  }

  // Toggle panel visibility
  if (toggleBtn && panelContent) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = panelContent.style.display === 'none';
      panelContent.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
    });
  }
}

export function setEndpointId(endpointId) {
  currentEndpointId = endpointId;
}

export function loadForwardingConfig(config) {
  const forwardUrlInput = document.getElementById('forward-url');
  const autoForwardCheckbox = document.getElementById('auto-forward');

  if (forwardUrlInput) {
    forwardUrlInput.value = config.forwardUrl || '';
  }
  if (autoForwardCheckbox) {
    autoForwardCheckbox.checked = config.autoForward || false;
  }
}

export async function updateForwardingConfig(forwardUrl, autoForward) {
  if (!currentEndpointId) {
    console.error('No endpoint ID set');
    return;
  }

  try {
    const response = await fetch(`/api/endpoints/${currentEndpointId}/forwarding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forwardUrl, autoForward })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update forwarding config');
    }

    const config = await response.json();
    
    // Show success notification
    showNotification('Forwarding configuration saved', 'success');
    
    return config;
  } catch (error) {
    console.error('Error updating forwarding config:', error);
    showNotification(error.message, 'error');
  }
}

export async function forwardRequest(requestId, targetUrl) {
  if (!currentEndpointId) {
    console.error('No endpoint ID set');
    return;
  }

  try {
    const response = await fetch(
      `/api/endpoints/${currentEndpointId}/requests/${requestId}/forward`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: targetUrl || undefined })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Forward failed');
    }

    const result = await response.json();
    renderForwardResult(result);
    
    return result;
  } catch (error) {
    console.error('Error forwarding request:', error);
    showNotification(error.message, 'error');
  }
}

export function renderForwardResult(result) {
  const resultContainer = document.getElementById('forward-result');
  if (!resultContainer) return;

  const successClass = result.success ? 'forward-success' : 'forward-error';
  
  resultContainer.className = `forward-result ${successClass}`;
  resultContainer.innerHTML = `
    <div class="forward-result-header">
      <strong>${result.success ? '✓ Forwarded' : '✗ Failed'}</strong>
      <span class="forward-latency">${result.latency}ms</span>
    </div>
    <div class="forward-target">${result.targetUrl || 'N/A'}</div>
    ${result.success ? `
      <div class="forward-status">Status: ${result.statusCode} ${result.statusText || ''}</div>
      ${result.responseBody ? `
        <details class="forward-response">
          <summary>Response Body</summary>
          <pre>${escapeHtml(result.responseBody.substring(0, 500))}${result.responseBody.length > 500 ? '...' : ''}</pre>
        </details>
      ` : ''}
    ` : `
      <div class="forward-error-msg">${result.error || 'Unknown error'}</div>
    `}
  `;
  
  resultContainer.style.display = 'block';
}

export function handleForwardResult(data) {
  // Called when FORWARD_RESULT WebSocket message is received
  const { requestId, result } = data;
  
  // Show notification
  const status = result.success ? 'success' : 'error';
  const message = result.success 
    ? `Request auto-forwarded (${result.latency}ms)` 
    : `Auto-forward failed: ${result.error}`;
  
  showNotification(message, status);
  
  // If the request detail panel is open for this request, show result
  const detailPanel = document.getElementById('request-detail');
  if (detailPanel && detailPanel.dataset.requestId === requestId) {
    renderForwardResult(result);
  }
}

function showNotification(message, type = 'info') {
  // Simple notification system
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${type === 'success' ? '#2ea043' : type === 'error' ? '#da3633' : '#1f6feb'};
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
