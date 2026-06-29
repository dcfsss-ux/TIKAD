/**
 * model3D.js – 3D Model placeholder / integration point
 *
 * CURRENT STATE: Renders a styled placeholder UI inside #model-3d-container.
 *
 * TO INTEGRATE YOUR 3D MODEL:
 * ─────────────────────────────────────────────────────────────────
 * Option A – Three.js (.glb / .gltf):
 *   1. npm install three @types/three
 *   2. Replace the placeholder renderer below with a Three.js scene.
 *   3. Load your model: import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
 *
 * Option B – Google <model-viewer> (easiest, no build step):
 *   1. Add <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
 *   2. Replace container innerHTML with:
 *      <model-viewer src="/models/campus.glb" auto-rotate camera-controls style="width:100%;height:100%"></model-viewer>
 *
 * Option C – Babylon.js:
 *   1. npm install @babylonjs/core
 *   2. Mount a BabylonEngine to the container canvas.
 * ─────────────────────────────────────────────────────────────────
 */

export function initModel3D() {
  const container = document.getElementById('model-3d-container');
  if (!container) return;

  // ── Render placeholder UI ──────────────────────────────────────
  container.innerHTML = `
    <!-- Window chrome bar -->
    <div class="viewer-bar">
      <div class="viewer-dot red"></div>
      <div class="viewer-dot yellow"></div>
      <div class="viewer-dot green"></div>
      <span class="viewer-title">
        TANAW 3D Campus Viewer
      </span>
    </div>

    <!-- 3D Placeholder body -->
    <div class="viewer-body">
      <!-- Decorative rings -->
      <div class="viewer-ring-outer"></div>
      <div class="viewer-ring-inner"></div>

      <!-- Icon -->
      <div class="viewer-icon">🗺️</div>

      <!-- Text -->
      <div class="viewer-text">
        <div class="viewer-text-title">3D Campus Model</div>
        <div class="viewer-text-sub">Integration ready · Your model goes here</div>
      </div>

      <!-- Loading dots -->
      <div class="viewer-loading-dots">
        <div class="viewer-loading-dot"></div>
        <div class="viewer-loading-dot"></div>
        <div class="viewer-loading-dot"></div>
      </div>

      <!-- Label badge -->
      <div class="viewer-badge">📍 Caraga State University</div>
    </div>
  `;
}

