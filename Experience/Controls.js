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

    this.is2D = false;
    this.saved3DState = null;
    this.sensitivity = {
      mode3D: {
        dampingFactor: 0.08,
        rotateSpeed: 0.3,
        zoomSpeed: 0.6,
        panSpeed: 0.6,
      },
      mode2D: {
        dampingFactor: 0.12,
        zoomSpeed: 0.5,
        panSpeed: 0.4,
      },
      minDistance: 2.5,
      maxDistance: 24,
      minZoom: 0.45,
      maxZoom: 2.1,
    };

    this.setOrbitControls();
  }

  setOrbitControls() {
    this.controls = new OrbitControls(
      this.camera.orthographicCamera,
      this.canvas,
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.sensitivity.mode3D.dampingFactor;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = this.sensitivity.mode3D.zoomSpeed;
    this.controls.rotateSpeed = this.sensitivity.mode3D.rotateSpeed;
    this.controls.panSpeed = this.sensitivity.mode3D.panSpeed;
    this.controls.minDistance = this.sensitivity.minDistance;
    this.controls.maxDistance = this.sensitivity.maxDistance;
    this.controls.minZoom = this.sensitivity.minZoom;
    this.controls.maxZoom = this.sensitivity.maxZoom;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.listenToKeyEvents(window);

    this.loadCameraState();
    this.syncViewToggleButtons();
    this.controls.addEventListener("end", () => this.saveCameraState());
  }

  applySensitivityProfile() {
    if (this.is2D) {
      this.controls.dampingFactor = this.sensitivity.mode2D.dampingFactor;
      this.controls.zoomSpeed = this.sensitivity.mode2D.zoomSpeed;
      this.controls.panSpeed = this.sensitivity.mode2D.panSpeed;
      return;
    }

    this.controls.dampingFactor = this.sensitivity.mode3D.dampingFactor;
    this.controls.zoomSpeed = this.sensitivity.mode3D.zoomSpeed;
    this.controls.rotateSpeed = this.sensitivity.mode3D.rotateSpeed;
    this.controls.panSpeed = this.sensitivity.mode3D.panSpeed;
  }

  setViewMode(mode) {
    if (mode === "2D") {
      if (this.is2D) return;
      this.is2D = true;

      // Save the current 3D camera state to restore it later
      this.saved3DState = {
        position: this.camera.orthographicCamera.position.clone(),
        target: this.controls.target.clone(),
        zoom: this.camera.orthographicCamera.zoom,
      };

      // Restrict OrbitControls to look straight down and prevent rotation
      this.controls.enableRotate = false;
      this.controls.minPolarAngle = 0;
      this.controls.maxPolarAngle = 0;
      this.controls.minAzimuthAngle = Math.PI / 2;
      this.controls.maxAzimuthAngle = Math.PI / 2;

      // Reset azimuth and polar angles to point straight down
      this.controls.update();
      this.applySensitivityProfile();
      this.saveCameraState();
    } else {
      if (!this.is2D) return;
      this.is2D = false;

      // Re-enable rotation
      this.controls.enableRotate = true;
      this.controls.minPolarAngle = 0;
      this.controls.maxPolarAngle = Math.PI / 2;
      this.controls.minAzimuthAngle = -Infinity;
      this.controls.maxAzimuthAngle = Infinity;

      // Restore 3D state
      if (this.saved3DState) {
        this.camera.orthographicCamera.position.copy(
          this.saved3DState.position,
        );
        this.controls.target.copy(this.saved3DState.target);
        this.camera.orthographicCamera.zoom = this.saved3DState.zoom;
      } else {
        // Fallback default 3D camera setup
        this.camera.orthographicCamera.position.set(8.5, 4.5, 3.5);
        this.controls.target.set(0, 0, 0);
        this.camera.orthographicCamera.zoom = 0.65;
      }

      this.camera.orthographicCamera.updateProjectionMatrix();
      this.controls.update();
      this.applySensitivityProfile();
      this.saveCameraState();
    }

    this.syncViewToggleButtons();
  }

  syncViewToggleButtons() {
    if (typeof document === "undefined") return;
    const btn2D = document.getElementById("view-toggle-2d");
    const btn3D = document.getElementById("view-toggle-3d");
    if (btn2D && btn3D) {
      if (this.is2D) {
        btn2D.classList.add("active");
        btn3D.classList.remove("active");
      } else {
        btn3D.classList.add("active");
        btn2D.classList.remove("active");
      }
    }
  }

  loadCameraState() {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("cameraState");
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      const { position, target, zoom, is2D, saved3DState } = state;
      if (Array.isArray(position) && Array.isArray(target)) {
        this.camera.orthographicCamera.position.fromArray(position);
        this.controls.target.fromArray(target);
      }
      if (typeof zoom === "number") {
        this.camera.orthographicCamera.zoom = zoom;
      }

      this.is2D = !!is2D;
      if (saved3DState) {
        this.saved3DState = {
          position: new THREE.Vector3().fromArray(saved3DState.position),
          target: new THREE.Vector3().fromArray(saved3DState.target),
          zoom: saved3DState.zoom,
        };
      }

      if (this.is2D) {
        this.controls.enableRotate = false;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = 0;
        this.controls.minAzimuthAngle = Math.PI / 2;
        this.controls.maxAzimuthAngle = Math.PI / 2;
      } else {
        this.controls.enableRotate = true;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;
      }

      this.applySensitivityProfile();
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
      is2D: this.is2D,
      saved3DState: this.saved3DState
        ? {
            position: this.saved3DState.position.toArray(),
            target: this.saved3DState.target.toArray(),
            zoom: this.saved3DState.zoom,
          }
        : null,
    };

    window.localStorage.setItem("cameraState", JSON.stringify(state));
  }

  resize() {}

  update() {
    this.controls.update();
  }
}
