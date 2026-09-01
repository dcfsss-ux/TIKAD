/**
 * gateStrategy.js — Entrance / Exit Gate Resolution
 *
 * Determines which campus gate(s) to use for route start and end
 * when navigating to a building. Supports swappable strategies.
 */

import { findPath } from './pathfinding.js';

/**
 * Active gate strategy.
 * Options:
 *   "nearest_gate" — Entrance from Main Gate -> Building -> Exit to Secondary Gate (highlights full entrance, building, & exit roads)
 *   "nearest_only" — Entrance and Exit both use nearest gate by graph distance
 *   "always_main"  — Always route through gate_main for both entrance and exit
 */
export const GATE_STRATEGY = "nearest_gate";

/**
 * Gate definitions with world positions (Blender Z-up → Three.js Y-up).
 */
export const GATES = {
  gate_main:   { position: [-41.8841, 0.162292, -486.505] },
  gate_second: { position: [211.586, 0.897858, -204.351] },
  gate_third:  { position: [180.3, 2.04004, 818.803] },
  gate_fourth: { position: [270.374, 0.522324, 168.275] },
};

/** Array of gate IDs for iteration */
export const GATE_IDS = Object.keys(GATES);

/**
 * Resolve entrance and exit gates for a building route.
 * Always ensures a full route from Entrance Gate -> Building -> Exit Gate.
 *
 * @param {string} buildingWaypointId — the waypoint ID nearest to the clicked building
 * @param {Object} graph — from loadGraph()
 * @param {string} [strategy=GATE_STRATEGY] — routing strategy override
 * @returns {{ entrance: string, exit: string }} — gate IDs
 */
export function resolveEntranceExit(buildingWaypointId, graph, strategy = GATE_STRATEGY) {
  const sortedGates = _rankGatesByDistance(graph, buildingWaypointId, GATE_IDS);
  const closestGate = sortedGates[0] || "gate_main";

  if (strategy === "nearest_gate") {
    // Route from Entrance Gate (gate_main) -> Building -> Exit Gate (closest secondary gate)
    const entrance = "gate_main";
    let exit = closestGate;

    // If closest gate is gate_main itself, pick the second closest gate as exit
    if (exit === "gate_main" && sortedGates.length > 1) {
      exit = sortedGates[1];
    }

    return { entrance, exit };
  }

  if (strategy === "nearest_only") {
    return { entrance: closestGate, exit: closestGate };
  }

  if (strategy === "always_main") {
    return { entrance: "gate_main", exit: "gate_main" };
  }

  // Fallback
  return { entrance: "gate_main", exit: closestGate };
}

/**
 * Helper to rank gates by graph path cost from the building waypoint
 */
function _rankGatesByDistance(graph, buildingWaypointId, gateIds) {
  const gateCosts = [];

  for (const gateId of gateIds) {
    const path = findPath(graph, buildingWaypointId, gateId);
    if (!path) continue;

    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const neighbors = graph.adjacency.get(path[i]) || [];
      const edge = neighbors.find(n => n.id === path[i + 1]);
      if (edge) cost += edge.weight;
    }
    gateCosts.push({ gateId, cost });
  }

  gateCosts.sort((a, b) => a.cost - b.cost);
  return gateCosts.map(g => g.gateId);
}
