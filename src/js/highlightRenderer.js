/**
 * highlightRenderer.js — Road Segment Material Swap / Restore
 *
 * Looks up real road segment meshes by name in the loaded scene,
 * swaps their materials to a shared highlight material, and restores
 * originals on clear. No geometry creation or disposal needed.
 */

import * as THREE from 'three';
import Experience from '../../Experience/Experience.js';

// ── Shared highlight material ─────────────────────────────────────────────────
// All highlighted segments share one material instance, so pulsing the
// emissive intensity is a single tween, not per-mesh work.
const HIGHLIGHT_COLOR = 0xffea00; // Vibrant glowing yellow

const highlightMaterial = new THREE.MeshStandardMaterial({
  color: HIGHLIGHT_COLOR,
  emissive: 0xffd700,
  emissiveIntensity: 2.5,
  roughness: 0.2,
  metalness: 0.1,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

// Helper to trigger WebGL frame redraw
function _requestRender() {
  try {
    const exp = new Experience();
    if (exp && exp.renderer) {
      exp.renderer.requestRender();
    }
  } catch (e) {
    // Ignore if Experience instance is not initialized yet
  }
}

// ── State ─────────────────────────────────────────────────────────────────────
/** @type {Map<string, THREE.Material | THREE.Material[]>} segmentName → original material(s) */
const originalMaterialCache = new Map();

/** @type {string[]} Currently highlighted segment names */
let activeSegments = [];

/** Animation frame ID for the pulsing effect */
let pulseAnimId = null;

// ── Mesh lookup cache ─────────────────────────────────────────────────────────
/** @type {Map<string, THREE.Object3D>} segmentName → THREE.Object3D from scene graph */
const meshLookupCache = new Map();

/**
 * Build / rebuild the mesh lookup cache by traversing the scene.
 * Call once after the campusBase model is loaded.
 *
 * @param {THREE.Object3D} sceneRoot — root of the loaded campusBase scene
 */
export function buildMeshLookup(sceneRoot) {
  meshLookupCache.clear();

  if (!sceneRoot) return;

  sceneRoot.traverse((node) => {
    if (!node.name) return;
    const nameKey = node.name.trim();
    if (!nameKey) return;

    // Index any named node (Mesh, Group, Object3D)
    meshLookupCache.set(nameKey, node);
    meshLookupCache.set(nameKey.toLowerCase(), node);
  });

  console.log(`[HighlightRenderer] Mesh lookup cache built: ${meshLookupCache.size / 2} unique nodes registered`);
}

/**
 * Find a node by segment name with defensive Blender-suffix and variant handling.
 *
 * @param {string} segmentName — the segment name from waypoints.json
 * @returns {THREE.Object3D|null}
 */
function _findMesh(segmentName) {
  if (!segmentName) return null;

  // 1. Direct match
  if (meshLookupCache.has(segmentName)) {
    return meshLookupCache.get(segmentName);
  }

  // 2. Case-insensitive match
  const lower = segmentName.toLowerCase().trim();
  if (meshLookupCache.has(lower)) {
    return meshLookupCache.get(lower);
  }

  // 3. Try stripping Blender suffixes (.001, .002, etc.)
  const stripped = lower.replace(/\.\d{3}$/, '');
  if (meshLookupCache.has(stripped)) {
    return meshLookupCache.get(stripped);
  }

  // 4. Try number format variants ("road 1" <-> "road 01" <-> "road_1" <-> "road1")
  const numMatch = lower.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    const variants = [
      `road ${num}`,
      `road ${num.toString().padStart(2, '0')}`,
      `road_${num}`,
      `road_${num.toString().padStart(2, '0')}`,
      `road${num}`,
      `road${num.toString().padStart(2, '0')}`,
      `road_seg_${num}`,
      `road_seg_${num.toString().padStart(2, '0')}`,
      `road seg ${num}`
    ];
    for (const v of variants) {
      if (meshLookupCache.has(v)) return meshLookupCache.get(v);
    }
  }

  // 5. Partial fallback search
  const normTarget = lower.replace(/[^a-z0-9]/g, '');
  for (const [key, node] of meshLookupCache.entries()) {
    const normKey = key.replace(/[^a-z0-9]/g, '');
    if (normKey === normTarget || (normTarget && normKey.endsWith(normTarget))) {
      return node;
    }
  }

  console.warn(`[HighlightRenderer] ⚠️ Mesh node not found for segment: "${segmentName}"`);
  return null;
}

/**
 * Highlight the given road segments by swapping their materials.
 * Automatically clears any previous highlight first.
 *
 * @param {string[]} segmentNames — array of road segment mesh names to highlight
 */
export function highlightSegments(segmentNames) {
  // Clear previous highlights first
  clearHighlight();

  if (!segmentNames || segmentNames.length === 0) return;

  activeSegments = [...segmentNames];
  let highlightedCount = 0;

  for (const segName of segmentNames) {
    const node = _findMesh(segName);
    if (!node) continue;

    let segmentSwapped = false;
    // Traverse node in case it's a THREE.Group or Object3D containing meshes
    node.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.origRoadMat) {
          child.userData.origRoadMat = child.material;
        }
        child.material = highlightMaterial;
        segmentSwapped = true;
      }
    });

    if (segmentSwapped) {
      highlightedCount++;
    }
  }

  if (highlightedCount > 0) {
    console.log(`[HighlightRenderer] 🛣️ Highlighted ${highlightedCount}/${segmentNames.length} road segments`);
    _startPulse();
  } else {
    console.warn(`[HighlightRenderer] No road segments could be highlighted. Check mesh names.`);
  }

  _requestRender();
}

/**
 * Clear all road segment highlights, restoring original materials.
 */
export function clearHighlight() {
  _stopPulse();

  for (const segName of activeSegments) {
    const node = _findMesh(segName);
    if (!node) continue;

    node.traverse((child) => {
      if (child.isMesh && child.userData.origRoadMat) {
        child.material = child.userData.origRoadMat;
        delete child.userData.origRoadMat;
      }
    });
  }

  originalMaterialCache.clear();
  activeSegments = [];
  _requestRender();
}

/**
 * Check if any segments are currently highlighted.
 * @returns {boolean}
 */
export function hasActiveHighlight() {
  return activeSegments.length > 0;
}

// ── Pulsing animation (optional eye-drawing effect) ───────────────────────────

const PULSE_MIN = 1.2;
const PULSE_MAX = 3.0;
const PULSE_SPEED = 2.0; // cycles per second

function _startPulse() {
  _stopPulse();

  const startTime = performance.now();

  function animate() {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = (Math.sin(elapsed * PULSE_SPEED * Math.PI * 2) + 1) / 2;
    highlightMaterial.emissiveIntensity = PULSE_MIN + t * (PULSE_MAX - PULSE_MIN);
    _requestRender();
    pulseAnimId = requestAnimationFrame(animate);
  }

  pulseAnimId = requestAnimationFrame(animate);
}

function _stopPulse() {
  if (pulseAnimId !== null) {
    cancelAnimationFrame(pulseAnimId);
    pulseAnimId = null;
  }
  // Reset to default intensity
  highlightMaterial.emissiveIntensity = 2.5;
  _requestRender();
}
