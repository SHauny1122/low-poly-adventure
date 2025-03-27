import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Drone {
    constructor() {
        this.group = new THREE.Group();
        this.loaded = false;
        this.model = null;

        // Movement speeds
        this.speed = 0.200;      // Current speed
        this.bobSpeed = 0.150;   // Up/down motion speed
        this.bobHeight = 0.6;    // Up/down motion height
        
        // Street patrol parameters
        this.minZ = -290;        // Start of street
        this.maxZ = 290;         // End of street
        this.currentDirection = 1;// 1 for forward, -1 for backward
        this.patrolX = 0;        // Stay centered on X
        this.patrolY = 8;        // Height above street
        this.time = Math.random() * Math.PI * 2; // Random start time for bobbing
    }

    async load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            const modelPath = '/models/BotDrone.glb';
            console.log('Loading Drone from:', modelPath);
            
            loader.load(
                modelPath,
                (gltf) => {
                    console.log('Drone loaded successfully!');
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
                    console.error('Error loading drone:', error);
                    console.error('Was trying to load from:', modelPath);
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

    update(delta) {
        if (!this.loaded) return;

        // Update position based on direction
        let newZ = this.group.position.z + (this.speed * this.currentDirection);

        // Check if we need to turn around
        if (newZ >= this.maxZ) {
            this.currentDirection = -1;
            newZ = this.maxZ;
        } else if (newZ <= this.minZ) {
            this.currentDirection = 1;
            newZ = this.minZ;
        }

        // Update time for bobbing motion
        this.time += delta;

        // Calculate bobbing motion
        const bobOffset = Math.sin(this.time * this.bobSpeed) * this.bobHeight;

        // Update position with bobbing
        this.group.position.set(
            this.patrolX,
            this.patrolY + bobOffset,
            newZ
        );

        // Update rotation to face movement direction
        const targetRotation = this.currentDirection > 0 ? 0 : Math.PI;
        this.group.rotation.y = targetRotation;
    }
}
