/**
 * model3D.js – Live 3D hero preview
 *
 * Renders the actual campus GLB as a clean top-down static preview
 * inside #model-3d-container on the landing page.
 *
 * Fixes applied vs v1:
 *  - Frustum culling disabled (same as Plateforme10.js)
 *  - Texture flipY = false (same as Plateforme10.js)
 *  - Camera zoom auto-fitted to bounding box width
 *  - No auto-rotation — very subtle 0.3° slow drift only
 *  - Model properly centred before camera fit
 */

import * as THREE from 'three';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export function initModel3D() {
  const container = document.getElementById('model-3d-container');
  if (!container) return;

  // ── Canvas ───────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;opacity:0;transition:opacity 1s ease;';
  container.appendChild(canvas);

  // ── Renderer ─────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping      = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.5;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;

  // ── Scene ────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // ── Orthographic camera — top-down ──────────────────────────────
  const frustum = 200;
  let   aspect  = container.clientWidth / Math.max(container.clientHeight, 1);
  const camera  = new THREE.OrthographicCamera(
    (-aspect * frustum) / 2,
    ( aspect * frustum) / 2,
     frustum / 2,
    -frustum / 2,
    -500, 500,
  );
  // Position straight above, looking down; north = –Z faces up in screen
  camera.position.set(0, 10, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.zoom = 1;
  camera.updateProjectionMatrix();

  // ── Sync renderer + camera to container size ─────────────────────
  function syncSize() {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    aspect         = w / h;
    camera.left    = (-aspect * frustum) / 2;
    camera.right   = ( aspect * frustum) / 2;
    camera.top     =  frustum / 2;
    camera.bottom  = -frustum / 2;
    camera.updateProjectionMatrix();
  }
  syncSize();

  // ── Lighting ─────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(3, 10, 5);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.6);
  fill.position.set(-5, 8, -3);
  scene.add(fill);

  // ── Interaction state ────────────────────────────────────────────
  let pivot      = null;
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let rotX = 0, rotY = 0; // accumulated drag rotation

  // ── Load GLB ────────────────────────────────────────────────────
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    '/models/3d-map.draco.glb',
    (gltf) => {
      const model = gltf.scene;

      // Mirror Plateforme10.js fixes — frustum culling ON (saves draw calls)
      model.traverse((child) => {
        if (child.isMesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => { if (m.map) m.map.flipY = false; });
        }
      });

      // Wrap in pivot for rotation
      pivot = new THREE.Group();
      pivot.add(model);
      scene.add(pivot);

      // ── Straighten: the campus sits at a slight angle in world-space.
      //    Rotate ~0.45 rad (~26°) to align it axis-parallel for a cleaner top view.
      rotY = 0.45;
      pivot.rotation.y = rotY;

      // ── Auto-fit: compute bounding box and set zoom to show full campus ──
      const box  = new THREE.Box3().setFromObject(pivot);
      const size = new THREE.Vector3();
      box.getSize(size);
      const centre = new THREE.Vector3();
      box.getCenter(centre);

      // Shift the pivot so the model is centred at world origin
      pivot.position.set(-centre.x, -centre.y, -centre.z);

      // Fit zoom: multiplier of 2.8 zooms into the main campus area and crops
      // the distant road/path lines that would otherwise bloat the bounding box.
      const fitZoomX = (aspect * frustum) / size.x;
      const fitZoomZ = frustum          / size.z;
      camera.zoom = Math.min(fitZoomX, fitZoomZ) * 2.8;
      camera.updateProjectionMatrix();

      // Fade in canvas
      canvas.style.opacity = '1';

      // Remove shimmer
      const shimmer = container.querySelector('.hero-shimmer');
      if (shimmer) {
        shimmer.style.opacity = '0';
        setTimeout(() => shimmer.remove(), 700);
      }
    },
    undefined,
    (err) => console.error('[hero 3D] GLB load error:', err),
  );

  // ── Drag to rotate ───────────────────────────────────────────────
  function onPointerDown(e) {
    isDragging = true;
    const pt = e.touches ? e.touches[0] : e;
    lastX = pt.clientX;
    lastY = pt.clientY;
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging || !pivot) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - lastX;
    lastX = pt.clientX;
    lastY = pt.clientY;
    rotY += dx * 0.005;
    pivot.rotation.y = rotY;
  }

  function onPointerUp() { isDragging = false; }

  canvas.addEventListener('mousedown',  onPointerDown, { passive: false });
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('mousemove',  onPointerMove);
  window.addEventListener('touchmove',  onPointerMove, { passive: true });
  window.addEventListener('mouseup',    onPointerUp);
  window.addEventListener('touchend',   onPointerUp);

  // ── Pause when tab hidden ────────────────────────────────────────
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  // ── Resize observer ──────────────────────────────────────────────
  new ResizeObserver(syncSize).observe(container);

  // ── Render loop (very subtle drift, no auto-spin) ────────────────
  const clock = new THREE.Clock();
  let   lastRotY = null;          // detect when nothing changed
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;

    const delta = clock.getDelta();
    let needsRender = isDragging; // always render while dragging

    // Only drift when user is not dragging
    if (!isDragging && pivot) {
      rotY += delta * 0.03;       // ~1.7°/s — barely perceptible
      pivot.rotation.y = rotY;
      needsRender = true;         // drift changed the frame
    }

    // Skip the GPU draw call when nothing has changed
    if (needsRender) {
      renderer.render(scene, camera);
    }
  }
  animate();
}
