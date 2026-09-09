# Campus Navigation System — Road Segment Highlighting

## Overview

When a user clicks a building (or clicks the **Show Campus Route** button in the building info section), the system:
1. Finds the nearest gate (by road-network distance, not straight-line)
2. Computes a path along the road network: **gate → building → gate**
3. Highlights the **actual road segment meshes** in the GLB (no synthetic geometry)
4. Clears highlights when a different building is clicked or the panel is closed

## Architecture

```
waypoints.json          ← Graph: nodes + edges with segmentName references
      ↓
pathfinding.js          ← Pure JS: A*, graph loader, segment resolution
      ↓
gateStrategy.js         ← Entrance/exit gate selection (swappable strategy)
      ↓
interactionHandler.js   ← Orchestrator: building click → route → highlight
      ↓
highlightRenderer.js    ← Three.js: material swap/restore on real meshes
      ↓
mapOverlay.js           ← Integration: wires navigation into existing UI
```

## Road Segment Naming Convention

**Confirmed Mesh Names:** `road 1` through `road 30` (with a space, no leading zeros, e.g. `"road 1"`, `"road 2"`, ..., `"road 30"`).

Each edge in `waypoints.json` has a `segmentName` field that **matches** these mesh names in `platform_with_rocky_road.glb`.

## Confirmed Segment Anchor Positions

| Segment name | Approx. position (x, y, z) |
|---|---|
| road 1  | -38.68, 1.52, -462.64 |
| road 2  | 29.58, 1.52, -471.88 |
| road 3  | -96.49, 1.52, -445.94 |
| road 4  | -188.11, 1.52, -428.41 |
| road 5  | -38.58, 1.52, -458.22 |
| road 6  | -16.80, 1.52, -353.79 |
| road 7  | -1.01, 1.52, -245.48 |
| road 8  | 35.13, 1.52, -38.75 |
| road 9  | 53.37, 1.52, 66.13 |
| road 10 | 71.49, 1.52, 138.64 |
| road 11 | 64.73, 1.52, 139.11 |
| road 12 | 71.49, 1.52, 199.43 |
| road 13 | 74.51, 1.52, 198.63 |
| road 14 | 91.24, 1.52, 273.20 |
| road 15 | 87.67, 1.52, 272.90 |
| road 16 | 100.09, 1.52, 317.64 |
| road 17 | 94.99, 1.52, 314.74 |
| road 18 | 183.29, 1.52, 832.96 |
| road 19 | -412.22, 1.52, 934.65 |
| road 20 | 774.45, 1.52, 193.03 |
| road 21 | 1.97, 1.52, -249.99 |
| road 22 | -127.16, 1.52, -224.11 |
| road 23 | -121.76, 1.52, -224.11 |
| road 24 | 99.69, 1.52, -372.53 |
| road 25 | 130.90, 1.52, -196.88 |
| road 26 | 128.60, 1.52, -192.37 |
| road 27 | 35.44, 1.52, -39.46 |
| road 28 | 53.13, 1.52, 68.00 |
| road 29 | -155.78, 1.52, -1.77 |
| road 30 | -19.55, 1.52, -354.23 |

## Gate Strategy

The routing strategy is controlled by a single constant in `gateStrategy.js`:

```js
export const GATE_STRATEGY = "nearest_gate"; // or "always_main"
```

| Strategy | Behavior |
|----------|----------|
| `nearest_gate` | Routes from/to whichever gate is closest by road-network distance |
| `always_main` | Always routes through `gate_main` regardless of building location |

To switch: change the string value in `gateStrategy.js` line 16.

## Current Gates

| ID | Position (Three.js Y-up) | Notes |
|----|-------------------------|-------|
| `gate_main` | `[-41.8841, 0.162292, -486.505]` | Main entrance |
| `gate_second` | `[211.586, 0.897858, -204.351]` | Gate 2 |
| `gate_third` | `[180.3, 2.04004, 818.803]` | Gate 3 |
| `gate_fourth` | `[270.374, 0.522324, 168.275]` | Gate 4 |

## Highlight Behavior

- **Material swap** (not geometry overlay): the road mesh's material is temporarily replaced with a glowing yellow emissive material
- **Pulsing animation**: shared material pulses emissive intensity for eye-drawing effect
- **Auto-clear**: previous route is automatically cleared before highlighting a new one
- **No z-fighting**: same geometry is used, just recolored
