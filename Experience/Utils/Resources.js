import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
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
    if (!this.loadingProgress) {
      this.loadingProgress = document.createElement('div');
      this.loadingProgress.className = 'loading-progress';
      document.body.appendChild(this.loadingProgress);
    }

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

    // KTX2 Loader Setup
    this.loaders.ktx2Loader = new KTX2Loader(this.loadingManager);
    this.loaders.ktx2Loader.setTranscoderPath("/basis/");
    this.loaders.ktx2Loader.detectSupport(this.experience.renderer.renderer);
    this.loaders.gltfLoader.setKTX2Loader(this.loaders.ktx2Loader);

  }

  startLoading() {
    for (const asset of this.assets) {
      if (asset.type === "texture") {
        this.loaders.textureLoader.load(
          asset.path,
          (file) => {
            this.singleAssetLoaded(asset, file);
          },
          undefined,
          (error) => {
            console.error(`❌ Failed to load texture ${asset.name} from ${asset.path}:`, error);
            this.singleAssetLoaded(asset, null);
          }
        );
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
            this.singleAssetLoaded(asset, null);
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
