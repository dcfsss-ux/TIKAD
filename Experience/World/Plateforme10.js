import * as THREE from 'three'
import Experience from '../Experience.js'

export default class MapModel {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.debug = this.experience.debug

    // Load your custom GLB model
    this.mapModel = this.resources.items.plateforme10
    this.actualModel = this.mapModel.scene

    this.setModel()
  }

  setModel() {
    // Log all mesh names — use these in main.js for the search/highlight feature
    console.log('=== GLB Mesh Names (use these for building search) ===')
    this.actualModel.traverse((child) => {
      if (child.isMesh) {
        console.log(' -', child.name)

        // Ensure textures from the GLB display correctly
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            if (mat.map) {
              mat.map.flipY = false
            }
          })
        }
      }
    })

    // Add the model to the scene as-is (uses materials baked into the GLB)
    this.scene.add(this.actualModel)
    console.log('Custom GLB map model loaded successfully.')
  }

  resize() {}

  update() {}
}
