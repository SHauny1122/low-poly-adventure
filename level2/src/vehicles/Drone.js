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
            const modelPath = '/models/vehicles/BotDrone.glb';
            console.log('Loading Drone from:', modelPath);
            
            // Add error handler for the loader
            loader.onError = (error) => {
                console.error('Loader error:', error);
            };
            
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
                    console.error('Full error details:', error.target?.status, error.target?.statusText);
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

        // Update time
        this.time += delta;

        // Calculate bobbing motion
        const bobOffset = Math.sin(this.time * this.bobSpeed) * this.bobHeight;

        // Update Z position (moving up and down the street)
        this.group.position.z += this.speed * this.currentDirection;

        // Check if we need to turn around
        if (this.group.position.z >= this.maxZ) {
            this.currentDirection = -1;
            this.group.rotation.y = Math.PI; // Turn to face the other way
        } else if (this.group.position.z <= this.minZ) {
            this.currentDirection = 1;
            this.group.rotation.y = 0; // Turn to face forward
        }

        // Update position
        this.group.position.x = this.patrolX;
        this.group.position.y = this.patrolY + bobOffset;
    }
}
