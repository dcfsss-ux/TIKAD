import * as THREE from 'three'
import GSAP from 'gsap'
import { EventEmitter } from 'events'

import Experience from "./Experience"

export default class Preloader extends EventEmitter {
  constructor() {
    super()
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.sizes = this.experience.sizes
    this.camera = this.experience.camera
    this.world = this.experience.world
    this.device = this.sizes.device

    this.sizes.on('switchdevice', (device) => {
      this.device = device
    })

    this.world.on('worldready', () => {
      this.playIntro()
    })
  }

  firstIntro() {
    return new Promise((resolve) => {
      this.timeline = new GSAP.timeline()

      // Fade out the preloader overlay
      this.timeline.to('.preloader', {
        opacity: 0,
        duration: 0.4,
        delay: 0.2,
        onComplete: () => {
          document.querySelector('.preloader').classList.add('hidden')
          resolve()
        }
      })
    })
  }

  async playIntro() {
    await this.firstIntro()
  }

  resize() {}

  update() {}
}
