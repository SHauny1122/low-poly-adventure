import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class VendingMachine {
    constructor() {
        this.group = new THREE.Group();
        this.loaded = false;
        this.model = null;
    }

    async load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            console.log('Loading Vending Machine...');
            
            // The path should match the public directory structure
            loader.load('/models/props/Vending Machine.glb', (gltf) => {
                console.log('Vending Machine loaded successfully!');
                this.model = gltf.scene;
                
                // Add debug info
                console.log('Model scale:', this.model.scale);
                console.log('Model position:', this.model.position);
                console.log('Model rotation:', this.model.rotation);
                
                // Cast shadows
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.group.add(this.model);
                this.loaded = true;
                resolve(this.group);
            }, (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            }, (error) => {
                console.error('Error loading vending machine:', error);
                reject(error);
            });
        });
    }

    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
        console.log('Set vending machine position:', x, y, z);
    }

    setRotation(x, y, z) {
        this.group.rotation.set(x, y, z);
        console.log('Set vending machine rotation:', x, y, z);
    }

    setScale(scale) {
        this.group.scale.set(scale, scale, scale);
        console.log('Set vending machine scale:', scale);
    }
}
