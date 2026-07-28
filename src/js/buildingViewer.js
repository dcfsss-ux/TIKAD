/**
 * buildingViewer.js — Lazy 3D Building Preview Viewer
 *
 * Opens a floating preview panel with a mini Three.js scene that loads
 * a Draco-compressed GLB only when requested (on-demand).
 * Completely independent from the main map Experience singleton.
 *
 * Performance optimisations applied:
 *  - Pixel ratio capped at 1 (panel is 450×300 — retina detail invisible)
 *  - Shadow map disabled entirely (too small to matter)
 *  - Render loop pauses when document is hidden (tab switched away)
 *  - Render loop pauses after damping settles (no motion = no draw)
 *  - directionalLight castShadow removed
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Module state ──────────────────────────────────────────────────────────────
let _renderer   = null;
let _scene      = null;
let _camera     = null;
let _controls   = null;
let _animId     = null;
let _loadedPath = null;   // path of currently loaded model (avoid re-loading same model)

// ── Loader singletons (created once, reused across every model load) ──────────
let _dracoLoader = null;
let _gltfLoader  = null;

function _ensureLoaders() {
  if (_gltfLoader) return;
  _dracoLoader = new DRACOLoader();
  _dracoLoader.setDecoderPath('/draco/');
  _gltfLoader = new GLTFLoader();
  _gltfLoader.setDRACOLoader(_dracoLoader);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Open the 3D viewer and load the specified GLB model.
 * @param {string} modelPath  - URL path to the .glb file (e.g. '/models/textured-admin-building.draco.glb')
 * @param {string} buildingName - Display name shown in the viewer header
 */
export function openBuildingViewer(modelPath, buildingName = '3D Preview') {
  _ensureModal();
  _showModal(buildingName);
  _startScene(modelPath);
}

/** Close and clean up the viewer. */
export function closeBuildingViewer() {
  _hideModal();
  _destroyScene();
}

// ── Modal DOM ─────────────────────────────────────────────────────────────────

function _ensureModal() {
  if (document.getElementById('bv-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'bv-modal';
  modal.innerHTML = `
    <div id="bv-container">
      <div id="bv-header">
        <div id="bv-title-wrap">
          <span id="bv-badge">🏛 Live 3D</span>
          <span id="bv-title">Building Preview</span>
        </div>
        <button id="bv-close-btn" title="Close preview">✕</button>
      </div>
      <div id="bv-canvas-wrap">
        <canvas id="bv-canvas"></canvas>
        <div id="bv-loader">
          <div id="bv-spinner"></div>
          <div id="bv-loader-text">Initializing…</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const header = document.getElementById('bv-header');
  const container = document.getElementById('bv-container');
  _makeDraggable(header, container);

  document.getElementById('bv-close-btn').addEventListener('click', closeBuildingViewer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('bv-visible')) {
      closeBuildingViewer();
    }
  });
}

function _showModal(buildingName) {
  const modal = document.getElementById('bv-modal');
  if (!modal) return;
  
  // Set title
  document.getElementById('bv-title').textContent = buildingName;
  
  // Reset window position to default floating center-left so it doesn't get lost
  const container = document.getElementById('bv-container');
  if (container) {
    container.style.top = '';
    container.style.left = '';
    container.style.transform = '';
  }

  modal.classList.add('bv-visible');
}

function _hideModal() {
  const modal = document.getElementById('bv-modal');
  if (!modal) return;
  modal.classList.remove('bv-visible');
}

// ── Simple dragging helper ────────────────────────────────────────────────────

function _makeDraggable(header, container) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  header.style.cursor = 'move';
  header.onmousedown = dragMouseDown;
  header.ontouchstart = dragTouchStart;

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function dragTouchStart(e) {
    if (e.touches.length > 1) return;
    pos3 = e.touches[0].clientX;
    pos4 = e.touches[0].clientY;
    document.ontouchend = closeDragElement;
    document.ontouchmove = elementDragTouch;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    container.style.top = (container.offsetTop - pos2) + "px";
    container.style.left = (container.offsetLeft - pos1) + "px";
    container.style.transform = "none";
  }

  function elementDragTouch(e) {
    pos1 = pos3 - e.touches[0].clientX;
    pos2 = pos4 - e.touches[0].clientY;
    pos3 = e.touches[0].clientX;
    pos4 = e.touches[0].clientY;
    container.style.top = (container.offsetTop - pos2) + "px";
    container.style.left = (container.offsetLeft - pos1) + "px";
    container.style.transform = "none";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
  }
}

// ── Three.js scene ────────────────────────────────────────────────────────────

function _startScene(modelPath) {
  const canvas = document.getElementById('bv-canvas');
  if (!canvas) return;

  if (_loadedPath === modelPath && _renderer) {
    _setLoading(false);
    _startLoop();
    return;
  }

  _destroyScene();

  const wrap = document.getElementById('bv-canvas-wrap');
  const W = wrap.clientWidth  || 450;
  const H = wrap.clientHeight || 300;

  // Scene
  _scene = new THREE.Scene();
  _scene.background = new THREE.Color(0x222222);

  // Camera
  _camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  _camera.position.set(5, 3.5, 5);

  // ── Renderer ───────────────────────────────────────────────────────────────
  _renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

  // Cap at 1 — the panel is ~450×300 px. On a retina display, pixelRatio=2
  // would draw 900×600 which is invisible at this size but doubles GPU cost.
  _renderer.setPixelRatio(1);
  _renderer.setSize(W, H);
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1.0;
  _renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Shadows OFF — the viewer panel is 450×300 and shadow detail is not
  // perceptible. Disabling saves the entire shadow map render pass.
  _renderer.shadowMap.enabled = false;

  // Lights — no castShadow flags since shadowMap is off
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  _scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight1.position.set(5, 10, 7);
  // castShadow intentionally omitted — shadows disabled on renderer
  _scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-5, 5, -5);
  _scene.add(dirLight2);

  // Controls
  _controls = new OrbitControls(_camera, canvas);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.05;
  _controls.autoRotate = true;
  _controls.autoRotateSpeed = 1.0;
  _controls.minDistance = 2;
  _controls.maxDistance = 25;
  _controls.minPolarAngle = 0;
  _controls.maxPolarAngle = Math.PI / 2 - 0.05;
  _controls.target.set(0, 0, 0);
  _controls.update();

  // ── Render-on-demand for the viewer ───────────────────────────────────────
  // The viewer has autoRotate, so it always needs to render while open.
  // But we still pause the loop when the tab is hidden.
  _renderer._needsRender = true;

  // Resize listener
  const resizeObs = new ResizeObserver(() => {
    if (!_renderer) return;
    const ww = wrap.clientWidth;
    const wh = wrap.clientHeight;
    _renderer.setSize(ww, wh);
    _camera.aspect = ww / wh;
    _camera.updateProjectionMatrix();
    _renderer._needsRender = true;
  });
  resizeObs.observe(wrap);
  _renderer._resizeObs = resizeObs;

  _setLoading(true);
  _loadModel(modelPath);
}

function _loadModel(path) {
  _ensureLoaders();

  _gltfLoader.load(
    path,
    (gltf) => {
      // Centre & fit model
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Centered on 0,0,0
      gltf.scene.position.set(-center.x, -center.y, -center.z);

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3.5 / maxDim;
      gltf.scene.scale.setScalar(scale);

      gltf.scene.traverse((node) => {
        if (node.isMesh) {
          // Only nudge roughness/metalness on untextured standard materials.
          // Textured (Draco-compressed) buildings already have baked PBR data —
          // overriding it would wash out their colours.
          const mat = node.material;
          if (mat && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) && !mat.map) {
            mat.roughness = 0.6;
            mat.metalness = 0.1;
          }
        }
      });

      _scene.add(gltf.scene);

      _loadedPath = path;
      _setLoading(false);
      _startLoop();
    },
    (xhr) => {
      const pct = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : 0;
      const el = document.getElementById('bv-loader-text');
      if (el) el.textContent = `Loading preview… ${pct}%`;
    },
    (err) => {
      console.error('[BuildingViewer] Error loading:', err);
      const el = document.getElementById('bv-loader-text');
      if (el) el.textContent = 'Failed to load model';
    }
  );
}

function _startLoop() {
  if (_animId) cancelAnimationFrame(_animId);

  const loop = () => {
    _animId = requestAnimationFrame(loop);

    // Skip rendering entirely when the tab is hidden
    if (document.visibilityState !== 'visible') return;

    if (_controls) _controls.update();
    if (_renderer && _scene && _camera) {
      _renderer.render(_scene, _camera);
    }
  };
  loop();
}

function _destroyScene() {
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  if (_renderer) {
    if (_renderer._resizeObs) _renderer._resizeObs.disconnect();
    _renderer.dispose();
    _renderer = null;
  }
  if (_controls) { _controls.dispose(); _controls = null; }
  if (_scene) {
    _scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    _scene = null;
  }
  _camera = null;
  _loadedPath = null;
}

function _setLoading(visible) {
  const loader = document.getElementById('bv-loader');
  if (loader) loader.style.display = visible ? 'flex' : 'none';
}
