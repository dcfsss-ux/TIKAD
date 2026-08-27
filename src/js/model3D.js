/**
 * model3D.js – Holographic 3D Campus Showcase
 *
 * Renders a floating holographic 3D building display over the hero section.
 * No card/panel — the model floats weightlessly with emitter rings, scanline,
 * rising particles, and independently-bobbing glassmorphism UI chips.
 *
 * Auto-cycles through 15 campus buildings with 6.5s display after load.
 * Respects prefers-reduced-motion.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { fetchBuildingSeals } from './supabaseClient.js';

const PREVIEW_MODELS = [
  { key: 'admin', name: 'Admin Building', category: 'Administration', icon: '/images/logo ccis.jpg', path: '/models/textured-admin-building.draco.glb', aliases: ['admin', 'new administration building', 'new admin building', 'administration', 'admin building'] },
  { key: 'old-admin', name: 'Old Admin', category: 'Administrative Offices', icon: '/images/logo ccis.jpg', path: '/models/map/old admin -.glb', aliases: ['old admin', 'old administration building', 'old administration', 'old admin building'] },
  { key: 'library', name: 'State Library', category: 'Learning & Resource Hub', icon: '/images/logo ccis.jpg', path: '/models/textured-library.draco.glb', aliases: ['library', 'state-of-the-art library', 'state library'] },
  { key: 'masawa', name: 'Masawa Hall', category: 'College of Computing (CCIS)', icon: '/images/logo ccis.jpg', path: '/models/map/masawa building.glb', aliases: ['masawa', 'masawa hall', 'masawa building'] },
  { key: 'hinang', name: 'Hinang Building', category: 'College of Engineering (CEGS)', icon: '/images/logo cegs.jpg', path: '/models/hinang.draco.glb', aliases: ['hinang', 'hinang building'] },
  { key: 'hiraya', name: 'Hiraya Building', category: 'Agriculture & Fisheries', icon: '/images/logo ccis.jpg', path: '/models/hiraya.draco.glb', aliases: ['hiraya', 'hiraya building'] },
  { key: 'kinaadman', name: 'Kinaadman Hall', category: 'College of Humanities (CHASS)', icon: '/images/logo chass.jpg', path: '/models/kinaadman.draco.glb', aliases: ['kinaadman', 'kinaadman hall'] },
  { key: 'batok', name: 'Batok Hall', category: 'Multi-Purpose Auditorium', icon: '/images/logo chass.jpg', path: '/models/nsb-batok.draco.glb', aliases: ['batok', 'batok hall', 'nsb batok'] },
  { key: 'ced', name: 'CED Building', category: 'College of Education', icon: '/images/logo cegs.jpg', path: '/models/map/CED -.glb', aliases: ['ced', 'ced building', 'iwag', 'iwag building', 'college of education'] },
  { key: 'ched-lgu', name: 'CHED-LGU', category: 'Regional Development Center', icon: 'https://zgzwcxmsewzcyegauilf.supabase.co/storage/v1/object/public/giya_assets/college_logos/CHED.png', path: '/models/map/ched_lgu -.glb', aliases: ['ched', 'ched-lgu', 'ched-lgu building', 'ched lgu'] },
  { key: 'dost', name: 'DOST Center', category: 'Research & Technology Center', icon: '/images/logo ccis.jpg', path: '/models/map/DOST -.glb', aliases: ['dost', 'dost building', 'dost center'] },
  { key: 'villares', name: 'Villares Center', category: 'Academic & Training Center', icon: '/images/logo cegs.jpg', path: '/models/map/Villares Center.glb', aliases: ['villares', 'villares center', 'villares building'] },
  { key: 'gymnasium', name: 'Gymnasium', category: 'Sports & Recreation Center', icon: '/images/logo chass.jpg', path: '/models/textured-gym-building.draco.glb', aliases: ['gymnasium', 'gym', 'university gymnasium', 'university gym'] },
  { key: 'kalinaw', name: 'Kalinaw Hall', category: 'Executive Seminar Center', icon: '/images/logo chass.jpg', path: '/models/map/KALINAW.glb', aliases: ['kalinaw', 'kalinaw hall'] },
  { key: 'caa', name: 'CAA Building', category: 'Agriculture & Forestry', icon: '/images/logo cegs.jpg', path: '/models/map/CAA Building.glb', aliases: ['caa', 'caa building', 'caa complex'] },
];

const AUTO_ROTATE_INTERVAL_MS = 6500;

let _scene, _camera, _renderer, _controls, _animId;
let _currentModelGroup = null;
let _dracoLoader, _ktx2Loader, _gltfLoader;
let _currentIndex = 0;
let _autoTimer = null;
let _isHovered = false;
let _isLoadingModel = false;
const _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initModel3D() {
  const container = document.getElementById('model-3d-container');
  if (!container) return;

  // Clear any leftover children
  container.innerHTML = '';

  // ── Build holographic stage ──────────────────────────────────────────────

  // Canvas (3D scene)
  const canvas = document.createElement('canvas');
  canvas.id = 'hero-3d-canvas';
  container.appendChild(canvas);

  // Emitter ring (static glow ring)
  const emitterRing = document.createElement('div');
  emitterRing.className = 'holo-emitter-ring';
  container.appendChild(emitterRing);

  // Pulse ring (sonar ping animation)
  const pulseRing = document.createElement('div');
  pulseRing.className = 'holo-pulse-ring';
  container.appendChild(pulseRing);

  // Ground glow (soft radial)
  const groundGlow = document.createElement('div');
  groundGlow.className = 'holo-ground-glow';
  container.appendChild(groundGlow);

  // Scanline
  const scanline = document.createElement('div');
  scanline.className = 'holo-scanline';
  container.appendChild(scanline);

  // Rising particles (CSU palette: Green #009900, Gold Yellow #f9dc07, Orange #ff9900)
  const csuColors = ['#f9dc07', '#009900', '#ff9900', '#f9dc07'];
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'holo-particle';
    p.style.left = `${20 + Math.random() * 60}%`;
    p.style.animationDelay = `${(Math.random() * 4).toFixed(1)}s`;
    p.style.animationDuration = `${3 + Math.random() * 2.5}s`;
    const c = csuColors[i % csuColors.length];
    p.style.backgroundColor = c;
    p.style.boxShadow = `0 0 8px 1px ${c}`;
    container.appendChild(p);
  }

  // Loader overlay
  const loader = document.createElement('div');
  loader.className = 'hero-3d-loader';
  loader.id = 'hero-3d-loader';
  loader.innerHTML = `<div class="hero-3d-spinner"></div><span class="hero-3d-loader-text">Loading 3D Model...</span>`;
  container.appendChild(loader);

  // ── Floating UI (Google Maps-Style Pin Marker) ──────────────────────────
  const heroVisual = container.parentElement; // .hero-visual

  // Google Maps-style Pin Container above model
  const pinContainer = document.createElement('div');
  pinContainer.className = 'holo-pin-container';
  pinContainer.id = 'holo-pin-container';
  pinContainer.innerHTML = `
    <div class="holo-pin-text-block">
      <div class="holo-pin-title" id="holo-pin-title">${PREVIEW_MODELS[0].name}</div>
      <div class="holo-pin-sub" id="holo-pin-sub">${PREVIEW_MODELS[0].category}</div>
      <div class="holo-pin-counter" id="holo-pin-counter">1 / ${PREVIEW_MODELS.length}</div>
    </div>
    <div class="holo-pin-marker-wrap">
      <div class="holo-pin-badge">
        <img src="${PREVIEW_MODELS[0].icon}" alt="${PREVIEW_MODELS[0].name} Logo" class="holo-pin-logo" id="holo-pin-logo" />
      </div>
      <div class="holo-pin-stem"></div>
      <div class="holo-pin-dot"></div>
    </div>
  `;
  heroVisual.appendChild(pinContainer);

  // Circular Nav Button: Previous (Left)
  const prevBtn = document.createElement('button');
  prevBtn.className = 'holo-nav-btn holo-nav-prev';
  prevBtn.id = 'holo-nav-prev';
  prevBtn.setAttribute('aria-label', 'Previous Building');
  prevBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  heroVisual.appendChild(prevBtn);

  // Circular Nav Button: Next (Right)
  const nextBtn = document.createElement('button');
  nextBtn.className = 'holo-nav-btn holo-nav-next';
  nextBtn.id = 'holo-nav-next';
  nextBtn.setAttribute('aria-label', 'Next Building');
  nextBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  heroVisual.appendChild(nextBtn);

  // Chip: Dot navigation
  const dotsChip = document.createElement('div');
  dotsChip.className = 'holo-chip holo-chip-dots';
  dotsChip.id = 'holo-dots-chip';
  dotsChip.innerHTML = PREVIEW_MODELS.map((m, idx) =>
    `<button class="holo-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" title="${m.name}"></button>`
  ).join('');
  heroVisual.appendChild(dotsChip);

  // ── Wire events ──────────────────────────────────────────────────────────

  // Prev / Next button click handlers (manual navigation)
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const prevIdx = (_currentIndex - 1 + PREVIEW_MODELS.length) % PREVIEW_MODELS.length;
    _selectBuildingIndex(prevIdx);
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextIdx = (_currentIndex + 1) % PREVIEW_MODELS.length;
    _selectBuildingIndex(nextIdx);
  });

  // Dot click → manual navigation
  dotsChip.querySelectorAll('.holo-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(dot.dataset.index, 10);
      if (!isNaN(idx)) _selectBuildingIndex(idx);
    });
  });

  // ── Boot Three.js ────────────────────────────────────────────────────────
  _initThreeScene(container, canvas);
  _selectBuildingIndex(0);
  _syncSupabaseLogos();
}

// ── Supabase Logo Synchronization ──────────────────────────────────────────

async function _syncSupabaseLogos() {
  try {
    const buildings = await fetchBuildingSeals();
    if (!buildings || buildings.length === 0) return;

    console.log('[Model3D] Loaded Supabase buildings for logos:', buildings);

    PREVIEW_MODELS.forEach(m => {
      const found = buildings.find(b => {
        const dbNameClean = (b.name || b.Building_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!dbNameClean) return false;

        return m.aliases.some(alias => {
          const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
          return dbNameClean === aliasClean || dbNameClean.includes(aliasClean) || aliasClean.includes(dbNameClean);
        });
      });

      if (found && found.Logo_URL) {
        console.log(`[Model3D] ✅ Synced Supabase logo for "${m.name}":`, found.Logo_URL);
        m.icon = found.Logo_URL;
        if (PREVIEW_MODELS[_currentIndex].key === m.key) {
          const pinLogo = document.getElementById('holo-pin-logo');
          if (pinLogo) pinLogo.src = found.Logo_URL;
        }
      }
    });
    console.log('[Model3D] ✅ Synced building logos from Supabase');
  } catch (err) {
    console.warn('[Model3D] Could not fetch building logos from Supabase:', err);
  }
}

// ── Showcase Logic ──────────────────────────────────────────────────────────

function _selectBuildingIndex(index) {
  _currentIndex = index;
  const model = PREVIEW_MODELS[index];

  // Update dots
  const dotsChip = document.getElementById('holo-dots-chip');
  if (dotsChip) {
    dotsChip.querySelectorAll('.holo-dot').forEach((d, i) => {
      d.classList.toggle('active', i === index);
    });
  }

  // Fade & update pin label
  const pinContainer = document.getElementById('holo-pin-container');
  const pinTitle = document.getElementById('holo-pin-title');
  const pinSub = document.getElementById('holo-pin-sub');
  const pinCounter = document.getElementById('holo-pin-counter');
  const pinLogo = document.getElementById('holo-pin-logo');

  if (pinContainer) {
    pinContainer.style.opacity = '0';
    pinContainer.style.transform = 'translateX(-50%) translateY(-6px)';
    setTimeout(() => {
      if (pinTitle) pinTitle.textContent = model.name;
      if (pinSub) pinSub.textContent = model.category;
      if (pinCounter) pinCounter.textContent = `${index + 1} / ${PREVIEW_MODELS.length}`;
      if (pinLogo) {
        pinLogo.src = model.icon;
        pinLogo.alt = `${model.name} Logo`;
      }
      pinContainer.style.opacity = '1';
      pinContainer.style.transform = 'translateX(-50%)';
    }, 180);
  }

  _loadModel(model.path);
}

// ── Three.js Setup ──────────────────────────────────────────────────────────

function _initThreeScene(container, canvas) {
  const w = container.clientWidth || 400;
  const h = container.clientHeight || 400;

  _scene = new THREE.Scene();

  _camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000);
  _camera.position.set(30, 22, 35);

  _renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  _renderer.setSize(w, h);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.setClearColor(0x000000, 0); // fully transparent background
  if ('outputColorSpace' in _renderer) _renderer.outputColorSpace = THREE.SRGBColorSpace;

  _controls = new OrbitControls(_camera, canvas);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.05;
  _controls.autoRotate = true;
  _controls.autoRotateSpeed = _prefersReducedMotion ? 0 : 1.1;
  _controls.maxPolarAngle = Math.PI / 2.1;
  _controls.minDistance = 5;
  _controls.maxDistance = 200;
  _controls.enablePan = false;

  // Lighting: soft ambient + warm sun + CSU green fill + CSU gold yellow point light
  _scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const sun = new THREE.DirectionalLight(0xfffaed, 1.6);
  sun.position.set(40, 60, 30);
  _scene.add(sun);
  const fill = new THREE.DirectionalLight(0x009900, 0.45); // CSU Green
  fill.position.set(-30, 20, -30);
  _scene.add(fill);
  const gold = new THREE.PointLight(0xf9dc07, 0.8, 80); // CSU Gold Yellow
  gold.position.set(0, 25, 0);
  _scene.add(gold);

  _dracoLoader = new DRACOLoader();
  _dracoLoader.setDecoderPath('/draco/');

  _ktx2Loader = new KTX2Loader();
  _ktx2Loader.setTranscoderPath('/basis/');
  _ktx2Loader.detectSupport(_renderer);

  _gltfLoader = new GLTFLoader();
  _gltfLoader.setDRACOLoader(_dracoLoader);
  _gltfLoader.setKTX2Loader(_ktx2Loader);

  const ro = new ResizeObserver(() => {
    if (!_renderer || !_camera) return;
    const nw = container.clientWidth, nh = container.clientHeight;
    if (nw > 0 && nh > 0) {
      _camera.aspect = nw / nh;
      _camera.updateProjectionMatrix();
      _renderer.setSize(nw, nh);
    }
  });
  ro.observe(container);

  (function animate() {
    _animId = requestAnimationFrame(animate);
    if (_controls) _controls.update();
    if (_renderer && _scene && _camera) _renderer.render(_scene, _camera);
  })();
}

function _loadModel(path) {
  const loaderEl = document.getElementById('hero-3d-loader');
  if (loaderEl) loaderEl.classList.add('visible');
  _isLoadingModel = true;

  // Fade canvas during transition
  if (_renderer?.domElement) _renderer.domElement.style.opacity = '0.25';

  // Dispose previous model
  if (_currentModelGroup) {
    _scene.remove(_currentModelGroup);
    _currentModelGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
      }
    });
    _currentModelGroup = null;
  }

  _gltfLoader.load(path, (gltf) => {
    _currentModelGroup = gltf.scene;

    const box = new THREE.Box3().setFromObject(_currentModelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 10;

    _currentModelGroup.position.set(-center.x, -box.min.y, -center.z);
    _scene.add(_currentModelGroup);

    const fitDist = maxDim * 1.5;
    _camera.position.set(fitDist * 0.8, fitDist * 0.6, fitDist * 0.8);
    _controls.target.set(0, size.y * 0.35, 0);
    _controls.update();

    if (_renderer?.domElement) _renderer.domElement.style.opacity = '1';
    if (loaderEl) loaderEl.classList.remove('visible');

    _isLoadingModel = false;
    _scheduleNextAutoRotate();
  }, undefined, (err) => {
    console.warn('Hero 3D load error:', err);
    if (_renderer?.domElement) _renderer.domElement.style.opacity = '1';
    if (loaderEl) loaderEl.classList.remove('visible');
    _isLoadingModel = false;
    _scheduleNextAutoRotate();
  });
}
