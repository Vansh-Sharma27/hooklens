export function filterRequests(requests, { query, method }) {
  if (!requests || !Array.isArray(requests)) {
    return [];
  }

  return requests.filter(request => {
    if (method && method !== 'all' && request.method !== method) {
      return false;
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      const searchable = [
        request.path,
        request.body,
        request.contentType,
        request.method,
        request.ip,
        JSON.stringify(request.headers),
        JSON.stringify(request.query)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

export function initSearchUI(onSearchChange, onMethodFilterChange) {
  const searchInput = document.getElementById('search-input');
  const filterChips = document.querySelectorAll('.filter-chip');

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', event => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onSearchChange(event.target.value);
      }, 300);
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      
      const method = chip.getAttribute('data-method');
      onMethodFilterChange(method);
    });
  });

  if (filterChips.length > 0) {
    filterChips[0].classList.add('is-active');
  }
}
