import * as THREE from "three";
import Experience from "../Experience.js";

export default class MapModel {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;

    this.mapModel = this.resources.items.plateforme10;
    this.actualModel = this.mapModel.scene;

    this.setModel();
  }

  setModel() {
    console.log("=== GLB Mesh Names (use these for building search) ===");
    this.actualModel.traverse((child) => {
      if (child.isMesh) {
        console.log(" -", child.name);

        // Disable frustum culling so the entire map stays visible
        child.frustumCulled = false;

        // GLTF spec: textures must not be flipped on Y axis
        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((mat) => {
            for (const key of Object.keys(mat)) {
              const val = mat[key];
              if (val && val.isTexture) {
                val.flipY = false;
                val.needsUpdate = true;
              }
            }
          });
        }
      }
    });

    this.scene.add(this.actualModel);
    console.log("Custom GLB map model loaded successfully.");
  }

  resize() { }

  update() { }
}
