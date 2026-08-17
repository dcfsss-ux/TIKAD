import * as THREE from "three";
import Experience from "../Experience.js";

/**
 * Plateforme10.js — Campus Ground Base
 *
 * Renders only the lightweight campus ground / road platform model
 * (campusBase). Individual buildings are loaded progressively by
 * World.loadBuildingGLB() after this base is ready.
 */
export default class MapBase {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;
    this.renderer = this.experience.renderer;

    this.modelsToLoad = [
      { name: "campusBase", item: this.resources.items.campusBase },
      { name: "trees", item: this.resources.items.trees },
      { name: "easterEgg", item: this.resources.items.easterEgg },
    ];

    this.setModels();
  }

  setupModel(gltf, label) {
    if (!gltf || !gltf.scene) return;
    const modelScene = gltf.scene;

    modelScene.traverse((child) => {
      if (child.isMesh) {
        // Hide any Meshy_AI artifacts
        if (child.name && child.name.includes("Meshy_AI")) {
          child.visible = false;
        }

        // Disable frustum culling so objects stay visible at all angles
        child.frustumCulled = false;

        // ── Fix textures from Blender GLB export ────────────────────────────
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat) return;
          const textureMaps = [
            'map', 'emissiveMap', 'normalMap', 'roughnessMap',
            'metalnessMap', 'aoMap', 'lightMap',
          ];
          textureMaps.forEach((slot) => {
            const tex = mat[slot];
            if (!tex) return;
            tex.flipY = false;
            if (slot === 'map' || slot === 'emissiveMap') {
              tex.colorSpace = THREE.SRGBColorSpace;
            }
            tex.needsUpdate = true;
          });
          mat.needsUpdate = true;
        });
      }
    });

    this.scene.add(modelScene);
    console.log(`[MapBase] Loaded ${label}`);
  }

  setModels() {
    this.modelsToLoad.forEach(({ name, item }) => {
      if (item) {
        this.setupModel(item, name);
      }
    });

    if (this.renderer) {
      this.renderer.requestRender();
    }
  }

  resize() { }

  update() { }
}
