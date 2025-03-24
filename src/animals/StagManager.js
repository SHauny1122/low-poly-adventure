import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class StagManager {
    constructor(scene) {
        this.scene = scene;
        this.stags = [];
        this.loader = new GLTFLoader();
        
        // Create stags in random positions
        const stagCount = 30;
        const mapSize = 400; // Size of the playable area
        const minDistanceFromCenter = 50; // Keep away from center/buildings
        
        for (let i = 0; i < stagCount; i++) {
            // Generate random position
            let x, z;
            do {
                x = (Math.random() * 2 - 1) * mapSize;
                z = (Math.random() * 2 - 1) * mapSize;
            } while (Math.sqrt(x * x + z * z) < minDistanceFromCenter); // Keep away from center
            
            this.createStag(new THREE.Vector3(x, 0, z));
        }
    }
    
    createStag(position) {
        this.loader.load('src/assets/models/Stag.glb', (gltf) => {
            const stag = gltf.scene;
            stag.position.copy(position);
            stag.scale.set(3, 3, 3); // We can adjust this scale
            
            // Random rotation so they face different directions
            stag.rotation.y = Math.random() * Math.PI * 2;
            
            // Enable shadows
            stag.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(stag);
            this.stags.push(stag);
            console.log('Stag created at:', position.x, position.z);
        });
    }
    
    update(delta) {
        // Here we could add movement or other behaviors
        // For now, stags are stationary
    }
}
