/**
 * mapOverlay.js – Map overlay open/close, building info panel,
 *                  category filter, search dropdown, popular grid
 */
import { buildings } from './data/buildings.js';

// ── Open / Close Overlay ──────────────────────────────────────────

export function openMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  });
  showBuilding(0);
}

export function closeMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  document.body.style.overflow = '';
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 400);
}

// ── Show Building Info Panel ──────────────────────────────────────

export function showBuilding(id) {
  const b = buildings[id];
  if (!b) return;

  const panel = document.getElementById('info-panel');

  // Populate fields
  const setEl = (elId, value) => {
    const el = document.getElementById(elId);
    if (el) el.textContent = value;
  };

  setEl('panel-name', b.name);
  setEl('panel-type', b.type);
  setEl('panel-icon', b.icon);
  setEl('panel-img-icon', b.icon);

  const imgBg = document.getElementById('panel-img-bg');
  if (imgBg) imgBg.style.background = b.imgBg;

  setEl('panel-desc', b.desc);
  setEl('panel-hours', b.hours);

  const ul = document.getElementById('panel-facilities');
  if (ul) {
    ul.innerHTML = b.facilities
      .map(
        (f) =>
          `<li class="panel-facility-item"><span class="panel-facility-check">✓</span>${f}</li>`,
      )
      .join('');
  }

  // Animate panel in
  if (panel) {
    panel.classList.add('panel-hidden');
    panel.style.display = 'block';
    requestAnimationFrame(() => panel.classList.remove('panel-hidden'));
  }

  // Update active pin
  document.querySelectorAll('.bldg-pin').forEach((p, i) =>
    p.querySelector('.pin-dot')?.classList.toggle('active-pin', i === id),
  );
}

// ── Close Panel ───────────────────────────────────────────────────

export function closePanel() {
  const panel = document.getElementById('info-panel');
  if (!panel) return;
  panel.classList.add('panel-hidden');
  setTimeout(() => {
    panel.style.display = 'none';
  }, 350);
}

// ── Category Filter ───────────────────────────────────────────────

export function filterCat(btn, cat) {
  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active-cat'));
  btn.classList.add('active-cat');
  document.querySelectorAll('.bldg-pin').forEach((pin) => {
    const b = buildings[+pin.dataset.id];
    pin.style.display = cat === 'all' || b?.cat === cat ? 'block' : 'none';
  });
}

// ── Search / Dropdown ─────────────────────────────────────────────

export function filterBuildings(q) {
  const dd = document.getElementById('search-dropdown');
  if (!dd) return;

  if (!q.trim()) {
    dd.style.display = 'none';
    return;
  }

  const matches = buildings.filter((b) =>
    b.name.toLowerCase().includes(q.toLowerCase()),
  );

  if (!matches.length) {
    dd.style.display = 'none';
    return;
  }

  dd.innerHTML = matches
    .map(
      (b) =>
        `<div class="search-dropdown-item" data-id="${b.id}">
          ${b.icon} ${b.name}
          <span class="search-dropdown-item-type">${b.type}</span>
        </div>`,
    )
    .join('');

  dd.style.display = 'block';
}

// ── Populate Popular Grid ─────────────────────────────────────────

function buildPopularGrid() {
  const grid = document.getElementById('popular-grid');
  if (!grid) return;

  grid.innerHTML = [0, 1, 2, 3, 4]
    .map((id) => {
      const b = buildings[id];
      return `<div class="pop-card" data-id="${id}">
        <div class="pop-card-img" style="background:${b.imgBg}">${b.icon}</div>
        <div class="pop-card-label">${b.name}</div>
      </div>`;
    })
    .join('');
}

// ── Init ──────────────────────────────────────────────────────────

export function initMapOverlay() {
  // Helper to select a building from dynamic elements
  const selectBuilding = (id) => {
    const searchInput = document.getElementById('map-search');
    const dd = document.getElementById('search-dropdown');
    if (searchInput) searchInput.value = '';
    if (dd) dd.style.display = 'none';
    showBuilding(id);
  };

  // Bind launch button events
  const launchButtons = [
    document.getElementById('nav-launch-map'),
    document.getElementById('hero-explore-map'),
    document.getElementById('cta-explore-map')
  ];
  launchButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openMapOverlay();
      });
    }
  });

  // Bind close button
  const closeBtn = document.getElementById('map-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMapOverlay);
  }

  // Bind search input events
  const searchInput = document.getElementById('map-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterBuildings(e.target.value);
    });
  }

  // Event delegation for search dropdown items
  const dd = document.getElementById('search-dropdown');
  if (dd) {
    dd.addEventListener('click', (e) => {
      const item = e.target.closest('.search-dropdown-item');
      if (item) {
        selectBuilding(+item.dataset.id);
      }
    });
  }

  // Event delegation for popular locations grid
  const popularGrid = document.getElementById('popular-grid');
  if (popularGrid) {
    popularGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.pop-card');
      if (card) {
        selectBuilding(+card.dataset.id);
      }
    });
  }

  // Bind building pins click events
  document.querySelectorAll('.bldg-pin').forEach((pin) => {
    pin.addEventListener('click', () => {
      showBuilding(+pin.dataset.id);
    });
  });

  // Bind close info panel button
  const panelCloseBtn = document.querySelector('.panel-close-btn');
  if (panelCloseBtn) {
    panelCloseBtn.addEventListener('click', closePanel);
  }

  // Bind category button clicks
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      filterCat(btn, btn.dataset.cat);
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#map-search') && !e.target.closest('#search-dropdown')) {
      const dd = document.getElementById('search-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  // Close overlay with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMapOverlay();
  });

  // Hide panel initially
  const panel = document.getElementById('info-panel');
  if (panel) panel.classList.add('panel-hidden');

  buildPopularGrid();
}

