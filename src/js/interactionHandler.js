/**
 * interactionHandler.js — Navigation Orchestrator
 *
 * Wires together pathfinding, gate strategy, and highlight rendering.
 * Called from mapOverlay.js to handle building click → route highlight.
 *
 * Supports 3 route categories: nearest (green), near (yellow), far (red).
 */

import { loadGraph, findNearestWaypoint, getBuildingExitRouteSegments } from './pathfinding.js';
import { buildMeshLookup, highlightCategorizedSegments, highlightSegments, clearHighlight, hasActiveHighlight, getActiveCategory } from './highlightRenderer.js';
import waypointsData from './data/waypoints.json';

// ── State ─────────────────────────────────────────────────────────────────────
let graph = null;
let isInitialized = false;

/**
 * Initialize the navigation system.
 * Call once after the campusBase model is loaded (worldready).
 *
 * @param {THREE.Object3D} campusBaseScene — root scene of the loaded platform GLB
 */
export function initNavigation(campusBaseScene) {
  // 1. Build the waypoint graph from the JSON data
  graph = loadGraph(waypointsData);
  console.log(`[Navigation] Graph loaded: ${graph.nodes.size} nodes, ${graph.gateIds.length} gates`);

  // 2. Build the mesh lookup cache for road segment highlighting
  buildMeshLookup(campusBaseScene);

  isInitialized = true;
  console.log('[Navigation] ✅ Navigation system initialized');
}

/**
 * Handle a categorized route for a building — highlights roads for a specific category.
 *
 * @param {string} buildingKey — the BUILDING_DATA key (e.g. "masawa_building")
 * @param {'nearest'|'near'|'far'} category — route category to show
 * @returns {boolean} — true if roads were highlighted, false otherwise
 */
export function handleCategorizedRoute(buildingKey, category = 'nearest') {
  if (!isInitialized) {
    console.warn('[Navigation] Not initialized yet.');
    return false;
  }

  // 1. Clear any existing route highlight
  clearRouteHighlight();

  // 2. Look up categorized routes for this building
  const categorized = _getCategorizedRoutes(buildingKey);

  if (categorized && categorized[category]) {
    const segments = categorized[category];
    if (segments.length > 0) {
      highlightCategorizedSegments(segments, category);
      const emoji = category === 'nearest' ? '🟢' : category === 'near' ? '🟡' : '🔴';
      console.log(`[Navigation] ${emoji} Highlighted "${category}" route (${segments.length} roads) for "${buildingKey}"`);
      return true;
    } else {
      console.log(`[Navigation] Empty "${category}" route for "${buildingKey}".`);
      return false;
    }
  }

  console.warn(`[Navigation] No categorized routes found for "${buildingKey}" (category: ${category})`);
  return false;
}

/**
 * Handle a building being selected — highlight ALL roads connected to its exit (legacy).
 *
 * @param {string} buildingKey — the BUILDING_DATA key (e.g. "masawa_building")
 * @param {number[]} [buildingWorldPos] — optional [x, y, z] world position of the building
 * @returns {boolean} — true if roads were highlighted, false otherwise
 */
export function handleBuildingRoute(buildingKey, buildingWorldPos = null) {
  if (!isInitialized || !graph) {
    console.warn('[Navigation] Not initialized yet.');
    return false;
  }

  // 1. Clear any existing route highlight
  clearRouteHighlight();

  // 2. Check if the building has categorized routes — use "nearest" as default
  const categorized = _getCategorizedRoutes(buildingKey);
  if (categorized && categorized.nearest) {
    return handleCategorizedRoute(buildingKey, 'nearest');
  }

  // 3. Resolve building key to its waypoint ID
  let buildingWaypointId = _resolveBuildingWaypoint(buildingKey);

  // If no explicit mapping, try snapping to nearest waypoint by position
  if (!buildingWaypointId && buildingWorldPos) {
    buildingWaypointId = findNearestWaypoint(graph, buildingWorldPos);
  }

  if (!buildingWaypointId) {
    console.warn(`[Navigation] No waypoint found for building "${buildingKey}"`);
    return false;
  }

  // 4. Highlight roads connecting the building to its exit gate
  const segments = getBuildingExitRouteSegments(graph, buildingWaypointId);

  if (!segments || segments.length === 0) {
    console.warn(`[Navigation] No exit/entrance road segments found for "${buildingKey}"`);
    return false;
  }

  // 5. Highlight those connected entrance and exit roads
  highlightSegments(segments, []);

  console.log(`[Navigation] 🛣️ Highlighted ${segments.length} exit/entrance connected roads for "${buildingKey}":`, segments);
  return true;
}

/**
 * Check if a building has categorized routes defined.
 *
 * @param {string} buildingKey
 * @returns {boolean}
 */
export function hasCategorizedRoutes(buildingKey) {
  return _getCategorizedRoutes(buildingKey) !== null;
}

/**
 * Look up categorized route data for a building key in waypoints.json -> buildingCategorizedRoutes.
 *
 * @param {string} buildingKey
 * @returns {{ nearest: string[], near: string[], far: string[] } | null}
 */
function _getCategorizedRoutes(buildingKey) {
  if (!waypointsData || !waypointsData.buildingCategorizedRoutes) return null;
  const map = waypointsData.buildingCategorizedRoutes;

  if (map[buildingKey] !== undefined) return map[buildingKey];

  const cleanKey = buildingKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, data] of Object.entries(map)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey) {
      return data;
    }
  }

  return null;
}

/**
 * Clear the current route highlight.
 */
export function clearRouteHighlight() {
  clearHighlight();
}

/**
 * Check if route highlighting is currently active.
 * @returns {boolean}
 */
export function hasActiveRoute() {
  return hasActiveHighlight();
}

/**
 * Get the currently active route category.
 * @returns {string|null}
 */
export function getActiveRouteCategory() {
  return getActiveCategory();
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Resolve a BUILDING_DATA key to its waypoint ID.
 * Uses the buildingWaypointMap from waypoints.json first,
 * then falls back to fuzzy matching.
 *
 * @param {string} buildingKey
 * @returns {string|null}
 */
function _resolveBuildingWaypoint(buildingKey) {
  if (!buildingKey) return null;

  // 1. Direct lookup in the buildingWaypointMap
  const directMap = waypointsData.buildingWaypointMap;
  if (directMap && directMap[buildingKey]) {
    return directMap[buildingKey];
  }

  // 2. Try case-insensitive / normalized match
  if (directMap) {
    const cleanKey = buildingKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [mapKey, waypointId] of Object.entries(directMap)) {
      const cleanMapKey = mapKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanMapKey === cleanKey) return waypointId;
    }
  }

  // 3. Try finding a building_entrance type waypoint with a similar name
  for (const [nodeId, nodeData] of graph.nodes) {
    if (nodeData.type !== 'building_entrance') continue;
    const cleanNodeId = nodeId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanBuildingKey = buildingKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanNodeId.includes(cleanBuildingKey) || cleanBuildingKey.includes(cleanNodeId)) {
      return nodeId;
    }
  }

  return null;
}
