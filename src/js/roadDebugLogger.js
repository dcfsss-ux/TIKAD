/**
 * roadDebugLogger.js — Temporary debug utility
 *
 * Traverses the campusBase scene graph after load and logs every mesh name
 * to the browser console. Helps identify road segment names from the GLB
 * without opening Blender.
 *
 * Usage: call logRoadSegments(campusBaseScene) once after worldready.
 * Remove this file once waypoints.json is finalized.
 */

/**
 * Logs all mesh names in the given scene, grouped by likely category.
 * @param {THREE.Object3D} sceneRoot — the root of the campusBase model
 */
export function logRoadSegments(sceneRoot) {
  if (!sceneRoot) {
    console.warn('[RoadDebug] No scene root provided.');
    return;
  }

  const allMeshes = [];
  const roadSegments = [];
  const otherMeshes = [];

  sceneRoot.traverse((node) => {
    if (!node.isMesh) return;
    const name = node.name || '(unnamed)';
    const entry = {
      name,
      type: node.geometry?.type || 'unknown',
      vertexCount: node.geometry?.attributes?.position?.count || 0,
      parent: node.parent?.name || '(root)',
    };
    allMeshes.push(entry);

    // Heuristic: road segments typically have "road", "seg", "path", "street" in the name
    const lower = name.toLowerCase();
    if (
      lower.includes('road') ||
      lower.includes('seg') ||
      lower.includes('path') ||
      lower.includes('street') ||
      lower.includes('rocky') ||
      lower.includes('crossing') ||
      lower.includes('intersection')
    ) {
      roadSegments.push(entry);
    } else {
      otherMeshes.push(entry);
    }
  });

  console.group('[RoadDebug] 🛣️ Campus Base Mesh Names');
  console.log(`Total meshes: ${allMeshes.length}`);

  console.group('🛣️ Likely ROAD segments (matched by name heuristic)');
  if (roadSegments.length > 0) {
    console.table(roadSegments.map(e => ({ name: e.name, vertices: e.vertexCount, parent: e.parent })));
  } else {
    console.log('No meshes matched road-related keywords. Check the "All meshes" list below.');
  }
  console.groupEnd();

  console.group('📋 ALL meshes in campusBase (for manual inspection)');
  console.table(allMeshes.map(e => ({ name: e.name, vertices: e.vertexCount, parent: e.parent })));
  console.groupEnd();

  console.groupEnd();

  // Also return the data for programmatic use
  return { allMeshes, roadSegments, otherMeshes };
}
