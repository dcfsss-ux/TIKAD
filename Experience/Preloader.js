import { EventEmitter } from "events";
import Experience from "./Experience";

/**
 * Preloader.js – Stub kept for backwards-compat.
 * The actual preloader UI is fully managed by mapOverlay.js + preloader.css.
 * GSAP animations to .preloader have been removed to avoid conflicts.
 */
export default class Preloader extends EventEmitter {
  constructor() {
    super();
    this.experience = new Experience();
    this.world = this.experience.world;
    this.sizes = this.experience.sizes;
    this.device = this.sizes.device;

    this.sizes.on("switchdevice", (device) => {
      this.device = device;
    });

    // worldready is handled by mapOverlay.js — nothing to do here.
  }

  resize() {}
  update() {}
}
