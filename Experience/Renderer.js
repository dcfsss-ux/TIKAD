import * as THREE from 'three'
import Experience from "./Experience.js"

export default class Renderer {
  constructor() {
    this.experience = new Experience()
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.canvas = this.experience.canvas
    this.camera = this.experience.camera

    // ── Render-on-demand flag ──────────────────────────────────────────────────
    // Set to true whenever something changes (controls move, animation tick,
    // resize, etc.). The update() loop only calls renderer.render() when true,
    // then immediately clears the flag. This drops GPU usage to ~0% when idle.
    this.needsRender = true

    this.setRenderer()
    this._bindVisibilityPause()
  }

  setRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      // powerPreference hints the OS/driver to use the discrete GPU on
      // systems with integrated + discrete graphics. No cost on single-GPU.
      powerPreference: 'high-performance',
    })

    // outputEncoding is deprecated in r152+; use outputColorSpace instead.
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 2.5

    // ── Shadows OFF ────────────────────────────────────────────────────────────
    // The campus map GLB has no castShadow/receiveShadow mesh flags set, so
    // the shadow pass was running every frame for zero visual benefit.
    this.renderer.shadowMap.enabled = false

    // ── Pixel ratio cap ────────────────────────────────────────────────────────
    // Cap at 1.5 on mobile (not 2) — the campus map is top-down and the
    // extra sharpness is imperceptible at arm's length, but the cost is 2.25×.
    const isMobile = this.sizes.device === 'mobile'
    const maxPixelRatio = isMobile ? 1.5 : Math.min(window.devicePixelRatio, 2)
    this.renderer.setPixelRatio(maxPixelRatio)
    this.renderer.setSize(this.sizes.width, this.sizes.height)
  }

  // Pause rendering entirely when the browser tab is hidden (user switched
  // away). Resume and force a single redraw when the tab becomes visible again.
  _bindVisibilityPause() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.needsRender = true
      }
    })
  }

  /** Call this from anywhere to request a re-render on the next tick. */
  requestRender() {
    this.needsRender = true
  }

  resize() {
    const isMobile = this.sizes.device === 'mobile'
    const maxPixelRatio = isMobile ? 1.5 : Math.min(window.devicePixelRatio, 2)
    this.renderer.setPixelRatio(maxPixelRatio)
    this.renderer.setSize(this.sizes.width, this.sizes.height)
    // Always re-render after a resize
    this.needsRender = true
  }

  update() {
    if (!this.needsRender && document.visibilityState !== 'visible') return

    if (this.needsRender) {
      this.renderer.setViewport(0, 0, this.sizes.width, this.sizes.height)
      this.renderer.render(this.scene, this.camera.orthographicCamera)
      this.needsRender = false
    }
  }
}
