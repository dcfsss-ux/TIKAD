/**
 * pathfinding.js — Pure JS graph loader + A* pathfinding
 *
 * Zero Three.js dependency — unit-testable in isolation.
 * Operates on the waypoint graph defined in waypoints.json.
 */

/**
 * Build an adjacency-list graph from the waypoints data.
 *
 * @param {Object} waypointsData — parsed waypoints.json
 * @returns {{ adjacency: Map, nodes: Map, segmentLookup: Map, gateIds: string[] }}
 *   - adjacency: Map<nodeId, Array<{ id, weight, segmentName }>>
 *   - nodes: Map<nodeId, { id, position, type }>
 *   - segmentLookup: Map<string, string> — "fromId|toId" → segmentName
 *   - gateIds: string[] — IDs of gate-type nodes
 */
export function loadGraph(waypointsData) {
  const nodes = new Map();
  const adjacency = new Map();
  const segmentLookup = new Map();
  const gateIds = [];

  // Support array format or object format { nodes, waypoints }
  const nodeList = Array.isArray(waypointsData)
    ? waypointsData
    : (waypointsData.nodes || waypointsData.waypoints || []);

  // Index nodes
  for (const node of nodeList) {
    nodes.set(node.id, {
      id: node.id,
      position: node.position, // [x, y, z]
      type: node.type || 'crossing',
    });
    adjacency.set(node.id, []);

    if (node.type === 'gate') {
      gateIds.push(node.id);
    }
  }

  // Helper to safely add edge
  const addEdge = (from, to, segmentName, weight) => {
    if (!nodes.has(from) || !nodes.has(to)) return;

    const w = weight || _euclideanDistance(
      nodes.get(from)?.position,
      nodes.get(to)?.position
    );

    const fromAdj = adjacency.get(from);
    if (!fromAdj.some(e => e.id === to)) {
      fromAdj.push({ id: to, weight: w, segmentName });
    }

    const toAdj = adjacency.get(to);
    if (!toAdj.some(e => e.id === from)) {
      toAdj.push({ id: from, weight: w, segmentName });
    }

    const keyAB = `${from}|${to}`;
    const keyBA = `${to}|${from}`;
    segmentLookup.set(keyAB, segmentName);
    segmentLookup.set(keyBA, segmentName);
  };

  // 1. Parse connections defined inside each node object (e.g. node.connections)
  for (const node of nodeList) {
    if (node.connections && Array.isArray(node.connections)) {
      for (const conn of node.connections) {
        addEdge(node.id, conn.id, conn.segmentName, conn.weight);
      }
    }
  }

  // 2. Parse explicit root edges array if present (e.g. waypointsData.edges)
  if (waypointsData.edges && Array.isArray(waypointsData.edges)) {
    for (const edge of waypointsData.edges) {
      addEdge(edge.from, edge.to, edge.segmentName, edge.weight);
    }
  }

  return { adjacency, nodes, segmentLookup, gateIds };
}

/**
 * A* pathfinding over the waypoint graph.
 *
 * @param {Object} graph — from loadGraph()
 * @param {string} startId — starting waypoint ID
 * @param {string} endId — destination waypoint ID
 * @returns {string[]|null} — ordered array of waypoint IDs, or null if no path
 */
export function findPath(graph, startId, endId) {
  const { adjacency, nodes } = graph;

  if (!nodes.has(startId) || !nodes.has(endId)) return null;
  if (startId === endId) return [startId];

  const endPos = nodes.get(endId).position;

  // A* heuristic: Euclidean distance in XZ plane
  const heuristic = (nodeId) => {
    const pos = nodes.get(nodeId).position;
    return _xzDistance(pos, endPos);
  };

  // Open set as a simple priority queue (array-based, fine for small graphs)
  const openSet = [{ id: startId, f: heuristic(startId) }];
  const gScore = new Map();
  const cameFrom = new Map();
  const closedSet = new Set();

  gScore.set(startId, 0);

  while (openSet.length > 0) {
    // Pick node with lowest f-score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    if (current.id === endId) {
      // Reconstruct path
      return _reconstructPath(cameFrom, endId);
    }

    closedSet.add(current.id);

    const neighbors = adjacency.get(current.id) || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.id)) continue;

      const tentativeG = gScore.get(current.id) + neighbor.weight;

      if (!gScore.has(neighbor.id) || tentativeG < gScore.get(neighbor.id)) {
        cameFrom.set(neighbor.id, current.id);
        gScore.set(neighbor.id, tentativeG);
        const f = tentativeG + heuristic(neighbor.id);

        // Add to open set if not already there
        const existing = openSet.find(n => n.id === neighbor.id);
        if (existing) {
          existing.f = f;
        } else {
          openSet.push({ id: neighbor.id, f });
        }
      }
    }
  }

  // No path found
  return null;
}

/**
 * Convert a waypoint-ID path into an ordered list of road segment names.
 *
 * @param {Object} graph — from loadGraph()
 * @param {string[]} waypointIdPath — from findPath()
 * @returns {string[]} — ordered segment names (may contain duplicates if route loops)
 */
export function pathToSegments(graph, waypointIdPath) {
  if (!waypointIdPath || waypointIdPath.length < 2) return [];

  const segments = [];
  for (let i = 0; i < waypointIdPath.length - 1; i++) {
    const from = waypointIdPath[i];
    const to = waypointIdPath[i + 1];
    const key = `${from}|${to}`;
    const segName = graph.segmentLookup.get(key);
    if (segName && !segments.includes(segName)) {
      segments.push(segName);
    }
  }
  return segments;
}

/**
 * Find the nearest waypoint to a 3D world position (XZ plane distance).
 *
 * @param {Object} graph — from loadGraph()
 * @param {number[]} position — [x, y, z] world coords
 * @param {string} [filterType] — optional: only consider nodes of this type
 * @returns {string|null} — waypoint ID of the nearest node
 */
export function findNearestWaypoint(graph, position, filterType = null) {
  let bestId = null;
  let bestDist = Infinity;

  for (const [id, node] of graph.nodes) {
    if (filterType && node.type !== filterType) continue;
    const d = _xzDistance(position, node.position);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }

  return bestId;
}

/**
 * Find the nearest gate to a building waypoint by graph distance (A*).
 *
 * @param {Object} graph — from loadGraph()
 * @param {string} buildingWaypointId — the waypoint nearest to the building
 * @param {string[]} [gateIdsOverride] — optional override for gate IDs
 * @returns {string|null} — gate ID with smallest path cost
 */
export function findNearestGate(graph, buildingWaypointId, gateIdsOverride = null) {
  const gates = gateIdsOverride || graph.gateIds;
  let bestGate = null;
  let bestCost = Infinity;

  for (const gateId of gates) {
    const path = findPath(graph, buildingWaypointId, gateId);
    if (!path) continue;

    // Calculate path cost
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const neighbors = graph.adjacency.get(path[i]) || [];
      const edge = neighbors.find(n => n.id === path[i + 1]);
      if (edge) cost += edge.weight;
    }

    if (cost < bestCost) {
      bestCost = cost;
      bestGate = gateId;
    }
  }

  return bestGate;
}

/**
 * Compute a full route: entrance gate → building → exit gate.
 * Deduplicates segments if entrance === exit.
 *
 * @param {Object} graph — from loadGraph()
 * @param {string} entranceGateId
 * @param {string} buildingWaypointId
 * @param {string} exitGateId
 * @returns {{ path: string[], segments: string[] } | null}
 */
export function computeFullRoute(graph, entranceGateId, buildingWaypointId, exitGateId) {
  const legIn = findPath(graph, entranceGateId, buildingWaypointId);
  if (!legIn) return null;

  const legOut = findPath(graph, buildingWaypointId, exitGateId);
  if (!legOut) return null;

  // Combine paths, avoiding duplicate building waypoint at the junction
  const fullPath = [...legIn, ...legOut.slice(1)];

  // Get segment names from both legs and deduplicate
  const segIn = pathToSegments(graph, legIn);
  const segOut = pathToSegments(graph, legOut);

  const segmentSet = new Set([...segIn, ...segOut]);
  const segments = [...segmentSet];

  return { path: fullPath, segments };
}

/**
 * Get ONLY the road segments that are directly near/connected to the building's entrance/exit.
 *
 * @param {Object} graph — from loadGraph()
 * @param {string} buildingWaypointId — the waypoint ID of the building
 * @returns {string[]} — array of segment names near the building entrance/exit
 */
export function getBuildingEntranceSegments(graph, buildingWaypointId) {
  if (!graph || !graph.adjacency.has(buildingWaypointId)) return [];

  const segments = new Set();
  const directEdges = graph.adjacency.get(buildingWaypointId) || [];

  // 1. Direct segment connecting the building entrance to the road network
  for (const edge of directEdges) {
    if (edge.segmentName) {
      segments.add(edge.segmentName);
    }

    // 2. Immediate crossing segments attached to the junction right outside the building entrance
    const junctionEdges = graph.adjacency.get(edge.id) || [];
    for (const jEdge of junctionEdges) {
      if (jEdge.segmentName) {
        segments.add(jEdge.segmentName);
      }
    }
  }

  return Array.from(segments);
}

/**
 * Get ALL road segments connecting a building to its exit gate location (e.g., 2nd Gate for Kinaadman, Gate 4 for Hiraya)
 * and entrance gate location, highlighting ONLY those exit and entrance connected roads.
 *
 * @param {Object} graph — from loadGraph()
 * @param {string} buildingWaypointId — the building's waypoint ID
 * @returns {string[]} — array of segment names connecting the building to its exit/entrance gates
 */
export function getBuildingExitRouteSegments(graph, buildingWaypointId) {
  if (!graph || !graph.nodes.has(buildingWaypointId)) return [];

  const segmentSet = new Set();

  // 1. Find nearest exit gate location for this building (e.g. gate_second for Kinaadman)
  const nearestExitGate = findNearestGate(graph, buildingWaypointId, graph.gateIds);

  if (nearestExitGate) {
    const exitPath = findPath(graph, buildingWaypointId, nearestExitGate);
    if (exitPath) {
      const exitSegs = pathToSegments(graph, exitPath);
      exitSegs.forEach(s => segmentSet.add(s));
    }
  }

  // 2. Include path to main entrance gate if different from nearest exit gate
  const entranceGate = "gate_main";
  if (entranceGate && entranceGate !== nearestExitGate) {
    const entrancePath = findPath(graph, entranceGate, buildingWaypointId);
    if (entrancePath) {
      const entranceSegs = pathToSegments(graph, entrancePath);
      entranceSegs.forEach(s => segmentSet.add(s));
    }
  }

  // 3. Include direct edges at the building entrance waypoint
  const directEdges = graph.adjacency.get(buildingWaypointId) || [];
  for (const edge of directEdges) {
    if (edge.segmentName) segmentSet.add(edge.segmentName);
  }

  // 4. Include direct edges at the exit gate node
  if (nearestExitGate) {
    const gateEdges = graph.adjacency.get(nearestExitGate) || [];
    for (const edge of gateEdges) {
      if (edge.segmentName) segmentSet.add(edge.segmentName);
    }
  }

  return Array.from(segmentSet);
}


// ── Internal helpers ──────────────────────────────────────────────────────────

function _euclideanDistance(posA, posB) {
  if (!posA || !posB) return 999999;
  const dx = posA[0] - posB[0];
  const dy = posA[1] - posB[1];
  const dz = posA[2] - posB[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function _xzDistance(posA, posB) {
  if (!posA || !posB) return 999999;
  const dx = posA[0] - posB[0];
  const dz = posA[2] - posB[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function _reconstructPath(cameFrom, endId) {
  const path = [endId];
  let current = endId;
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    path.unshift(current);
  }
  return path;
}
