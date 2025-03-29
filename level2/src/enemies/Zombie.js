import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Zombie {
    constructor() {
        this.group = new THREE.Group();
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.loaded = false;
        this.health = 100;
        this.isDead = false;
        this.speed = 0.5 + Math.random() * 0.3; // Random speed for variety
        
        // Target for the zombie to move towards (usually the player)
        this.target = null;
        
        // Detection range
        this.detectionRange = 20;
        
        // Load the model
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
    
    loadModel() {
        const loader = new GLTFLoader();
        
        // Load the animated zombie model
        loader.load('/models/character/Animated Zombie.glb', (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.8, 0.8, 0.8); // Adjust scale as needed
            this.group.add(model);
            this.model = model;
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Store animations
            if (gltf.animations && gltf.animations.length > 0) {
                // Assuming the first animation is walking
                this.animations['walk'] = gltf.animations[0];
                
                // If there are more animations, we can use them for other states
                if (gltf.animations.length > 1) {
                    this.animations['hit'] = gltf.animations[1];
                }
                if (gltf.animations.length > 2) {
                    this.animations['dead'] = gltf.animations[2];
                }
            }
            
            // Play walking animation by default
            this.playAnimation('walk');
            this.loaded = true;
        }, undefined, (error) => {
            console.error('Error loading zombie model:', error);
        });
    }
    
    playAnimation(name, duration = 0.5) {
        if (!this.mixer || !this.animations[name]) {
            console.warn(`Cannot play zombie animation ${name}`);
            return;
        }
        
        // Don't restart the same animation
        if (this.currentAnimation && this.currentAnimation.getClip().name === name) {
            return;
        }
        
        const action = this.mixer.clipAction(this.animations[name]);
        
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(duration);
        }
        
        action.reset()
             .setEffectiveWeight(1)
             .fadeIn(duration)
             .play();
        
        this.currentAnimation = action;
        
        // If playing death animation, set it to play once and not loop
        if (name === 'dead') {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
        }
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
    
    setTarget(target) {
        this.target = target;
    }
    
    takeDamage(amount) {
        if (this.isDead) return;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.die();
        } else {
            // Play hit reaction
            this.playAnimation('hit', 0.2);
            
            // After hit animation, go back to walking
            setTimeout(() => {
                if (!this.isDead) {
                    this.playAnimation('walk', 0.2);
                }
            }, 500);
        }
    }
    
    die() {
        this.isDead = true;
        this.playAnimation('dead');
        
        // Remove from physics/collision after a delay
        setTimeout(() => {
            this.group.userData.noCollision = true;
        }, 1000);
    }
    
    update(delta) {
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }
        
        // If dead, don't move
        if (this.isDead) return;
        
        // Move towards target if set and within detection range
        if (this.target && this.target.getPosition) {
            const targetPos = this.target.getPosition();
            const distance = this.group.position.distanceTo(targetPos);
            
            // Only chase if within detection range
            if (distance < this.detectionRange) {
                // Calculate direction to target
                const direction = new THREE.Vector3()
                    .subVectors(targetPos, this.group.position)
                    .normalize();
                
                // Move towards target
                this.group.position.x += direction.x * this.speed * delta;
                this.group.position.z += direction.z * this.speed * delta;
                
                // Rotate to face target
                const angle = Math.atan2(direction.x, direction.z);
                this.group.rotation.y = angle;
            }
        }
    }
    
    // Check if zombie is close enough to attack player
    canAttack(player) {
        if (this.isDead) return false;
        
        const playerPos = player.getPosition();
        const distance = this.group.position.distanceTo(playerPos);
        
        return distance < 2; // Attack range
    }
    
    // Get position for targeting
    getPosition() {
        return this.group.position;
    }
}
