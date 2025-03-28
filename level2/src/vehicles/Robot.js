import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Robot {
    constructor() {
        this.group = new THREE.Group();
        this.loaded = false;
        this.model = null;
        this.mixer = null;
        this.walkAnimation = null;

        // Movement speeds
        this.speed = 0.150;      // Slightly slower than drone
        
        // Street patrol parameters
        this.minZ = -290;        // Start of street
        this.maxZ = 290;         // End of street
        this.currentDirection = 1;// 1 for forward, -1 for backward
        this.patrolX = 0;        // Stay centered on X
        this.patrolY = 0;        // On the ground
        
        // Random offset so robots don't all start at same position
        this.startOffset = Math.random() * (this.maxZ - this.minZ);
    }

    async load() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            const modelPath = '/models/robot.glb';  // Use absolute path from root
            console.log('Loading Robot from:', modelPath);
            
            loader.load(
                modelPath,
                (gltf) => {
                    console.log('Robot loaded successfully!');
                    this.model = gltf.scene;
                    
                    // Set up animation
                    this.mixer = new THREE.AnimationMixer(this.model);
                    if (gltf.animations.length > 0) {
                        this.walkAnimation = this.mixer.clipAction(gltf.animations[0]);
                        this.walkAnimation.play();
                    }
                    
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
                    console.error('Error loading robot:', error);
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

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Update position based on direction
        let newZ = this.group.position.z + (this.speed * this.currentDirection);

        // Check if we need to turn around
        if (newZ >= this.maxZ) {
            this.currentDirection = -1;
            newZ = this.maxZ;
            this.group.rotation.y = Math.PI;  // Face backward
        } else if (newZ <= this.minZ) {
            this.currentDirection = 1;
            newZ = this.minZ;
            this.group.rotation.y = 0;  // Face forward
        }

        // Update position
        this.group.position.set(
            this.patrolX,
            this.patrolY,
            newZ
        );
    }
}
