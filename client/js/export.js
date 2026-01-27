/**
 * Postman Collection Export UI
 */

let currentEndpointId = null;

export function initExportUI() {
  const exportBtn = document.getElementById('export-postman-btn');
  const exportConfirmBtn = document.getElementById('export-confirm');
  const cancelExportBtn = document.getElementById('cancel-export');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', showExportModal);
  }
  
  if (exportConfirmBtn) {
    exportConfirmBtn.addEventListener('click', confirmExport);
  }
  
  if (cancelExportBtn) {
    cancelExportBtn.addEventListener('click', hideExportModal);
  }
}

export function setEndpointId(endpointId) {
  currentEndpointId = endpointId;
}

function showExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) {
    // Pre-fill collection name
    const nameInput = document.getElementById('export-name');
    if (nameInput) {
      nameInput.value = `HookLens - ${currentEndpointId || 'Webhook'}`;
    }
    
    // Pre-fill base URL
    const baseUrlInput = document.getElementById('export-baseurl');
    if (baseUrlInput) {
      baseUrlInput.value = window.location.origin;
    }
    
    modal.style.display = 'block';
    modal.classList.add('is-open');
  }
}

function hideExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('is-open');
  }
}

async function confirmExport() {
  const nameInput = document.getElementById('export-name');
  const baseUrlInput = document.getElementById('export-baseurl');
  
  const name = nameInput?.value.trim() || undefined;
  const baseUrl = baseUrlInput?.value.trim() || undefined;
  
  await exportToPostman({ name, baseUrl });
  hideExportModal();
}

export async function exportToPostman(options = {}) {
  if (!currentEndpointId) {
    console.error('No endpoint ID set');
    alert('No endpoint selected for export');
    return;
  }

  try {
    // Build query string
    const params = new URLSearchParams();
    if (options.name) params.append('name', options.name);
    if (options.baseUrl) params.append('baseUrl', options.baseUrl);
    
    const url = `/api/endpoints/${currentEndpointId}/export/postman?${params.toString()}`;
    
    // Trigger download
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `hooklens-${currentEndpointId}.postman_collection.json`;
    
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    
    showNotification('Postman collection exported successfully', 'success');
    
  } catch (error) {
    console.error('Error exporting to Postman:', error);
    showNotification(error.message, 'error');
  }
}

function showNotification(message, type = 'info') {
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
