import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class VendingMachine {
    constructor() {
        this.model = null;
        this.group = new THREE.Group();
        this.loaded = false;
    }

    async load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            console.log('Loading Vending Machine...');
            
            loader.load(
                '/models/props/Vending Machine.glb',  // Exact case match
                (gltf) => {
                    this.model = gltf.scene;
                    this.group.add(this.model);
                    this.loaded = true;
                    resolve(this.group);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(2);
                        console.log('Loading progress:', percent + '%');
                    }
                },
                (error) => {
                    console.error('Error loading vending machine:', error);
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
        if (typeof scale === 'number') {
            this.group.scale.set(scale, scale, scale);
        } else if (Array.isArray(scale) || (scale && typeof scale === 'object' && 'x' in scale)) {
            const { x = 1, y = 1, z = 1 } = scale;
            this.group.scale.set(x, y, z);
        }
    }
}
