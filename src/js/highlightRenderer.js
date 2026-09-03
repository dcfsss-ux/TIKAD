/**
 * highlightRenderer.js — Road Segment Material Swap / Restore
 *
 * Looks up real road segment meshes by name in the loaded scene,
 * swaps their materials to a shared highlight material, and restores
 * originals on clear. No geometry creation or disposal needed.
 *
 * Supports 3 route categories:
 *   - Nearest (green)
 *   - Near (yellow)
 *   - Far (red)
 */

import * as THREE from 'three';
import Experience from '../../Experience/Experience.js';

// ── Shared highlight materials ─────────────────────────────────────────────────
const NEAREST_COLOR = 0x00ff66;   // Green — nearest route
const NEAR_COLOR    = 0xffea00;   // Yellow — near route
const FAR_COLOR     = 0xff3333;   // Red — far route

const nearestHighlightMaterial = new THREE.MeshStandardMaterial({
  color: NEAREST_COLOR,
  emissive: 0x00e676,
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

const nearHighlightMaterial = new THREE.MeshStandardMaterial({
  color: NEAR_COLOR,
  emissive: 0xffd700,
  emissiveIntensity: 2.0,
  roughness: 0.2,
  metalness: 0.1,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

const farHighlightMaterial = new THREE.MeshStandardMaterial({
  color: FAR_COLOR,
  emissive: 0xff1744,
  emissiveIntensity: 2.0,
  roughness: 0.2,
  metalness: 0.1,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

// Map category names to materials for easy lookup
const CATEGORY_MATERIALS = {
  nearest: nearestHighlightMaterial,
  near:    nearHighlightMaterial,
  far:     farHighlightMaterial,
};

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

/** @type {string|null} Currently active route category */
let activeCategory = null;

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
 * Highlight road segments for a single route category (nearest, near, or far).
 * Automatically clears any previous highlights first.
 *
 * @param {string[]} segments — array of road segment mesh names to highlight
 * @param {'nearest'|'near'|'far'} category — the route category
 */
export function highlightCategorizedSegments(segments = [], category = 'nearest') {
  // Clear previous highlights first
  clearHighlight();

  if (!segments || segments.length === 0) return;

  const material = CATEGORY_MATERIALS[category] || nearestHighlightMaterial;

  activeSegments = [...segments];
  activeCategory = category;

  let highlightCount = 0;

  for (const segName of segments) {
    const node = _findMesh(segName);
    if (!node) continue;

    let swapped = false;
    node.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.origRoadMat) {
          child.userData.origRoadMat = child.material;
        }
        child.material = material;
        swapped = true;
      }
    });

    if (swapped) highlightCount++;
  }

  if (highlightCount > 0) {
    console.log(`[HighlightRenderer] 🛣️ Highlighted ${highlightCount} road segments as "${category}" (${category === 'nearest' ? '🟢' : category === 'near' ? '🟡' : '🔴'})`);
    _startPulse(category);
  } else {
    console.warn(`[HighlightRenderer] No road segments could be highlighted. Check mesh names.`);
  }

  _requestRender();
}

/**
 * Highlight road segments using primary (green) and secondary (faint yellow) materials.
 * Kept for backward compatibility. Automatically clears any previous highlights first.
 *
 * @param {string[]} primarySegments — array of primary road segment mesh names (vibrant green)
 * @param {string[]} [secondarySegments] — array of secondary road segment mesh names (faint yellow)
 */
export function highlightSegments(primarySegments = [], secondarySegments = []) {
  // Clear previous highlights first
  clearHighlight();

  const primaryList = primarySegments || [];
  const secondaryList = secondarySegments || [];

  if (primaryList.length === 0 && secondaryList.length === 0) return;

  activeSegments = [...new Set([...primaryList, ...secondaryList])];
  activeCategory = 'nearest';

  let primaryCount = 0;
  let secondaryCount = 0;

  // 1. Swap materials for secondary segments (faint yellow)
  for (const segName of secondaryList) {
    // Skip if segment is already in primary list to prioritize green
    if (primaryList.includes(segName)) continue;

    const node = _findMesh(segName);
    if (!node) continue;

    let swapped = false;
    node.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.origRoadMat) {
          child.userData.origRoadMat = child.material;
        }
        child.material = nearHighlightMaterial;
        swapped = true;
      }
    });

    if (swapped) secondaryCount++;
  }

  // 2. Swap materials for primary segments (vibrant green)
  for (const segName of primaryList) {
    const node = _findMesh(segName);
    if (!node) continue;

    let swapped = false;
    node.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.origRoadMat) {
          child.userData.origRoadMat = child.material;
        }
        child.material = nearestHighlightMaterial;
        swapped = true;
      }
    });

    if (swapped) primaryCount++;
  }

  if (primaryCount > 0 || secondaryCount > 0) {
    console.log(`[HighlightRenderer] 🛣️ Highlighted ${primaryCount} primary (green) & ${secondaryCount} secondary (faint yellow) road segments`);
    _startPulse('nearest');
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
  activeCategory = null;
  _requestRender();
}

/**
 * Check if any segments are currently highlighted.
 * @returns {boolean}
 */
export function hasActiveHighlight() {
  return activeSegments.length > 0;
}

/**
 * Get the currently active route category.
 * @returns {string|null} — 'nearest', 'near', 'far', or null
 */
export function getActiveCategory() {
  return activeCategory;
}

// ── Pulsing animation (optional eye-drawing effect) ───────────────────────────

const PULSE_MIN = 1.2;
const PULSE_MAX = 3.0;
const PULSE_SPEED = 2.0; // cycles per second

function _startPulse(category = 'nearest') {
  _stopPulse();

  const material = CATEGORY_MATERIALS[category] || nearestHighlightMaterial;
  const baseIntensity = material.emissiveIntensity;
  const startTime = performance.now();

  function animate() {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = (Math.sin(elapsed * PULSE_SPEED * Math.PI * 2) + 1) / 2;
    material.emissiveIntensity = PULSE_MIN + t * (PULSE_MAX - PULSE_MIN);
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
  // Reset to default intensities
  nearestHighlightMaterial.emissiveIntensity = 2.5;
  nearHighlightMaterial.emissiveIntensity = 2.0;
  farHighlightMaterial.emissiveIntensity = 2.0;
  _requestRender();
}
