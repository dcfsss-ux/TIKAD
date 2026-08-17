export default [
  // ── Lightweight campus ground / road platform (~26 MB) ─────────────────────
  // Individual buildings are loaded progressively by World.loadBuildingGLB()
  // after this base finishes loading — no more 280 MB monolith on boot.
  {
    name: "campusBase",
    type: "glbModel",
    path: "/models/map/platform%20with%20rocky%20road.glb",
  },
  {
    name: "trees",
    type: "glbModel",
    path: "/models/map/trees.glb",
  },
  {
    name: "easterEgg",
    type: "glbModel",
    path: "/models/map/easter%20egg.glb",
  },
];

