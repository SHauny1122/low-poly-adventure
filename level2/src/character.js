import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { getAssetPath } from './utils/assetLoader';

export class Character {
    constructor() {
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.isRunning = false;
        this.isShooting = false;
        this.moveSpeed = 1;    // Reduced to 1 for even slower walking
        this.runSpeed = 4;     // Kept running speed the same
        this.rotationSpeed = 0.15; // Added smooth rotation
        this.currentRotation = 0;
        this.group = new THREE.Group();
        this.loaded = false;
        this.loadModel();
    }

    async load() {
        return new Promise((resolve, reject) => {
            if (this.loaded) {
                resolve(this.group);
            } else {
                const intervalId = setInterval(() => {
                    if (this.loaded) {
                        clearInterval(intervalId);
                        resolve(this.group);
                    }
                }, 100);
            }
        });
    }

    async loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(path,
                (gltf) => resolve(gltf),
                undefined,
                (error) => {
                    console.error('Error loading model:', path, error);
                    reject(error);
                }
            );
        });
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load(getAssetPath('models/character/Astronaut.glb'), (gltf) => {
            const model = gltf.scene;
            model.scale.set(1, 1, 1); // Back to original size
            this.group.add(model);
            this.model = model;
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Store all animations from base model
            if (gltf.animations && gltf.animations.length > 0) {
                gltf.animations.forEach(anim => {
                    this.animations[anim.name] = anim;
                });
            }
            
            // Play idle animation by default
            this.playAnimation('CharacterArmature|Idle', 0.3);
            this.loaded = true;
        }, undefined, (error) => {
            console.error('Error loading character:', error);
        });
    }

    async loadAnimation(loader, name, path) {
        try {
            const gltf = await this.loadModel(loader, path);
            if (gltf.animations && gltf.animations.length > 0) {
                this.animations[name] = gltf.animations[0];
            }
        } catch (error) {
            console.error('Error loading animation', name + ':', error);
        }
    }

    playAnimation(name, duration = 0.2) {
        if (!this.mixer || !this.animations[name]) {
            console.warn(`Cannot play animation ${name}`);
            return;
        }

        // Don't restart the same animation
        if (this.currentAnimation && this.currentAnimation.getClip().name === name) {
            return;
        }

        const action = this.mixer.clipAction(this.animations[name]);
        
        // Set animation speed based on state
        if (name === 'CharacterArmature|Run') {
            action.setEffectiveTimeScale(1.0);
        } else if (name === 'CharacterArmature|Walk') {
            action.setEffectiveTimeScale(1.0); // Increased from 0.7 to match walking pace
        } else {
            action.setEffectiveTimeScale(1.0);
        }

        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(duration);
        }
        
        action.reset()
             .setEffectiveWeight(1)
             .fadeIn(duration)
             .play();
        
        this.currentAnimation = action;
    }

    move(direction, running = false) {
        if (!this.model) return;

        const speed = running ? this.runSpeed : this.moveSpeed;
        
        if (direction.length() === 0) {
            // No movement, play idle animation
            this.isRunning = false;
            this.playAnimation('CharacterArmature|Idle', 0.3);
        } else {
            // Moving, play appropriate animation
            this.isRunning = running;
            
            // Calculate target rotation to face movement direction
            const targetRotation = Math.atan2(direction.x, direction.z);
            
            // Smoothly rotate towards target rotation
            const rotationDiff = targetRotation - this.currentRotation;
            
            // Normalize the rotation difference to [-PI, PI]
            let normalizedDiff = rotationDiff;
            while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
            while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
            
            // Apply smooth rotation
            this.currentRotation += normalizedDiff * this.rotationSpeed;
            this.model.rotation.y = this.currentRotation;
            
            // Use walk animation for normal movement, run animation for running
            const animName = running ? 'CharacterArmature|Run' : 'CharacterArmature|Walk';
            this.playAnimation(animName, 0.3);
            
            // Move model with delta time
            const delta = 1/60;
            this.model.position.x += direction.x * speed * delta;
            this.model.position.z += direction.z * speed * delta;
        }
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    getPosition() {
        return this.group ? this.group.position : new THREE.Vector3();
    }

    getRotation() {
        return this.group ? this.group.rotation : new THREE.Euler();
    }

    setShooting(shooting) {
        if (this.isShooting !== shooting) {
            this.isShooting = shooting;
            if (this.isRunning) {
                this.playAnimation(shooting ? 'CharacterArmature|RunShoot' : 'CharacterArmature|Run');
            }
        }
    }
}
