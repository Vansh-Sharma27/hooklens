/**
 * Webhook Signature Verification UI
 * Supports Stripe, GitHub, Slack, and Twilio
 */

let currentEndpointId = null;
let currentRequestId = null;

export function initSignatureUI() {
  const verifyBtn = document.getElementById('verify-sig');
  
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      const provider = document.getElementById('sig-provider').value;
      const secret = document.getElementById('sig-secret').value;
      
      if (!secret) {
        showError('Please enter your webhook secret');
        return;
      }
      
      await verifySignature(currentRequestId, provider, secret);
    });
  }
}

export function setContext(endpointId, requestId) {
  currentEndpointId = endpointId;
  currentRequestId = requestId;
}

export async function verifySignature(requestId, provider, secret) {
  if (!currentEndpointId || !requestId) {
    showError('No request selected');
    return;
  }

  try {
    const response = await fetch(
      `/api/endpoints/${currentEndpointId}/requests/${requestId}/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, secret })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }

    const result = await response.json();
    renderVerificationResult(result);
    
    return result;
  } catch (error) {
    console.error('Error verifying signature:', error);
    showError(error.message);
  }
}

export function renderVerificationResult(result) {
  const resultContainer = document.getElementById('sig-result');
  if (!resultContainer) return;

  const statusClass = result.valid ? 'sig-success' : 'sig-error';
  const statusIcon = result.valid ? '✓' : '✗';
  const statusText = result.valid ? 'Valid' : 'Invalid';
  
  resultContainer.className = `sig-result ${statusClass}`;
  resultContainer.innerHTML = `
    <div class="sig-result-header">
      <strong>${statusIcon} ${statusText}</strong>
      <span class="sig-provider">${result.provider}</span>
    </div>
    ${result.error ? `
      <div class="sig-error-msg">${escapeHtml(result.error)}</div>
    ` : `
      <div class="sig-details">
        <div class="sig-signature">
          <label>Expected:</label>
          <code>${escapeHtml(result.expected || 'N/A')}</code>
        </div>
        <div class="sig-signature">
          <label>Received:</label>
          <code>${escapeHtml(result.received || 'N/A')}</code>
        </div>
        ${result.details ? `
          <div class="sig-extra">
            ${result.details.timestamp ? `
              <div>Timestamp: ${new Date(result.details.timestamp * 1000).toLocaleString()}</div>
              <div>Age: ${result.details.age} seconds</div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `}
  `;
  
  resultContainer.style.display = 'block';
}

function showError(message) {
  const resultContainer = document.getElementById('sig-result');
  if (!resultContainer) {
    alert(message);
    return;
  }

  resultContainer.className = 'sig-result sig-error';
  resultContainer.innerHTML = `
    <div class="sig-result-header">
      <strong>✗ Error</strong>
    </div>
    <div class="sig-error-msg">${escapeHtml(message)}</div>
  `;
  resultContainer.style.display = 'block';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showSignaturePanel() {
  const panel = document.getElementById('signature-panel');
  if (panel) {
    panel.style.display = 'block';
  }
}

export function hideSignaturePanel() {
  const panel = document.getElementById('signature-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}
