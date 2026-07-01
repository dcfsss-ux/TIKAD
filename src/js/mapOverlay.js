/**
 * mapOverlay.js  –  GIYA 3D Map Integration
 *
 * Boots the Three.js Experience engine into .experience-canvas when the user
 * first clicks "Launch Map". All subsequent opens just toggle visibility.
 * The existing TIKAD map overlay HTML (#map-overlay, #info-panel, #map-search)
 * is reused — only the canvas area has changed.
 */

import * as THREE from 'three';
import Experience from '../../Experience/Experience.js';

// ── Building registry ─────────────────────────────────────────────────────────
// Keys must match (lowercased, trimmed) mesh names exported in your GLB file.
// Run the app, open the console and look for the logged mesh names after load.
const BUILDING_DATA = {
  "masawa_building": {
    name: "Masawa Building", type: "Academic Building", emoji: "🏫",
    desc: "Home to several academic departments offering undergraduate and graduate programs.",
    depts: [
      { icon: "📐", name: "College of Engineering", sub: "Floors 1–3" },
      { icon: "💻", name: "Dept. of Computer Science", sub: "Floor 2" },
    ],
    contact: { phone: "(000) 000-0001", email: "masawa@csu.edu.ph" }
  },
  "hinang_building": {
    name: "Hinang Building", type: "Academic Building", emoji: "🏛",
    desc: "Dedicated to the College of Arts and Sciences with modern lecture halls.",
    depts: [
      { icon: "🎨", name: "College of Arts & Sciences", sub: "All Floors" },
      { icon: "📖", name: "Dept. of Humanities", sub: "Floor 1" },
    ],
    contact: { phone: "(000) 000-0002", email: "hinang@csu.edu.ph" }
  },
  "kinaadman_hall": {
    name: "Kinaadman Hall", type: "Academic Hall", emoji: "🎓",
    desc: "Main academic hall for knowledge and learning. Houses the university library annex and research offices.",
    depts: [
      { icon: "📚", name: "Library Annex", sub: "Ground Floor" },
      { icon: "🔬", name: "Research & Development Office", sub: "Floor 2" },
    ],
    contact: { phone: "(000) 000-0003", email: "kinaadman@csu.edu.ph" }
  },
  "hiraya_building": {
    name: "Hiraya Building", type: "Academic Building", emoji: "🌟",
    desc: "Dedicated to creative and performing arts with studios, rehearsal rooms, and exhibition spaces.",
    depts: [
      { icon: "🎭", name: "College of Fine Arts", sub: "Floors 1–2" },
      { icon: "🎵", name: "Music Department", sub: "Floor 3" },
    ],
    contact: { phone: "(000) 000-0004", email: "hiraya@csu.edu.ph" }
  },
  "batok_hall": {
    name: "Batok Hall", type: "Multi-Purpose Hall", emoji: "🏟",
    desc: "A large multi-purpose venue for convocations, university events, and assemblies.",
    depts: [
      { icon: "🏢", name: "Events & Facilities Office", sub: "Ground Floor" },
      { icon: "🎤", name: "University Auditorium", sub: "Main Hall" },
    ],
    contact: { phone: "(000) 000-0005", email: "batokevents@csu.edu.ph" }
  },
  "new_administrative_bldg": {
    name: "New Admin Building", type: "Administration", emoji: "🏢",
    desc: "Central hub for all administrative services including registrar, finance, and student affairs.",
    depts: [
      { icon: "📋", name: "Registrar's Office", sub: "Ground Floor" },
      { icon: "💰", name: "Finance & Accounting", sub: "Floor 2" },
      { icon: "👥", name: "Student Affairs Office", sub: "Floor 3" },
      { icon: "🎓", name: "Office of the President", sub: "Floor 4" },
    ],
    contact: { phone: "(000) 000-0006", email: "admin@csu.edu.ph" }
  },
};

// ── State ─────────────────────────────────────────────────────────────────────
let experience = null;   // Three.js Experience singleton
let worldReady = false;  // true once GLB is loaded & meshes indexed

const meshIndex = {};       // lowercased mesh name → THREE.Mesh
const pinList = [];       // { key, worldPos, el }
const _projVec = new THREE.Vector3();
const _box = new THREE.Box3();

let activeKey = null;
let activeMesh = null;

// ── Open / Close overlay ──────────────────────────────────────────────────────

export function openMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  }));

  // If the model is still loading when the user opens the map, show the preloader
  if (!worldReady) {
    const preloader = document.getElementById('tikad-preloader');
    if (preloader) {
      preloader.classList.remove('hidden');
      preloader.style.opacity = '1';
    }
  }
}

export function closeMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  document.body.style.overflow = '';
  setTimeout(() => { overlay.style.display = 'none'; }, 400);
  _closePanel();
}

// ── Three.js bootstrap ────────────────────────────────────────────────────────

function _bootExperience() {
  const canvas = document.querySelector('.experience-canvas');
  if (!canvas) return;

  experience = new Experience(canvas);

  // Preloader progress
  const progEl = document.getElementById('loading-progress');
  if (experience.resources && progEl) {
    experience.resources.loadingManager?.onProgress?.( // fallback — Resources class emits ready
      (url, loaded, total) => {
        progEl.textContent = Math.round((loaded / total) * 100);
      }
    );
  }

  experience.world.on('worldready', () => {
    worldReady = true;

    // Hide preloader
    const preloader = document.getElementById('tikad-preloader');
    if (preloader) {
      preloader.style.transition = 'opacity 0.6s ease';
      preloader.style.opacity = '0';
      setTimeout(() => preloader.classList.add('hidden'), 700);
    }

    // Index all meshes from the GLB
    experience.scene.traverse((node) => {
      if (!node.isMesh) return;
      const key = node.name.toLowerCase().trim();
      meshIndex[key] = node;
      if (node.material) node.userData.origMat = node.material.clone();
    });
    console.log(`✅ ${Object.keys(meshIndex).length} meshes loaded:`, Object.keys(meshIndex));
    window._meshes = meshIndex; // debug helper

    _buildChips();
    _createPins();

    // Pin position update every frame
    experience.time.on('update', _updatePins);
  });
}

// ── Quick-select chips (bottom bar) ──────────────────────────────────────────

function _buildChips() {
  const bar = document.getElementById('map-chips-bar');
  if (!bar) return;
  bar.innerHTML = '';
  Object.entries(BUILDING_DATA).forEach(([key, data]) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = `${data.emoji} ${data.name.split(' ')[0]}`;
    btn.title = data.name;
    btn.style.cssText = 'pointer-events:all;font-size:12px;padding:6px 14px;';
    btn.addEventListener('click', () => {
      _selectBuilding(key, true);
      // sync search input
      const input = document.getElementById('map-search');
      if (input) input.value = data.name;
    });
    bar.appendChild(btn);
  });
}

// ── Building selection & highlight ───────────────────────────────────────────

function _selectBuilding(key, openPanel = true) {
  _resetHighlight();
  activeKey = key;

  // Fuzzy-find mesh (exact → partial)
  const mesh = meshIndex[key]
    ?? Object.entries(meshIndex).find(([k]) => k.includes(key) || key.includes(k))?.[1];

  if (mesh) {
    activeMesh = mesh;
    const mat = mesh.material.clone();
    if (mat.color) mat.color.setHex(0xffff00);
    if (mat.emissive) { mat.emissive.setHex(0xffff00); mat.emissiveIntensity = 1.2; }
    mesh.material = mat;
  } else {
    console.warn(`No mesh found for "${key}". Available keys:`, Object.keys(meshIndex));
  }

  // Highlight active chip
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => {
    b.classList.toggle('active-cat', b.title === BUILDING_DATA[key]?.name);
  });

  if (openPanel) _openPanel(key);
}

function _resetHighlight() {
  if (activeMesh) {
    const orig = activeMesh.userData.origMat;
    if (orig) activeMesh.material = orig.clone();
    activeMesh = null;
  }
  activeKey = null;
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => b.classList.remove('active-cat'));
}

// ── Info panel ────────────────────────────────────────────────────────────────

function _openPanel(key) {
  const data = BUILDING_DATA[key];
  if (!data) return;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set('panel-icon', data.emoji);
  set('panel-img-icon', data.emoji);
  set('panel-name', data.name);
  set('panel-type', data.type);
  set('panel-desc', data.desc);

  // Departments list
  const deptsWrap = document.getElementById('panel-depts-wrap');
  const deptsList = document.getElementById('panel-depts');
  if (deptsWrap && deptsList && data.depts?.length) {
    deptsList.innerHTML = data.depts.map(d => `
      <li class="panel-facility-item">
        <span class="panel-facility-check">${d.icon || '🏢'}</span>
        <span><strong>${d.name}</strong>${d.sub ? ` · ${d.sub}` : ''}</span>
      </li>`).join('');
    deptsWrap.style.display = '';
  } else if (deptsWrap) {
    deptsWrap.style.display = 'none';
  }

  // Contact
  const contactWrap = document.getElementById('panel-contact-wrap');
  const contactContent = document.getElementById('panel-contact');
  if (contactWrap && contactContent && data.contact) {
    contactContent.innerHTML =
      (data.contact.phone ? `📞 ${data.contact.phone}<br>` : '') +
      (data.contact.email ? `✉️ ${data.contact.email}` : '');
    contactWrap.style.display = '';
  } else if (contactWrap) {
    contactWrap.style.display = 'none';
  }

  // Show panel (uses existing TIKAD #info-panel CSS)
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.classList.remove('panel-hidden');
    panel.style.display = 'block';
  }
}

function _closePanel() {
  _resetHighlight();
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.classList.add('panel-hidden');
    setTimeout(() => { panel.style.display = 'none'; }, 350);
  }
  pinList.forEach(p => p.el.classList.remove('active-pin'));
  const input = document.getElementById('map-search');
  if (input) input.value = '';
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => b.classList.remove('active-cat'));
}

// ── 3D Pin markers ────────────────────────────────────────────────────────────

function _createPins() {
  const container = document.getElementById('mapPins');
  if (!container) return;
  container.innerHTML = '';
  pinList.length = 0;

  Object.entries(BUILDING_DATA).forEach(([key, data]) => {
    const mesh = meshIndex[key]
      ?? Object.entries(meshIndex).find(([k]) => k.includes(key) || key.includes(k))?.[1];

    const worldPos = new THREE.Vector3();
    if (mesh) { _box.setFromObject(mesh); _box.getCenter(worldPos); }

    const el = document.createElement('div');
    el.className = 'bldg-pin';
    el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);cursor:pointer;pointer-events:all;text-align:center;z-index:5;';
    el.innerHTML = `
      <div class="pin-ring"></div>
      <div class="pin-dot"></div>
      <div class="pin-label">${data.emoji} ${data.name.split(' ')[0]}</div>
    `;

    el.addEventListener('click', () => {
      pinList.forEach(p => p.el.querySelector('.pin-dot')?.classList.remove('active-pin'));
      el.querySelector('.pin-dot')?.classList.add('active-pin');
      const input = document.getElementById('map-search');
      if (input) input.value = data.name;
      _selectBuilding(key, true);
    });

    container.appendChild(el);
    pinList.push({ key, worldPos, el });
  });
}

function _updatePins() {
  if (!experience || !worldReady) return;
  const cam = experience.camera.orthographicCamera;
  const W = experience.sizes.width;
  const H = experience.sizes.height;

  pinList.forEach(({ worldPos, el }) => {
    _projVec.copy(worldPos).project(cam);
    if (_projVec.z > 1) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    el.style.left = ((_projVec.x * 0.5 + 0.5) * W) + 'px';
    el.style.top = ((_projVec.y * -0.5 + 0.5) * H) + 'px';
  });
}

// ── Search (wired to existing #map-search input) ──────────────────────────────

function _handleSearch(query) {
  if (!query.trim()) return;
  const key = Object.keys(BUILDING_DATA).find(k =>
    k.includes(query.toLowerCase()) ||
    BUILDING_DATA[k].name.toLowerCase().includes(query.toLowerCase())
  );
  if (key) {
    _selectBuilding(key, true);
  } else {
    const dd = document.getElementById('search-dropdown');
    if (dd) { dd.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#6b7280;">No buildings found</div>'; dd.style.display = 'block'; }
  }
}

function _buildDropdown(query) {
  const dd = document.getElementById('search-dropdown');
  if (!dd) return;
  if (!query.trim()) { dd.style.display = 'none'; return; }

  const matches = Object.entries(BUILDING_DATA).filter(([k, b]) =>
    k.includes(query.toLowerCase()) || b.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!matches.length) { dd.style.display = 'none'; return; }

  dd.innerHTML = matches.map(([key, b]) => `
    <div
      data-key="${key}"
      style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#1a1a2e;"
      onmouseover="this.style.background='#e6ffe6'"
      onmouseout="this.style.background='#fff'"
    >
      ${b.emoji} ${b.name}
      <span style="margin-left:auto;font-size:11px;color:#9ca3af;">${b.type}</span>
    </div>`).join('');

  // click handler per result
  dd.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.key;
      const input = document.getElementById('map-search');
      if (input) input.value = BUILDING_DATA[k].name;
      dd.style.display = 'none';
      _selectBuilding(k, true);
    });
  });

  dd.style.display = 'block';
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initMapOverlay() {
  // Expose for inline onclick in HTML
  window.openMapOverlay = openMapOverlay;
  window.closeMapOverlay = closeMapOverlay;

  // Bind launch buttons
  const launchIds = ['nav-launch-map', 'hero-explore-map', 'cta-explore-map'];
  launchIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        openMapOverlay();
      });
    }
  });

  // Bind close button
  const mapCloseBtn = document.getElementById('map-close-btn');
  if (mapCloseBtn) {
    mapCloseBtn.addEventListener('click', e => {
      e.preventDefault();
      closeMapOverlay();
    });
  }

  // Escape closes overlay
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMapOverlay(); });

  // Search input
  const searchInput = document.getElementById('map-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => _buildDropdown(e.target.value));
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        _handleSearch(e.target.value);
        const dd = document.getElementById('search-dropdown');
        if (dd) dd.style.display = 'none';
      }
    });
  }

  // Close search dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#map-search') && !e.target.closest('#search-dropdown')) {
      const dd = document.getElementById('search-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  // Close panel button (now has id instead of onclick)
  const closeBtn = document.getElementById('panel-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', _closePanel);

  // View toggle (2D / 3D) event listeners
  const btn2D = document.getElementById('view-toggle-2d');
  const btn3D = document.getElementById('view-toggle-3d');
  if (btn2D && btn3D) {
    btn2D.addEventListener('click', () => {
      if (experience && experience.controls) {
        experience.controls.setViewMode('2D');
      }
    });
    btn3D.addEventListener('click', () => {
      if (experience && experience.controls) {
        experience.controls.setViewMode('3D');
      }
    });
  }

  // Keep old global for any stray references
  window.closePanel = _closePanel;
  window.showBuilding = () => { };   // no-op (old static fn)
  window.filterBuildings = q => _buildDropdown(q);

  // Hide panel initially
  const panel = document.getElementById('info-panel');
  if (panel) panel.style.display = 'none';

  // Boot the 3D Experience in the background immediately on page load
  _bootExperience();
}

