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
    <div style="
      background: rgba(0,51,0,0.45);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    ">
      <div style="width:10px;height:10px;border-radius:50%;background:#ff5f57;"></div>
      <div style="width:10px;height:10px;border-radius:50%;background:#febc2e;"></div>
      <div style="width:10px;height:10px;border-radius:50%;background:#28c840;"></div>
      <span style="margin-left:8px;font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.06em;">
        TANAW 3D Campus Viewer
      </span>
    </div>

    <!-- 3D Placeholder body -->
    <div style="
      flex: 1;
      background: linear-gradient(160deg, #003300 0%, #005500 50%, #009900 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      gap: 16px;
    ">
      <!-- Decorative rings -->
      <div style="
        position: absolute;
        width: 280px; height: 280px;
        border-radius: 50%;
        border: 1px solid rgba(249,220,7,0.12);
        top: 50%; left: 50%;
        transform: translate(-50%,-50%);
        animation: pulse-ring 3s ease infinite;
      "></div>
      <div style="
        position: absolute;
        width: 180px; height: 180px;
        border-radius: 50%;
        border: 1px solid rgba(249,220,7,0.18);
        top: 50%; left: 50%;
        transform: translate(-50%,-50%);
        animation: pulse-ring 3s ease 0.5s infinite;
      "></div>

      <!-- Icon -->
      <div style="
        width: 72px; height: 72px;
        background: rgba(249,220,7,0.15);
        border: 2px solid rgba(249,220,7,0.35);
        border-radius: 18px;
        display: flex; align-items: center; justify-content: center;
        font-size: 32px;
        position: relative; z-index: 1;
      ">🗺️</div>

      <!-- Text -->
      <div style="text-align:center;position:relative;z-index:1;">
        <div style="
          font-family:'DM Serif Display',serif;
          font-size: 18px;
          color: #fff;
          font-weight: 700;
          margin-bottom: 6px;
        ">3D Campus Model</div>
        <div style="
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.06em;
        ">Integration ready · Your model goes here</div>
      </div>

      <!-- Loading dots -->
      <div style="display:flex;gap:6px;position:relative;z-index:1;margin-top:4px;">
        <div style="width:6px;height:6px;border-radius:50%;background:rgba(249,220,7,0.6);animation:dot-bounce 1.2s ease 0s infinite;"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:rgba(249,220,7,0.6);animation:dot-bounce 1.2s ease 0.2s infinite;"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:rgba(249,220,7,0.6);animation:dot-bounce 1.2s ease 0.4s infinite;"></div>
      </div>

      <!-- Label badge -->
      <div style="
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255,255,255,0.92);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        color: #003300;
        white-space: nowrap;
        z-index: 1;
      ">📍 Caraga State University</div>
    </div>

    <style>
      @keyframes pulse-ring {
        0%,100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); }
        50%      { opacity: 1;   transform: translate(-50%,-50%) scale(1.06); }
      }
      @keyframes dot-bounce {
        0%,100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
    </style>
  `;
}
