import * as THREE from "three";
import Experience from "../Experience.js";

export default class MapModel {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;
    this.renderer = this.experience.renderer;

    // Load your custom GLB model
    this.mapModel = this.resources.items.plateforme10;
    this.actualModel = this.mapModel.scene;

    this.setModel();
  }

  setModel() {
    // Grab the WebGL renderer's max anisotropy once (hardware-dependent value)
    const maxAniso = this.renderer
      ? this.renderer.renderer.capabilities.getMaxAnisotropy()
      : 4;

    // Log all mesh names — use these in main.js for the search/highlight feature
    console.log("=== GLB Mesh Names (use these for building search) ===");
    this.actualModel.traverse((child) => {
      if (child.isMesh) {
        console.log(" -", child.name);

        // ── Re-enable frustum culling ──────────────────────────────────────────
        // Previously set to false "to ensure the entire map is visible", but
        // with the orthographic camera at a fixed zoom the whole campus IS in
        // view anyway. Removing the override lets Three.js skip draw calls for
        // any mesh that is fully outside the frustum (e.g. when panned far off
        // or in 2D mode with the camera shifted). Zero visual change, free win.
        child.frustumCulled = true;

        // ── Texture optimisation ───────────────────────────────────────────────
        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];

          mats.forEach((mat) => {
            if (mat.map) {
              // flipY fix: GLB UV origin is bottom-left; Three.js expects top-left
              mat.map.flipY = false;

              // Mipmaps: allow the GPU to sample a lower-resolution mip level for
              // geometry that is far from the camera or at a grazing angle. This
              // dramatically cuts GPU texture-fetch bandwidth and reduces aliasing.
              mat.map.generateMipmaps = true;
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;

              // Anisotropic filtering: improves texture sharpness on surfaces
              // viewed at an angle without increasing cost at perpendicular angles.
              mat.map.anisotropy = maxAniso;

              // Mark texture as needing an upload with the updated parameters
              mat.map.needsUpdate = true;
            }
          });
        }
      }
    });

    // Add the model to the scene as-is (uses materials baked into the GLB)
    this.scene.add(this.actualModel);
    console.log("Custom GLB map model loaded successfully.");

    // Force a render now that the model is in the scene
    if (this.renderer) {
      this.renderer.requestRender();
    }
  }

  resize() {}

  update() {}
}
