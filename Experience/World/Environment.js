import * as THREE from 'three'
import Experience from '../Experience.js'

export default class Environment {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.debug = this.experience.debug

    // Debug
    if(this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('environment')
      this.obj = {
        colorObj: {r:0 , g: 0, b: 0}
      }
    }

    // Setup
    this.setBackground()
    this.setLights()
  }

  setBackground() {
    this.bgColor = 0xd6d2ca
    this.scene.background = new THREE.Color(this.bgColor)
    // Fog removed — it was causing the black gradient clipping at the view edges
  }

  setLights() {
    // Bright ambient light so the entire model is evenly illuminated
    this.ambientLight = new THREE.AmbientLight(0xffffff, 3.0)
    this.scene.add(this.ambientLight)

    // Directional light from above to add subtle depth
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
    this.directionalLight.position.set(5, 10, 5)
    this.scene.add(this.directionalLight)
  }

  resize() {}

  update() {}
}
