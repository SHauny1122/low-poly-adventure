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
            } while (Math.sqrt(x * x + z * z) < minDistanceFromCenter);
            
            this.createStag(new THREE.Vector3(x, 0, z));
        }
    }
    
    createStag(position) {
        // First load the base model with idle/eating animation
        this.loader.load('src/assets/models/Stag.glb', (gltf) => {
            const stag = gltf.scene;
            stag.position.copy(position);
            stag.scale.set(1, 1, 1);
            stag.rotation.y = Math.random() * Math.PI * 2;
            
            // Enable shadows
            stag.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Setup animations
            const mixer = new THREE.AnimationMixer(stag);
            const animations = {
                eat: mixer.clipAction(gltf.animations[0]),
                walk: null,
                mixer: mixer
            };
            
            // Configure eat animation
            animations.eat.setLoop(THREE.LoopRepeat);
            
            // Load walk animation from second file
            this.loader.load('src/assets/models/Stag (2).glb', (walkGltf) => {
                animations.walk = mixer.clipAction(walkGltf.animations[0]);
                animations.walk.setLoop(THREE.LoopRepeat);
                
                // Start behavior cycle
                this.startBehaviorCycle(stag, animations);
            });
            
            // Store stag info
            this.stags.push({
                model: stag,
                animations: animations,
                state: 'eating',
                nextStateChange: Date.now() + 10000, // 10 seconds
                originalPosition: position.clone(),
                targetPosition: null,
                moveSpeed: 2 // units per second
            });
            
            this.scene.add(stag);
            console.log('Stag created at:', position.x, position.z);
        });
    }
    
    startBehaviorCycle(stag, animations) {
        const stagInfo = this.stags.find(s => s.model === stag);
        if (!stagInfo) return;
        
        // Start with eating
        this.setState(stagInfo, 'eating');
    }
    
    setState(stagInfo, newState) {
        if (stagInfo.state === newState) return;
        
        // Fade out current animation
        if (stagInfo.animations[stagInfo.state]) {
            stagInfo.animations[stagInfo.state].fadeOut(0.5);
        }
        
        // Setup new state
        stagInfo.state = newState;
        if (newState === 'eating') {
            stagInfo.animations.eat.reset().fadeIn(0.5).play();
            // Stay in place while eating
            stagInfo.targetPosition = null;
        } else if (newState === 'walking') {
            stagInfo.animations.walk.reset().fadeIn(0.5).play();
            // Pick a random point to walk to within 20 units
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 10;
            const target = new THREE.Vector3(
                stagInfo.originalPosition.x + Math.cos(angle) * distance,
                0,
                stagInfo.originalPosition.z + Math.sin(angle) * distance
            );
            stagInfo.targetPosition = target;
            
            // Rotate stag to face walking direction
            const direction = target.clone().sub(stagInfo.model.position);
            stagInfo.model.rotation.y = Math.atan2(direction.x, direction.z);
        }
        
        // Schedule next state change in 10 seconds
        stagInfo.nextStateChange = Date.now() + 10000;
    }
    
    update(delta) {
        // Update all stags
        for (const stagInfo of this.stags) {
            // Update animation mixer
            if (stagInfo.animations.mixer) {
                stagInfo.animations.mixer.update(delta);
            }
            
            // Check if it's time to change state
            if (Date.now() >= stagInfo.nextStateChange) {
                this.setState(stagInfo, stagInfo.state === 'eating' ? 'walking' : 'eating');
            }
            
            // Handle walking movement
            if (stagInfo.state === 'walking' && stagInfo.targetPosition) {
                const direction = stagInfo.targetPosition.clone().sub(stagInfo.model.position);
                const distance = direction.length();
                
                if (distance > 0.1) { // If not at target
                    direction.normalize();
                    const movement = direction.multiplyScalar(stagInfo.moveSpeed * delta);
                    stagInfo.model.position.add(movement);
                }
            }
        }
    }
}
