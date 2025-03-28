import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Truck {
    constructor() {
        this.model = null;
        this.group = new THREE.Group();
        this.loaded = false;
    }

    async load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            
            // Try to load from the correct path
            const modelPath = '/level2/models/Truck.glb';  // Include level2 prefix
            console.log('Loading Truck from:', modelPath);
            
            loader.load(
                modelPath,
                (gltf) => {
                    console.log('Truck loaded successfully!');
                    this.model = gltf.scene;
                    
                    // Add model to group
                    this.group.add(this.model);
                    
                    // Add some cyberpunk-style glow
                    const glowLight = new THREE.PointLight(0xff0000, 2, 5); // Red glow for the truck
                    glowLight.position.set(0, 0.5, 0);
                    this.group.add(glowLight);
                    
                    this.loaded = true;
                    resolve(this.group);
                },
                (progress) => {
                    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading Truck:', error);
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
