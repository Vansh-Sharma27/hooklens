const sidebar = document.getElementById('endpoint-sidebar');
const detailPanel = document.querySelector('.request-detail-panel');
const overlay = document.getElementById('mobile-overlay');
const menuBtn = document.getElementById('mobile-menu-btn');

export function initMobile() {
  if (menuBtn) {
    menuBtn.addEventListener('click', toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', closeAllPanels);
  }

  initSwipeGestures();
  
  const backBtn = document.getElementById('mobile-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', closeDetailPanel);
  }
}

export function toggleSidebar() {
  if (!sidebar || !overlay) return;
  
  const isOpen = sidebar.classList.toggle('is-open');
  overlay.classList.toggle('is-visible', isOpen);
}

export function openDetailPanel() {
  if (!detailPanel || !overlay) return;
  
  if (window.innerWidth <= 768) {
    detailPanel.classList.add('is-open');
    overlay.classList.add('is-visible');
  }
}

export function closeDetailPanel() {
  if (!detailPanel || !overlay || !sidebar) return;
  
  detailPanel.classList.remove('is-open');
  
  if (!sidebar.classList.contains('is-open')) {
    overlay.classList.remove('is-visible');
  }
}

export function closeAllPanels() {
  if (sidebar) sidebar.classList.remove('is-open');
  if (detailPanel) detailPanel.classList.remove('is-open');
  if (overlay) overlay.classList.remove('is-visible');
}

function initSwipeGestures() {
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  document.addEventListener(
    'touchstart',
    e => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    e => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    },
    { passive: true }
  );

  function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = Math.abs(touchEndY - touchStartY);
    const threshold = 80;

    if (diffY > threshold) return;

    if (touchStartX < 30 && diffX > threshold) {
      toggleSidebar();
    }

    if (
      diffX < -threshold &&
      detailPanel &&
      detailPanel.classList.contains('is-open')
    ) {
      closeDetailPanel();
    }
  }
}
