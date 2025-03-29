import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { getAssetPath } from '../utils/assetLoader';

export class DeLorean {
    constructor() {
        this.model = null;
        this.group = new THREE.Group();
        this.loaded = false;
    }

    async load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            
            // Try to load from the correct path
            const modelPath = getAssetPath('models/DeLorean.glb');  
            console.log('Loading DeLorean from:', modelPath);
            
            loader.load(
                modelPath,
                (gltf) => {
                    console.log('DeLorean loaded successfully!');
                    this.model = gltf.scene;
                    
                    // Add model to group
                    this.group.add(this.model);
                    
                    // Add some cyberpunk-style glow
                    const glowLight = new THREE.PointLight(0x00ffff, 2, 5);
                    glowLight.position.set(0, 0.5, 0);
                    this.group.add(glowLight);
                    
                    this.loaded = true;
                    resolve(this.group);
                },
                (progress) => {
                    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading DeLorean:', error);
                    reject(error);
                }
            );
        });
    }

    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }

    setRotation(x, y, z) {
        this.group.rotation.set(x, y, z);
    }

    setScale(scale) {
        this.group.scale.set(scale, scale, scale);
    }
}
