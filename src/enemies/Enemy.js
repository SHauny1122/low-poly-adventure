import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.health = 5;
        this.state = 'idle';
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.detectionRange = 20;
        this.attackRange = 3;
        this.moveSpeed = 0.3;
        this.collisionRadius = 2;
        this.isAnimationLoading = true;
        this.deathAnimationLoaded = false;
        this.isDead = false;
        
        // Load base model first
        const loader = new GLTFLoader();
        loader.load('/models/Skeleton.glb', (gltf) => {
            this.model = gltf.scene;
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Store all animations
            gltf.animations.forEach((clip) => {
                this.animations[clip.name] = this.mixer.clipAction(clip);
            });
            
            this.model.position.copy(this.position);
            this.model.scale.set(3, 3, 3);
            
            // Enable shadows
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(this.model);
            this.isAnimationLoading = false;
            
            this.loadAnimations(loader);
        });
    }

    loadAnimations(loader) {
        // Load idle animation from base model
        loader.load('/models/Skeleton.glb', (gltf) => {
            if (gltf.animations.length > 0) {
                this.animations.idle = this.mixer.clipAction(gltf.animations[0]);
                this.animations.idle.play();
                console.log('Idle animation loaded');
            }
            
            // Load run animation
            loader.load('/models/Skeleton run.glb', (gltf) => {
                if (gltf.animations.length > 0) {
                    this.animations.run = this.mixer.clipAction(gltf.animations[0]);
                    console.log('Run animation loaded');
                    
                    // Load fight animation
                    loader.load('/models/Skeleton fight.glb', (gltf) => {
                        if (gltf.animations.length > 0) {
                            this.animations.attack = this.mixer.clipAction(gltf.animations[0]);
                            console.log('Fight animation loaded');
                            
                            // Load our new death animation
                            loader.load('/models/Skeleton (2).glb', (gltf) => {
                                if (gltf.animations.length > 0) {
                                    // Find the death animation clip
                                    const deathClip = gltf.animations.find(clip => 
                                        clip.name.toLowerCase().includes('death'));
                                    
                                    if (deathClip) {
                                        this.animations.death = this.mixer.clipAction(deathClip);
                                        this.animations.death.setLoop(THREE.LoopOnce);
                                        this.animations.death.clampWhenFinished = true;
                                        console.log('New death animation loaded successfully');
                                    }
                                }
                                this.isAnimationLoading = false;
                            });
                        }
                    });
                }
            });
        });
    }

    update(playerPosition, delta) {
        if (!this.model || !this.mixer || this.state === 'dead' || this.isAnimationLoading) return;
        
        // Update animation mixer with delta time
        if (this.mixer && delta) {
            this.mixer.update(delta);
        }
        
        // Calculate distance to player
        const distance = this.position.distanceTo(playerPosition);
        console.log('Distance to player:', Math.round(distance));
        
        // Update state based on distance
        if (distance <= this.attackRange) {
            if (this.state !== 'attack') {
                console.log('Enemy switching to ATTACK');
                this.setState('attack');
            }
        } else if (distance <= this.detectionRange) {
            if (this.state !== 'run') {
                console.log('Enemy switching to RUN');
                this.setState('run');
            }
            
            // Move towards player more aggressively
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.position)
                .normalize();
            
            // Move faster and more consistently
            const movement = direction.multiplyScalar(this.moveSpeed);
            this.position.add(movement);
            
            if (this.model) {
                // Update model position immediately
                this.model.position.copy(this.position);
                
                // Make enemy face player instantly
                this.model.lookAt(playerPosition);
                
                console.log('Enemy moved to:', 
                    Math.round(this.position.x), 
                    Math.round(this.position.z)
                );
            }
        } else if (this.state !== 'idle') {
            console.log('Enemy switching to IDLE');
            this.setState('idle');
        }
    }

    setState(newState) {
        if (this.state === newState || !this.animations[newState]) return;
        console.log('Enemy state change:', this.state, '->', newState);
        
        // Stop current animation with quick fade
        if (this.animations[this.state]) {
            this.animations[this.state].fadeOut(0.2);
        }
        
        // Start new animation
        const action = this.animations[newState];
        action.reset();
        
        // Special handling for death animation
        if (newState === 'death') {
            console.log('Playing death animation');
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            action.timeScale = 1.0; // Ensure normal playback speed
            action.fadeIn(0.2).play();
            this.state = 'dead';
        } else {
            action.setLoop(THREE.LoopRepeat);
            action.fadeIn(0.2).play();
            this.state = newState;
        }
    }

    takeDamage() {
        this.health--;
        console.log('Enemy took damage! Health:', this.health);
        
        if (this.health <= 0 && !this.isDead) {
            this.isDead = true;
            this.setState('death');
            
            // Drop pink and green gems
            if (typeof window.createGem === 'function') {
                // Reset gem index for new spawn
                window.gemIndex = 0;
                
                // Drop pink gem
                window.createGem(this.model.position.clone(), 'pink');
                console.log('Dropped pink gem from enemy');
                
                // Drop green gems in a triangle formation
                for (let i = 0; i < 3; i++) {
                    window.createGem(this.model.position.clone(), 'green');
                    console.log(`Dropped green gem ${i + 1} from enemy`);
                }
            }
            
            // Remove from scene after delay
            setTimeout(() => {
                if (this.model && this.model.parent) {
                    this.model.parent.remove(this.model);
                }
            }, 1000);
        }
    }

    checkCollision(point) {
        if (!this.model || this.state === 'dead') return false;
        return this.position.distanceTo(point) < this.collisionRadius;
    }

    dispose() {
        if (this.model) {
            this.scene.remove(this.model);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
        }
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
    }
}
