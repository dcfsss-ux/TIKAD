import * as THREE from "three";
import Experience from "../Experience.js";

export default class MapModel {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;
    this.renderer = this.experience.renderer;

    this.mapModel = this.resources.items.plateforme10;
    this.actualModel = this.mapModel.scene;

    this.setModel();
  }

  setModel() {
    // Grab the WebGL renderer's max anisotropy once (hardware-dependent value)
    const maxAniso = this.renderer
      ? this.renderer.renderer.capabilities.getMaxAnisotropy()
      : 4;

    console.log("=== GLB Mesh Names (use these for building search) ===");
    this.actualModel.traverse((child) => {
      if (child.isMesh) {
        console.log(" -", child.name);

        // Hide Meshy_AI artifacts/objects (like the texturized object on FIC)
        if (child.name && child.name.includes("Meshy_AI")) {
          child.visible = false;
        }

        // Disable frustum culling so the entire map stays visible
        child.frustumCulled = false;

        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];

          mats.forEach((mat) => {
            for (const key of Object.keys(mat)) {
              const val = mat[key];
              if (val && val.isTexture) {
                val.flipY = false;
                val.generateMipmaps = true;
                val.minFilter = THREE.LinearMipmapLinearFilter;
                val.magFilter = THREE.LinearFilter;
                val.anisotropy = maxAniso;
                val.needsUpdate = true;
              }
            }
          });
        }
      }
    });

    this.scene.add(this.actualModel);
    console.log("Custom GLB map model loaded successfully.");

    // Force a render now that the model is in the scene
    if (this.renderer) {
      this.renderer.requestRender();
    }
  }

  resize() { }

  update() { }
}
