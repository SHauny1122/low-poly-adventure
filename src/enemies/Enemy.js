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
        
        // Load base model first
        const loader = new GLTFLoader();
        loader.load('src/assets/models/Skeleton.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.scale.set(2, 2, 2);
            
            // Enable shadows
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(this.model);
            
            // Setup animation mixer
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Load all animations
            this.loadAnimations(loader);
        });
    }

    loadAnimations(loader) {
        // Load idle animation from base model
        loader.load('src/assets/models/Skeleton.glb', (gltf) => {
            if (gltf.animations.length > 0) {
                this.animations.idle = this.mixer.clipAction(gltf.animations[0]);
                this.animations.idle.play();
                console.log('Idle animation loaded');
            }
            
            // Load run animation
            loader.load('src/assets/models/Skeleton run.glb', (gltf) => {
                if (gltf.animations.length > 0) {
                    this.animations.run = this.mixer.clipAction(gltf.animations[0]);
                    console.log('Run animation loaded');
                    
                    // Load fight animation
                    loader.load('src/assets/models/Skeleton fight.glb', (gltf) => {
                        if (gltf.animations.length > 0) {
                            this.animations.fight = this.mixer.clipAction(gltf.animations[0]);
                            console.log('Fight animation loaded');
                            
                            // Load death animation separately to ensure it's loaded correctly
                            loader.load('src/assets/models/Skeleton dead.glb', (gltf) => {
                                console.log('Death GLB loaded:', gltf);
                                if (gltf.animations.length > 0) {
                                    // Create death animation and configure it
                                    const deathClip = gltf.animations[0];
                                    console.log('Death animation clip:', deathClip);
                                    console.log('Death animation duration:', deathClip.duration);
                                    console.log('Death animation name:', deathClip.name);
                                    
                                    this.animations.death = this.mixer.clipAction(deathClip);
                                    
                                    // Set up death animation properties
                                    this.animations.death.setLoop(THREE.LoopOnce);
                                    this.animations.death.clampWhenFinished = true;
                                    
                                    console.log('Death animation loaded and configured');
                                    this.isAnimationLoading = false;
                                } else {
                                    console.error('No animations found in death model!');
                                }
                            }, 
                            // Add error handler for death animation
                            (xhr) => {
                                console.log('Death animation loading: ' + (xhr.loaded / xhr.total * 100) + '%');
                            },
                            (error) => {
                                console.error('Error loading death animation:', error);
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
            if (this.state !== 'fight') {
                console.log('Enemy switching to FIGHT');
                this.setState('fight');
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
        if (this.state === 'dead') return;
        
        this.health--;
        console.log('Enemy hit! Health:', this.health);
        
        if (this.health <= 0) {
            console.log('Enemy died, playing death animation');
            this.setState('death');
            
            // Remove after death animation finishes (1 second now)
            setTimeout(() => {
                this.dispose();
                // Dispatch event when enemy dies
                window.dispatchEvent(new CustomEvent('enemyDied', {
                    detail: {
                        position: this.position.clone(),
                        enemyType: 'skeleton'
                    }
                }));
            }, 1000); // Changed from 5000 to 1000 ms
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
