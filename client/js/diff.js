/**
 * Request Diff UI
 * Compare two captured requests side-by-side
 */

let currentEndpointId = null;
let diffMode = false;
let selectedForDiff = [];

export function initDiffUI() {
  const diffModeBtn = document.getElementById('diff-mode-btn');
  const closeDiffBtn = document.getElementById('close-diff');
  
  if (diffModeBtn) {
    diffModeBtn.addEventListener('click', toggleDiffMode);
  }
  
  if (closeDiffBtn) {
    closeDiffBtn.addEventListener('click', closeDiffModal);
  }
  
  // Tab switching in diff modal
  const diffTabs = document.querySelectorAll('.diff-tabs button');
  diffTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchDiffTab(tabName);
    });
  });
}

export function setEndpointId(endpointId) {
  currentEndpointId = endpointId;
}

export function toggleDiffMode() {
  diffMode = !diffMode;
  selectedForDiff = [];
  
  const btn = document.getElementById('diff-mode-btn');
  if (btn) {
    btn.textContent = diffMode ? 'Cancel Compare' : 'Compare';
    btn.classList.toggle('is-active', diffMode);
  }
  
  // Update UI to show selection mode
  updateRequestListForDiffMode();
  
  // Hide diff modal if exiting diff mode
  if (!diffMode) {
    closeDiffModal();
  }
}

export function selectForDiff(requestId) {
  if (!diffMode) return;
  
  const index = selectedForDiff.indexOf(requestId);
  
  if (index > -1) {
    // Deselect
    selectedForDiff.splice(index, 1);
  } else {
    // Select (max 2)
    if (selectedForDiff.length < 2) {
      selectedForDiff.push(requestId);
    } else {
      // Replace the oldest selection
      selectedForDiff.shift();
      selectedForDiff.push(requestId);
    }
  }
  
  updateRequestListForDiffMode();
  
  // If two selected, trigger comparison
  if (selectedForDiff.length === 2) {
    compareTwoRequests(selectedForDiff[0], selectedForDiff[1]);
  }
}

export function isSelectedForDiff(requestId) {
  return selectedForDiff.includes(requestId);
}

export function isDiffMode() {
  return diffMode;
}

export async function compareTwoRequests(requestId1, requestId2) {
  if (!currentEndpointId) {
    console.error('No endpoint ID set');
    return;
  }

  try {
    const response = await fetch(
      `/api/endpoints/${currentEndpointId}/diff`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId1, requestId2 })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Diff failed');
    }

    const result = await response.json();
    renderDiffView(result);
    
    return result;
  } catch (error) {
    console.error('Error comparing requests:', error);
    alert(`Error: ${error.message}`);
  }
}

function renderDiffView(result) {
  const modal = document.getElementById('diff-modal');
  if (!modal) return;
  
  // Update header
  const header = modal.querySelector('.diff-header span');
  if (header) {
    header.textContent = `Comparing Request #1 (${formatTimestamp(result.request1.timestamp)}) vs #2 (${formatTimestamp(result.request2.timestamp)})`;
  }
  
  // Render initial tab (headers)
  renderDiffTab('headers', result.diff);
  
  // Store diff data for tab switching
  modal.dataset.diffData = JSON.stringify(result.diff);
  
  // Show modal
  modal.style.display = 'block';
  modal.classList.add('is-open');
}

function renderDiffTab(tabName, diff) {
  const content = document.getElementById('diff-content');
  if (!content) return;
  
  // Activate tab button
  document.querySelectorAll('.diff-tabs button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.tab === tabName);
  });
  
  let html = '';
  
  switch (tabName) {
    case 'headers':
      html = renderObjectDiff(diff.headers);
      break;
    case 'query':
      html = renderObjectDiff(diff.query);
      break;
    case 'body':
      html = renderBodyDiff(diff.body);
      break;
  }
  
  content.innerHTML = html || '<div class="empty-state">No differences</div>';
}

function renderObjectDiff(objectDiff) {
  if (!objectDiff) return '';
  
  const { added, removed, changed, unchanged } = objectDiff;
  
  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return '<div class="diff-no-change">No differences</div>';
  }
  
  let html = '<div class="diff-object">';
  
  // Removed
  removed.forEach(item => {
    html += `
      <div class="diff-line diff-removed">
        <span class="diff-indicator">-</span>
        <code><strong>${escapeHtml(item.key)}:</strong> ${escapeHtml(String(item.value))}</code>
      </div>
    `;
  });
  
  // Added
  added.forEach(item => {
    html += `
      <div class="diff-line diff-added">
        <span class="diff-indicator">+</span>
        <code><strong>${escapeHtml(item.key)}:</strong> ${escapeHtml(String(item.value))}</code>
      </div>
    `;
  });
  
  // Changed
  changed.forEach(item => {
    html += `
      <div class="diff-line diff-changed">
        <span class="diff-indicator">~</span>
        <code><strong>${escapeHtml(item.key)}:</strong></code>
        <div class="diff-change-detail">
          <div class="diff-old">- ${escapeHtml(String(item.oldValue))}</div>
          <div class="diff-new">+ ${escapeHtml(String(item.newValue))}</div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  return html;
}

function renderBodyDiff(bodyDiff) {
  if (!bodyDiff || !Array.isArray(bodyDiff)) return '';
  
  if (bodyDiff.length === 1 && !bodyDiff[0].added && !bodyDiff[0].removed) {
    return '<div class="diff-no-change">No differences</div>';
  }
  
  let html = '<div class="diff-body"><pre>';
  
  bodyDiff.forEach(part => {
    const value = escapeHtml(part.value);
    if (part.added) {
      html += `<span class="diff-added">${value}</span>`;
    } else if (part.removed) {
      html += `<span class="diff-removed">${value}</span>`;
    } else {
      html += value;
    }
  });
  
  html += '</pre></div>';
  
  return html;
}

function switchDiffTab(tabName) {
  const modal = document.getElementById('diff-modal');
  if (!modal || !modal.dataset.diffData) return;
  
  const diff = JSON.parse(modal.dataset.diffData);
  renderDiffTab(tabName, diff);
}

function closeDiffModal() {
  const modal = document.getElementById('diff-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('is-open');
  }
}

function updateRequestListForDiffMode() {
  // This should be called by the main app to update request list styling
  const event = new CustomEvent('diffModeChanged', {
    detail: { diffMode, selectedForDiff }
  });
  document.dispatchEvent(event);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}
