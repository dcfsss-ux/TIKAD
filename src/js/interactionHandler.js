/**
 * interactionHandler.js — Navigation Orchestrator
 *
 * Wires together pathfinding, gate strategy, and highlight rendering.
 * Called from mapOverlay.js to handle building click → route highlight.
 */

import { loadGraph, findNearestWaypoint, computeFullRoute } from './pathfinding.js';
import { resolveEntranceExit } from './gateStrategy.js';
import { buildMeshLookup, highlightSegments, clearHighlight, hasActiveHighlight } from './highlightRenderer.js';
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
 * Handle a building being selected — compute and highlight the route.
 *
 * @param {string} buildingKey — the BUILDING_DATA key (e.g. "masawa_building")
 * @param {number[]} [buildingWorldPos] — optional [x, y, z] world position of the building
 * @returns {boolean} — true if a route was highlighted, false otherwise
 */
export function handleBuildingRoute(buildingKey, buildingWorldPos = null) {
  if (!isInitialized || !graph) {
    console.warn('[Navigation] Not initialized yet.');
    return false;
  }

  // 1. Clear any existing route highlight
  clearRouteHighlight();

  // 2. Resolve building key to its waypoint ID
  let buildingWaypointId = _resolveBuildingWaypoint(buildingKey);

  // If no explicit mapping, try snapping to nearest waypoint by position
  if (!buildingWaypointId && buildingWorldPos) {
    buildingWaypointId = findNearestWaypoint(graph, buildingWorldPos);
  }

  if (!buildingWaypointId) {
    console.warn(`[Navigation] No waypoint found for building "${buildingKey}"`);
    return false;
  }

  // 3. Determine entrance and exit gates
  const { entrance, exit } = resolveEntranceExit(buildingWaypointId, graph);

  if (!entrance || !exit) {
    console.warn(`[Navigation] Could not resolve gates for "${buildingKey}"`);
    return false;
  }

  // 4. Compute the full route: gate → building → gate
  const result = computeFullRoute(graph, entrance, buildingWaypointId, exit);

  if (!result || result.segments.length === 0) {
    console.warn(`[Navigation] No route found for "${buildingKey}" (entrance: ${entrance}, exit: ${exit})`);
    return false;
  }

  // 5. Highlight the road segments
  highlightSegments(result.segments);

  console.log(`[Navigation] 🗺️ Route: ${entrance} → ${buildingWaypointId} → ${exit} (${result.segments.length} segments)`);
  return true;
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
