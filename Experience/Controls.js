import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Experience from "./Experience.js";

export default class Controls {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.canvas = this.experience.canvas;
    this.resources = this.experience.resources;
    this.sizes = this.experience.sizes;
    this.time = this.experience.time;
    this.camera = this.experience.camera;

    this.setOrbitControls();
  }

  setOrbitControls() {
    this.controls = new OrbitControls(
      this.camera.orthographicCamera,
      this.canvas,
    );
    this.controls.enableDamping = true;
    this.controls.enableZoom = true;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.listenToKeyEvents(window);

    this.loadCameraState();
    this.controls.addEventListener("end", () => this.saveCameraState());
  }

  loadCameraState() {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("cameraState");
    if (!saved) return;

    try {
      const { position, target, zoom } = JSON.parse(saved);
      if (Array.isArray(position) && Array.isArray(target)) {
        this.camera.orthographicCamera.position.fromArray(position);
        this.controls.target.fromArray(target);
      }
      if (typeof zoom === "number") {
        this.camera.orthographicCamera.zoom = zoom;
      }
      this.camera.orthographicCamera.updateProjectionMatrix();
      this.controls.update();
    } catch (error) {
      console.warn("Failed to restore camera state:", error);
    }
  }

  saveCameraState() {
    if (typeof window === "undefined") return;

    const state = {
      position: this.camera.orthographicCamera.position.toArray(),
      target: this.controls.target.toArray(),
      zoom: this.camera.orthographicCamera.zoom,
    };

    window.localStorage.setItem("cameraState", JSON.stringify(state));
  }

  resize() {}

  update() {
    this.controls.update();
  }
}
