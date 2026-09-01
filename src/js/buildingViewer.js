/**
 * buildingViewer.js — In-Map Blurred Backdrop 3D Viewer
 *
 * When "View 3D Model" is clicked, the map background blurs and the
 * 3D model floats in focus over it. No separate card/window —
 * everything stays in-context with futuristic holographic accents.
 *
 * Performance:
 *  - Pixel ratio capped at 1.5
 *  - Shadow map disabled
 *  - Render loop pauses when document is hidden
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Module state ──────────────────────────────────────────────────────────────
let _renderer   = null;
let _scene      = null;
let _camera     = null;
let _controls   = null;
let _animId     = null;
let _loadedPath = null;

// ── Loader singletons ────────────────────────────────────────────────────────
let _dracoLoader = null;
let _ktx2Loader  = null;
let _gltfLoader  = null;

function _ensureLoaders() {
  if (!_dracoLoader) {
    _dracoLoader = new DRACOLoader();
    _dracoLoader.setDecoderPath('/draco/');
  }

  if (!_ktx2Loader && _renderer) {
    _ktx2Loader = new KTX2Loader();
    _ktx2Loader.setTranscoderPath('/basis/');
    _ktx2Loader.detectSupport(_renderer);
  }

  if (!_gltfLoader) {
    _gltfLoader = new GLTFLoader();
    _gltfLoader.setDRACOLoader(_dracoLoader);
    if (_ktx2Loader) {
      _gltfLoader.setKTX2Loader(_ktx2Loader);
    }
  } else if (_ktx2Loader && !_gltfLoader.ktx2Loader) {
    _gltfLoader.setKTX2Loader(_ktx2Loader);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function openBuildingViewer(modelPath, buildingName = '3D Preview') {
  _ensureModal();
  _showModal(buildingName);
  _startScene(modelPath);
}

export function closeBuildingViewer() {
  _hideModal();
  _destroyScene();
}

// ── Modal DOM ─────────────────────────────────────────────────────────────────

function _ensureModal() {
  if (document.getElementById('bv-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'bv-modal';

  // Particle colors (CSU palette)
  const colors = ['#00ff66', '#009900', '#f9dc07', '#00cc44', '#ff9900', '#00ff66'];
  const particlesHtml = colors.map((c, i) => {
    const left = 10 + Math.random() * 80;
    const delay = (Math.random() * 4.5).toFixed(1);
    const dur = (3.5 + Math.random() * 2.5).toFixed(1);
    return `<div class="bv-particle" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;background:${c};box-shadow:0 0 6px 1px ${c}"></div>`;
  }).join('');

  modal.innerHTML = `
    <!-- Holographic ground accents -->
    ${particlesHtml}
    <div class="bv-scanline"></div>
    <div class="bv-emitter-ring"></div>
    <div class="bv-pulse-ring"></div>
    <div class="bv-ground-glow"></div>

    <!-- 3D Canvas (transparent, fills viewport) -->
    <div id="bv-canvas-wrap">
      <canvas id="bv-canvas"></canvas>
      <div id="bv-loader">
        <div id="bv-spinner"></div>
        <div id="bv-loader-text">LOADING MODEL…</div>
      </div>
    </div>

    <!-- Floating Top-Left Title Tag -->
    <div id="bv-floating-tag">
      <span id="bv-badge">3D MODEL</span>
      <span id="bv-title">Building Preview</span>
    </div>

    <!-- Floating Top-Right Close Button -->
    <button id="bv-close-btn" title="Close viewer (ESC)">✕</button>

    <!-- Floating Bottom Controls Hint -->
    <div id="bv-floating-hint">
      <span>Left drag — rotate</span>
      <span class="bv-hint-sep">•</span>
      <span>Right drag — move</span>
      <span class="bv-hint-sep">•</span>
      <span>Scroll — zoom</span>
    </div>
  `;

  const targetParent = document.getElementById('map-canvas-wrap') || document.body;
  targetParent.appendChild(modal);

  // Close button
  document.getElementById('bv-close-btn').addEventListener('click', closeBuildingViewer);

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('bv-visible')) {
      closeBuildingViewer();
    }
  });

  // Click on backdrop (outside canvas interaction) to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeBuildingViewer();
  });
}

function _showModal(buildingName) {
  const modal = document.getElementById('bv-modal');
  if (!modal) return;

  const titleEl = document.getElementById('bv-title');
  if (titleEl) titleEl.textContent = buildingName;

  modal.classList.add('bv-visible');
}

function _hideModal() {
  const modal = document.getElementById('bv-modal');
  if (!modal) return;
  modal.classList.remove('bv-visible');
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
  const W = wrap.clientWidth  || window.innerWidth;
  const H = wrap.clientHeight || window.innerHeight;

  // Scene — transparent so the blurred map shows through
  _scene = new THREE.Scene();

  // Camera — positioned so the model is fully framed with comfortable margins
  _camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 500);
  _camera.position.set(7.5, 4.5, 7.5);

  // Renderer — alpha: true for transparent background
  _renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  _renderer.setSize(W, H);
  _renderer.setClearColor(0x000000, 0);
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1.1;
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
  _renderer.shadowMap.enabled = false;

  // Lighting
  _scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const keyLight = new THREE.DirectionalLight(0xfffaed, 1.8);
  keyLight.position.set(8, 15, 10);
  _scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x009900, 0.3);
  fillLight.position.set(-10, 8, -10);
  _scene.add(fillLight);

  const goldLight = new THREE.PointLight(0xf9dc07, 0.45, 60);
  goldLight.position.set(0, -3, 0);
  _scene.add(goldLight);

  const rimLight = new THREE.DirectionalLight(0x00ff66, 0.2);
  rimLight.position.set(-5, 3, 8);
  _scene.add(rimLight);

  // Controls
  _controls = new OrbitControls(_camera, canvas);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.06;
  _controls.autoRotate = true;
  _controls.autoRotateSpeed = 0.8;
  _controls.minDistance = 3;
  _controls.maxDistance = 50;
  _controls.minPolarAngle = 0.1;
  _controls.maxPolarAngle = Math.PI / 2 - 0.05;
  _controls.enablePan = true;
  _controls.target.set(0, 0, 0);
  _controls.update();

  // Resize
  const resizeObs = new ResizeObserver(() => {
    if (!_renderer) return;
    const ww = wrap.clientWidth;
    const wh = wrap.clientHeight;
    if (ww > 0 && wh > 0) {
      _renderer.setSize(ww, wh);
      _camera.aspect = ww / wh;
      _camera.updateProjectionMatrix();
    }
  });
  resizeObs.observe(wrap);
  _renderer._resizeObs = resizeObs;

  _setLoading(true);
  _loadModel(modelPath);
}

function _loadModel(path) {
  _ensureLoaders();

  // Handle URL encoding if path contains raw spaces
  let loadPath = path;
  if (typeof loadPath === 'string' && loadPath.includes(' ') && !loadPath.includes('%20')) {
    loadPath = encodeURI(loadPath);
  }

  console.log('[BuildingViewer] 🚀 Loading 3D model from:', loadPath);

  _gltfLoader.load(
    loadPath,
    (gltf) => {
      console.log('[BuildingViewer] ✅ Model loaded successfully:', loadPath);

      // Wrap inside a dedicated model pivot group
      const modelGroup = new THREE.Group();

      // Clean up / normalize meshes and textures
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;

        node.frustumCulled = false;

        if (node.name && node.name.includes('Meshy_AI')) {
          node.visible = false;
        }

        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
          if (!mat) return;
          const texSlots = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap'];
          texSlots.forEach((slot) => {
            const tex = mat[slot];
            if (!tex) return;
            tex.flipY = false;
            if (slot === 'map' || slot === 'emissiveMap') {
              tex.colorSpace = THREE.SRGBColorSpace;
            }
            tex.needsUpdate = true;
          });
          if ((mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) && !mat.map) {
            mat.roughness = 0.55;
            mat.metalness = 0.1;
          }
          mat.needsUpdate = true;
        });
      });

      // Measure raw bounds of gltf.scene
      const rawBox = new THREE.Box3().setFromObject(gltf.scene);
      const rawCenter = rawBox.getCenter(new THREE.Vector3());
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const rawMaxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1.0;

      // Center raw gltf.scene so its center is (0,0) on XZ and base is Y=0 inside modelGroup
      gltf.scene.position.set(-rawCenter.x, -rawBox.min.y, -rawCenter.z);
      modelGroup.add(gltf.scene);

      // Normalize scale so targetDim is 3.5 units
      const targetDim = 3.5;
      const scale = targetDim / rawMaxDim;
      modelGroup.scale.setScalar(scale);

      _scene.add(modelGroup);
      _loadedPath = path;

      // Position camera and orbit controls to fit targetDim
      const fitDist = targetDim * 1.8;
      _camera.position.set(fitDist * 0.85, fitDist * 0.65, fitDist * 0.85);
      _controls.target.set(0, (rawSize.y * scale) * 0.35, 0);
      _controls.minDistance = 1.0;
      _controls.maxDistance = 60.0;
      _controls.update();

      // Dynamically size holographic effects to match model footprint
      _fitHoloEffects(modelGroup);

      _setLoading(false);
      _startLoop();
    },
    (xhr) => {
      const pct = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : 0;
      const el = document.getElementById('bv-loader-text');
      if (el) el.textContent = `LOADING MODEL… ${pct > 0 ? pct + '%' : ''}`;
    },
    (err) => {
      console.error('[BuildingViewer] Error loading:', err);
      const el = document.getElementById('bv-loader-text');
      if (el) el.textContent = 'FAILED TO LOAD MODEL';
    }
  );
}

function _startLoop() {
  if (_animId) cancelAnimationFrame(_animId);

  const loop = () => {
    _animId = requestAnimationFrame(loop);
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

/**
 * Dynamically sizes the holographic ring/glow/scanline/particles
 * to match the loaded model's actual footprint on screen.
 */
function _fitHoloEffects(modelScene) {
  if (!_camera || !_renderer) return;

  const modal = document.getElementById('bv-modal');
  if (!modal) return;

  // Measure the scaled model's bounding box
  const box = new THREE.Box3().setFromObject(modelScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Use the XZ footprint (horizontal span) to determine ring width
  const footprint = Math.max(size.x, size.z);
  // Use Y to help determine vertical span for scanline
  const height = size.y;

  // Project footprint to screen-space percentage of the container
  const wrap = document.getElementById('bv-canvas-wrap');
  if (!wrap) return;
  const containerW = wrap.clientWidth || 1;
  const containerH = wrap.clientHeight || 1;

  // Get the camera distance to origin (where model is centered)
  const camDist = _camera.position.length();
  const fovRad = THREE.MathUtils.degToRad(_camera.fov);

  // Visible height at the model's distance
  const visibleH = 2 * Math.tan(fovRad / 2) * camDist;
  const visibleW = visibleH * _camera.aspect;

  // Ring width as percentage of container
  const ringPct = Math.min(Math.max((footprint / visibleW) * 100, 12), 55);
  // Ring height (ellipse depth) proportional
  const ringHeightPct = ringPct * 0.28;
  // Ground glow slightly wider
  const glowPct = ringPct * 1.35;
  const glowHeightPct = glowPct * 0.3;

  // Model vertical extent as % of container — determines bottom offset
  const modelBottomPct = Math.min(Math.max(22 - (height / visibleH) * 8, 12), 30);

  // ── Apply to emitter ring ──
  const emitter = modal.querySelector('.bv-emitter-ring');
  if (emitter) {
    emitter.style.width = `${ringPct}%`;
    emitter.style.paddingBottom = `${ringHeightPct}%`;
    emitter.style.bottom = `${modelBottomPct}%`;
    emitter.style.maxWidth = 'none';
    emitter.style.minWidth = '0';
  }

  // ── Apply to pulse ring ──
  const pulse = modal.querySelector('.bv-pulse-ring');
  if (pulse) {
    pulse.style.width = `${ringPct}%`;
    pulse.style.paddingBottom = `${ringHeightPct}%`;
    pulse.style.bottom = `${modelBottomPct}%`;
    pulse.style.maxWidth = 'none';
    pulse.style.minWidth = '0';
  }

  // ── Apply to ground glow ──
  const glow = modal.querySelector('.bv-ground-glow');
  if (glow) {
    glow.style.width = `${glowPct}%`;
    glow.style.paddingBottom = `${glowHeightPct}%`;
    glow.style.bottom = `${Math.max(modelBottomPct - 6, 4)}%`;
    glow.style.maxWidth = 'none';
    glow.style.minWidth = '0';
  }

  // ── Constrain scanline to model region ──
  const scanline = modal.querySelector('.bv-scanline');
  if (scanline) {
    const scanMargin = Math.max((100 - ringPct) / 2 - 5, 5);
    scanline.style.left = `${scanMargin}%`;
    scanline.style.right = `${scanMargin}%`;
  }

  // ── Constrain particle spread to model width ──
  modal.querySelectorAll('.bv-particle').forEach((p) => {
    const particleLeft = ((100 - ringPct) / 2) + Math.random() * ringPct;
    p.style.left = `${particleLeft}%`;
    p.style.bottom = `${modelBottomPct}%`;
  });
}
