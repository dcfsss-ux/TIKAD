import * as THREE from 'three'
import Experience from "../Experience.js"
import { EventEmitter } from 'events'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

import Environment from './Environment.js'
import Plateforme10 from './Plateforme10.js'

export default class World extends EventEmitter {
  constructor() {
    super()
    this.experience = new Experience()
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.canvas = this.experience.canvas
    this.camera = this.experience.camera
    this.resources = this.experience.resources

    // ── Progressive building loader ──────────────────────────────────────────
    // Shared GLTF + Draco loader for on-demand building GLBs
    this._dracoLoader = new DRACOLoader()
    this._dracoLoader.setDecoderPath('/draco/')

    // KTX2Loader decodes KHR_texture_basisu (ETC1S/UASTC) textures embedded
    // in compressed GLBs. detectSupport() picks the optimal GPU target format
    // (ASTC, BC7, ETC2, PVRTC…) for the current device.
    this._ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .detectSupport(this.experience.renderer.renderer)

    this._gltfLoader = new GLTFLoader()
    this._gltfLoader.setDRACOLoader(this._dracoLoader)
    this._gltfLoader.setKTX2Loader(this._ktx2Loader)

    this._loadedBuildings = {}   // key → THREE.Object3D, prevents double-loading

    this.resources.on('ready', () => {
      this.environment = new Environment()
      this.plateforme10 = new Plateforme10()
      // Interests (old POI markers) removed — search panel handles building interaction
      this.emit('worldready')
    })
  }

  /**
   * loadBuildingGLB(path, buildingKey)
   *
   * Lazily loads an individual building GLB and adds it to the scene.
   * Emits 'buildingloaded' with { key, scene } when done.
   * Safe to call multiple times — duplicate calls for the same key are ignored.
   *
   * @param {string} path        — URL path to the GLB file (e.g. '/models/map/masawa compress.glb')
   * @param {string} buildingKey — Unique key identifying this building (matches BUILDING_DATA key)
   */
  loadBuildingGLB(path, buildingKey) {
    // Guard: don't load the same building twice
    if (this._loadedBuildings[buildingKey]) return

    // Mark as queued immediately to prevent race-condition double-loads
    this._loadedBuildings[buildingKey] = 'loading'

    this._gltfLoader.load(
      path,
      (gltf) => {
        const model = gltf.scene

        // Apply the same texture fixes used in the base model
        model.traverse((child) => {
          if (!child.isMesh) return

          child.frustumCulled = false

          if (child.name && child.name.includes('Meshy_AI')) {
            child.visible = false
          }

          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            if (!mat) return
            const texSlots = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap']
            texSlots.forEach((slot) => {
              const tex = mat[slot]
              if (!tex) return
              tex.flipY = false
              if (slot === 'map' || slot === 'emissiveMap') {
                tex.colorSpace = THREE.SRGBColorSpace
              }
              tex.needsUpdate = true
            })
            mat.needsUpdate = true
          })
        })

        this.scene.add(model)
        this._loadedBuildings[buildingKey] = model

        // Notify listeners (mapOverlay.js picks this up to register meshes + pins)
        this.emit('buildingloaded', { key: buildingKey, scene: model })
        console.log(`[World] Building loaded: "${buildingKey}"`)

        // Request a render frame so the building appears immediately
        if (this.experience.renderer) {
          this.experience.renderer.requestRender()
        }
      },
      undefined,
      (err) => {
        console.warn(`[World] Failed to load building "${buildingKey}" from ${path}:`, err)
        delete this._loadedBuildings[buildingKey]  // allow retry
      }
    )
  }

  resize() {}

  update() {
    if (this.plateforme10) {
      this.plateforme10.update()
    }
  }
}
