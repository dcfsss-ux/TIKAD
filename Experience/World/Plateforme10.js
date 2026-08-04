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
    console.log("=== GLB Mesh Names (use these for building search) ===");
    this.actualModel.traverse((child) => {
      if (child.isMesh) {
        console.log(" -", child.name);

        // Hide Meshy_AI artifacts/objects (like the texturized object on FIC)
        if (child.name && child.name.includes("Meshy_AI")) {
          child.visible = false;
        }

        // Disable frustum culling so the entire campus map stays visible
        child.frustumCulled = false;
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
