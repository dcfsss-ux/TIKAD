import * as THREE from 'three'
import Experience from '../Experience.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

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
    // With useLegacyLights = false (physically correct mode), intensities must
    // be much lower than legacy values to avoid blowing materials to white.
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    this.scene.add(this.ambientLight)

    // Directional light from above to add subtle depth
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.directionalLight.position.set(5, 10, 5)
    this.scene.add(this.directionalLight)

    // Neutral grey envmap so PBR materials have a reflection source
    // and colours/textures render correctly instead of appearing white.
    const pmrem = new THREE.PMREMGenerator(this.experience.renderer.renderer)
    pmrem.compileEquirectangularShader()
    const neutralEnv = pmrem.fromScene(new RoomEnvironment()).texture
    this.scene.environment = neutralEnv
    this.scene.environmentIntensity = 0.5
    pmrem.dispose()
  }

  resize() {}

  update() {}
}
