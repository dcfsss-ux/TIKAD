import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EventEmitter } from "events";
import Experience from "../Experience.js";

export default class Resources extends EventEmitter {
  constructor(assets) {
    super();
    this.experience = new Experience();

    this.assets = assets;

    this.items = {};
    this.queue = this.assets.length;
    this.loaded = 0;
    this.loadingProgress = document.querySelector(".loading-progress");

    this.setLoadingManager();
    this.setLoaders();
    this.startLoading();
  }

  setLoadingManager() {
    this.loadingManager = new THREE.LoadingManager(
      // Loaded
      () => {},
      // Progress
      (itemUrl, itemsLoaded, itemsTotal) => {
        this.progressRatio = (itemsLoaded / itemsTotal) * 100;
        this.loadingProgress.innerHTML = Math.round(this.progressRatio);
      },
    );
  }

  setLoaders() {
    this.loaders = {};
    this.loaders.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.loaders.gltfLoader = new GLTFLoader(this.loadingManager);

    // Draco Loader Setup
    this.loaders.dracoLoader = new DRACOLoader(this.loadingManager);
    this.loaders.dracoLoader.setDecoderPath("/draco/");
    this.loaders.gltfLoader.setDRACOLoader(this.loaders.dracoLoader);

  }

  startLoading() {
    for (const asset of this.assets) {
      if (asset.type === "texture") {
        this.loaders.textureLoader.load(asset.path, (file) => {
          this.singleAssetLoaded(asset, file);
        });
      } else if (asset.type === "glbModel") {
        this.loaders.gltfLoader.load(
          asset.path,
          (file) => {
            this.singleAssetLoaded(asset, file);
          },
          (progress) => {
            if (progress.total) {
              const pct = ((progress.loaded / progress.total) * 100).toFixed(1);
              console.log(`Loading ${asset.name}: ${pct}% (${(progress.loaded / 1024 / 1024).toFixed(0)} MB / ${(progress.total / 1024 / 1024).toFixed(0)} MB)`);
            }
          },
          (error) => {
            console.error(`❌ Failed to load ${asset.name} from ${asset.path}:`, error);
          }
        );
      }
    }
  }

  singleAssetLoaded(asset, file) {
    this.items[asset.name] = file;
    this.loaded++;

    if (this.loaded === this.queue) {
      this.emit("ready");
    }
  }
}
