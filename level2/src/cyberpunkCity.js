import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { getAssetPath } from './utils/assetLoader';

export class CyberpunkCity {
    constructor() {
        this.group = new THREE.Group();
        this.colliders = []; // Array to store building colliders
        this.buildingInstances = []; // Store building instances for culling
        this.lightInstances = []; // Store light instances for culling
        this.mixer = null;
        this.zombie = null;
        this.zombieDirection = 1;
        this.clock = new THREE.Clock();
        
        // Zombie spawning system
        this.zombieSpawnSystem = {
            maxZombies: 5,
            activeZombies: 0,
            spawnRadius: { min: 50, max: 100 }, // Min and max distance from player
            nextSpawnTime: 0,
            spawnDelay: 5000, // 5 seconds between spawns
        };

        this.zombieState = {
            health: 3,
            isHit: false,
            isDead: false,
            currentAction: null,
            animations: {}
        };
        this.raycaster = new THREE.Raycaster();

        // Register shot handler with both window.scene and scene
        const shotHandler = (crosshairPosition) => {
            console.log('Shot detected, checking zombie hit...');
            return this.handleShot(crosshairPosition);
        };

        if (window.scene) {
            window.scene.onShot = shotHandler;
        }

        this.group.onShot = shotHandler;

        this.createStreet();
        this.createBuildings();
        this.createStreetLights();
        
        // Start zombie spawning system after a short delay to let everything load
        setTimeout(() => this.startZombieSpawning(), 2000);
    }

    loadZombieAnimations() {
        const loader = new GLTFLoader();
        const animations = {};
        
        // Load walk animation
        loader.load(getAssetPath('models/Zombiewalk.glb'), (gltf) => {
            console.log('Zombie model loaded');
            
            // Set up the zombie
            this.zombie = gltf.scene;
            this.zombie.scale.set(0.7, 0.7, 0.7);
            this.zombie.position.set(-3, 0, -200);
            this.zombie.rotation.y = 0;
            
            // Store walk animation
            this.zombieState.animations.walk = gltf.animations.find(a => a.name === 'Armature|Walk');
            console.log('Walk animation loaded');
            
            // Set up the mixer
            this.mixer = new THREE.AnimationMixer(this.zombie);
            
            // Start walking
            this.playAnimation('walk');
            
            this.group.add(this.zombie);
            this.startAnimationLoop();

            // Load hit reaction animation
            loader.load(getAssetPath('models/Zombiehitreaction.glb'), (gltf) => {
                this.zombieState.animations.hit = gltf.animations[0];
                console.log('Hit animation loaded');
            });

            // Load death animation
            loader.load(getAssetPath('models/Zombiedead.glb'), (gltf) => {
                this.zombieState.animations.death = gltf.animations[0];
                console.log('Death animation loaded and ready');
            });
        });
    }

    playAnimation(animationName, loop = true) {
        if (this.zombieState.currentAction) {
            this.zombieState.currentAction.stop();
        }

        if (this.zombieState.animations[animationName] && this.mixer) {
            console.log('Playing animation:', animationName);
            const action = this.mixer.clipAction(this.zombieState.animations[animationName]);
            if (!loop) {
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
            }
            action.play();
            this.zombieState.currentAction = action;
        } else {
            console.log('Animation not found:', animationName, 'Available animations:', Object.keys(this.zombieState.animations));
        }
    }

    handleShot(crosshairPosition) {
        if (!window.combatCamera) {
            console.log('No combat camera found!');
            return false;
        }

        this.raycaster.setFromCamera(crosshairPosition, window.combatCamera);
        
        // Check all zombies for hits
        const zombies = this.group.children.filter(child => child.userData && child.userData.state);
        
        for (const zombie of zombies) {
            const state = zombie.userData.state;
            
            // Skip dead or already hit zombies
            if (state.isDead || state.isHit) continue;
            
            const intersects = this.raycaster.intersectObject(zombie, true);
            
            if (intersects.length > 0) {
                console.log('Zombie hit! Health:', state.health);
                state.health--;
                state.isHit = true;
                
                if (state.health <= 0) {
                    console.log('Zombie killed!');
                    state.isDead = true;
                    
                    if (state.currentAction) {
                        state.currentAction.stop();
                    }
                    
                    // Play death animation
                    if (state.animations.death && state.mixer) {
                        const deathAction = state.mixer.clipAction(state.animations.death);
                        deathAction.setLoop(THREE.LoopOnce);
                        deathAction.clampWhenFinished = true;
                        deathAction.play();
                        state.currentAction = deathAction;
                        
                        // Remove zombie after animation
                        setTimeout(() => {
                            this.group.remove(zombie);
                            this.zombieSpawnSystem.activeZombies--;
                            console.log('Zombie removed, remaining:', this.zombieSpawnSystem.activeZombies);
                        }, 3000);
                    }
                } else {
                    // Play hit animation
                    if (state.animations.hit && state.mixer) {
                        const hitAction = state.mixer.clipAction(state.animations.hit);
                        hitAction.setLoop(THREE.LoopOnce);
                        hitAction.clampWhenFinished = true;
                        hitAction.play();
                        state.currentAction = hitAction;
                        
                        // Resume walking after hit
                        setTimeout(() => {
                            state.isHit = false;
                            if (!state.isDead && state.animations.walk) {
                                const walkAction = state.mixer.clipAction(state.animations.walk);
                                walkAction.play();
                                state.currentAction = walkAction;
                            }
                        }, 1000);
                    }
                }
                return true;
            }
        }
        return false;
    }

    startAnimationLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (this.mixer && this.zombie) {
                const delta = this.clock.getDelta();
                
                // Update animation
                this.mixer.update(delta);
                
                // Only move if not being hit or dead
                if (!this.zombieState.isHit && !this.zombieState.isDead) {
                    // Move zombie
                    const speed = 2;
                    this.zombie.position.z += this.zombieDirection * speed * delta;
                    
                    // Check boundaries and turn around
                    if (this.zombie.position.z > 250) {
                        this.zombieDirection = -1;
                        this.zombie.rotation.y = Math.PI;
                    } else if (this.zombie.position.z < -250) {
                        this.zombieDirection = 1;
                        this.zombie.rotation.y = 0;
                    }
                }
            }
        };
        
        animate();
    }

    createStreet() {
        // Create road - make it even longer
        const roadGeometry = new THREE.PlaneGeometry(20, 600); // Doubled length to 600
        const roadMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            shininess: 30,
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0;
        
        // Add neon lines on the road
        const lineGeometry = new THREE.PlaneGeometry(0.1, 600); // Match road length
        const lineMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2,
        });
        
        const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
        leftLine.rotation.x = -Math.PI / 2;
        leftLine.position.set(-5, 0.01, 0);
        
        const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
        rightLine.rotation.x = -Math.PI / 2;
        rightLine.position.set(5, 0.01, 0);

        // Add crosswalk lines - even more for the longer road
        for (let i = -24; i <= 24; i++) { // Doubled number of crosswalks
            const crosswalkLine = new THREE.Mesh(
                new THREE.PlaneGeometry(4, 0.5),
                new THREE.MeshPhongMaterial({ color: 0xffffff })
            );
            crosswalkLine.rotation.x = -Math.PI / 2;
            crosswalkLine.position.set(0, 0.01, i * 20);
            this.group.add(crosswalkLine);
        }

        this.group.add(road);
        this.group.add(leftLine);
        this.group.add(rightLine);
    }

    createBuildings() {
        // Create buildings on both sides - doubled number of buildings
        for (let side of [-1, 1]) {
            for (let i = -24; i < 25; i++) { // Doubled number of buildings
                this.createBuilding(
                    side * 15, // x position (left or right of road)
                    0,        // y position (ground level)
                    i * 12,   // z position (along the road)
                );
            }
        }
    }

    createBuilding(x, y, z) {
        const height = 10 + Math.random() * 20;
        const width = 8 + Math.random() * 4;
        const depth = 8 + Math.random() * 4;

        // Main building - use BufferGeometry for better performance
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshPhongMaterial({
            color: 0x303040,
            shininess: 50,
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, y + height/2, z);
        
        // Enable frustum culling
        building.frustumCulled = true;
        this.buildingInstances.push(building);

        // Add building collider
        const collider = {
            minX: x - width/2,
            maxX: x + width/2,
            minZ: z - depth/2,
            maxZ: z + depth/2
        };
        this.colliders.push(collider);

        // Reduce number of neon strips for distant buildings
        const distanceFromCenter = Math.abs(z);
        const stripCount = distanceFromCenter > 100 ? 2 : Math.floor(Math.random() * 4) + 2;

        // Add vertical neon strips
        for (let i = 0; i < stripCount; i++) {
            const stripHeight = height * (0.3 + Math.random() * 0.5);
            const stripGeometry = new THREE.BoxGeometry(0.1, stripHeight, 0.1);
            const stripColor = this.getRandomNeonColor();
            const stripMaterial = new THREE.MeshPhongMaterial({
                color: stripColor,
                emissive: stripColor,
                emissiveIntensity: 2,
            });

            const strip = new THREE.Mesh(stripGeometry, stripMaterial);
            strip.frustumCulled = true;

            // Position strips
            const xOffset = (Math.random() - 0.5) * (width - 0.2);
            const zOffset = (Math.random() < 0.5 ? -1 : 1) * depth/2;
            strip.position.set(
                building.position.x + xOffset,
                building.position.y,
                building.position.z + zOffset
            );

            this.group.add(strip);
        }

        // Add windows
        const windowSize = 0.8;
        const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x88ccff,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9,
        });

        // Create window grid
        const windowRows = Math.floor(height / 2);
        const windowCols = Math.floor(width / 2);

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.2) { // 80% chance of window
                    const windowPane = new THREE.Mesh(windowGeometry, windowMaterial.clone());
                    windowPane.material.emissiveIntensity = 0.5 + Math.random() * 0.5; // Random brightness
                    windowPane.position.set(
                        x - width/2 + col * 2 + 1,
                        y + row * 2 + 1,
                        z + depth/2 + 0.1
                    );
                    this.group.add(windowPane);

                    // Add window to back side too
                    const backWindow = new THREE.Mesh(windowGeometry, windowMaterial.clone());
                    backWindow.material.emissiveIntensity = 0.5 + Math.random() * 0.5;
                    backWindow.position.set(
                        x - width/2 + col * 2 + 1,
                        y + row * 2 + 1,
                        z - depth/2 - 0.1
                    );
                    backWindow.rotation.y = Math.PI;
                    this.group.add(backWindow);
                }
            }
        }

        // Add balconies
        const balconyCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < balconyCount; i++) {
            const balconyGeometry = new THREE.BoxGeometry(2, 0.2, 1);
            const balconyMaterial = new THREE.MeshPhongMaterial({ color: 0x505050 });
            const balcony = new THREE.Mesh(balconyGeometry, balconyMaterial);
            balcony.position.set(
                x + (Math.random() - 0.5) * (width - 2),
                y + Math.random() * (height - 5) + 2,
                z + depth/2 + 0.5
            );
            this.group.add(balcony);

            // Add railing
            const railingGeometry = new THREE.BoxGeometry(2, 1, 0.1);
            const railing = new THREE.Mesh(railingGeometry, balconyMaterial);
            railing.position.set(balcony.position.x, balcony.position.y + 0.6, balcony.position.z + 0.45);
            this.group.add(railing);
        }

        // Add neon signs
        const signCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < signCount; i++) {
            const signGeometry = new THREE.BoxGeometry(3, 1, 0.2);
            const signColor = this.getRandomNeonColor();
            const signMaterial = new THREE.MeshPhongMaterial({
                color: signColor,
                emissive: signColor,
                emissiveIntensity: 2,
            });
            const sign = new THREE.Mesh(signGeometry, signMaterial);
            sign.position.set(
                x + (Math.random() - 0.5) * (width - 3),
                y + height/2 + Math.random() * (height * 0.3),
                z + depth/2 + 0.2
            );
            this.group.add(sign);
        }

        // Add rooftop structures
        const roofStructureCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < roofStructureCount; i++) {
            // Add water tanks or AC units
            const tankGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2);
            const tankMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
            const tank = new THREE.Mesh(tankGeometry, tankMaterial);
            tank.position.set(
                x + (Math.random() - 0.5) * (width - 2),
                y + height + 1,
                z + (Math.random() - 0.5) * (depth - 2)
            );
            this.group.add(tank);
        }

        // Add antennas
        const antennaCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < antennaCount; i++) {
            const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
            const antennaMaterial = new THREE.MeshPhongMaterial({
                color: 0x888888,
            });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(
                x + (Math.random() - 0.5) * (width - 1),
                y + height + 1.5,
                z + (Math.random() - 0.5) * (depth - 1)
            );
            this.group.add(antenna);
        }

        // Add holographic displays
        const holoCount = Math.floor(Math.random() * 2) + 1; // 1-2 holos per building
        for (let i = 0; i < holoCount; i++) {
            // Create hologram frame
            const frameGeometry = new THREE.BoxGeometry(3, 4, 0.1);
            const frameMaterial = new THREE.MeshPhongMaterial({
                color: 0x0088ff,
                emissive: 0x0088ff,
                emissiveIntensity: 1,
                shininess: 100
            });
            
            // Create hologram "screen"
            const screenGeometry = new THREE.PlaneGeometry(2.8, 3.8);
            const screenMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.3,
            });
            const screen = new THREE.Mesh(screenGeometry, screenMaterial);
            
            // Position frame and screen
            frameGeometry.translate(0, 0, 0.05);
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.set(x + width/2 + 0.1, height/2, z);
            screen.position.set(x + width/2 + 0.15, height/2, z);
            
            this.group.add(frame);
            this.group.add(screen);

            // Store original position for animation
            frame.userData.originalY = frame.position.y;
            
            // Animate hologram
            const animateHologram = () => {
                requestAnimationFrame(animateHologram);
                frame.position.y = frame.userData.originalY + Math.sin(Date.now() * 0.01) * 0.1;
            };
            animateHologram();
        }

        this.group.add(building);
    }

    createStreetLights() {
        // Create a reusable geometry and materials for street lights
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 6);
        const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });
        const lightGeometry = new THREE.BoxGeometry(0.5, 2, 0.5);

        // Add street lamps on both sides
        for (let side of [-1, 1]) {
            for (let i = -24; i <= 24; i++) {
                const distanceFromCenter = Math.abs(i * 12);
                // Skip some lights for distant areas
                if (distanceFromCenter > 100 && i % 2 !== 0) continue;

                this.createStreetLight(side * 8, i * 12, side, poleGeometry, poleMaterial, lightGeometry);
            }
        }
    }

    createStreetLight(x, z, side, poleGeometry, poleMaterial, lightGeometry) {
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(x, 2.5, z);

        const armGeometry = new THREE.BoxGeometry(2, 0.1, 0.1);
        const arm = new THREE.Mesh(armGeometry, poleMaterial);
        arm.position.set(0, 2.3, 0);
        // Rotate based on which side of the street the light is on
        arm.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        pole.add(arm);

        const lamp = new THREE.Mesh(lightGeometry, new THREE.MeshPhongMaterial({
            color: 0xffff99,
            emissive: 0xffff99,
            emissiveIntensity: 0.5
        }));
        lamp.position.set(0, 0, 1); // Move lamp to end of arm
        arm.add(lamp);

        // Add point light
        const light = new THREE.PointLight(0xffff99, 1, 15);
        light.position.copy(lamp.position);
        arm.add(light);

        this.group.add(pole);
        this.lightInstances.push(light);
    }

    // Check if a position collides with any building
    checkCollision(x, z) {
        for (const collider of this.colliders) {
            if (x >= collider.minX && x <= collider.maxX &&
                z >= collider.minZ && z <= collider.maxZ) {
                return true; // Collision detected
            }
        }
        return false; // No collision
    }

    getRandomNeonColor() {
        const colors = [
            0xff0088, // Pink
            0x00ff88, // Cyan
            0xff8800, // Orange
            0x0088ff, // Blue
            0x88ff00, // Green
            0xff00ff  // Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getRandomSpawnPosition(playerPosition) {
        // Street boundaries
        const streetBounds = {
            minX: -5,  // Left side of street
            maxX: 5,   // Right side of street
            minZ: -250, // Start of street
            maxZ: 250   // End of street
        };

        // Get random X position within street width
        const x = Math.random() * (streetBounds.maxX - streetBounds.minX) + streetBounds.minX;
        
        // Get random Z position ahead or behind player
        let z;
        const spawnDistance = this.zombieSpawnSystem.spawnRadius.min + 
            Math.random() * (this.zombieSpawnSystem.spawnRadius.max - this.zombieSpawnSystem.spawnRadius.min);
            
        // 50% chance to spawn ahead or behind
        if (Math.random() < 0.5) {
            z = playerPosition.z + spawnDistance;
        } else {
            z = playerPosition.z - spawnDistance;
        }
        
        // Clamp Z position to street bounds
        z = Math.max(streetBounds.minZ, Math.min(streetBounds.maxZ, z));
        
        console.log('Street-aligned spawn position:', { x, z });
        return { x, z };
    }

    startZombieSpawning() {
        console.log('Starting zombie spawning system...');
        const checkSpawning = () => {
            requestAnimationFrame(checkSpawning);
            
            // Get player position from character if available
            const playerPosition = window.character ? window.character.group.position : new THREE.Vector3(0, 0, 0);
            
            const now = Date.now();
            
            // Check if it's time to spawn and we have room for more zombies
            if (now > this.zombieSpawnSystem.nextSpawnTime && 
                this.zombieSpawnSystem.activeZombies < this.zombieSpawnSystem.maxZombies) {
                
                this.spawnZombie(playerPosition);
                
                // Set next spawn time
                this.zombieSpawnSystem.nextSpawnTime = now + this.zombieSpawnSystem.spawnDelay;
            }
            
            // Update all zombie mixers
            const delta = this.clock.getDelta();
            this.group.children.forEach(child => {
                if (child.userData && child.userData.state && child.userData.state.mixer) {
                    child.userData.state.mixer.update(delta);
                }
            });
        };
        
        // Start with one zombie
        this.spawnZombie(new THREE.Vector3(0, 0, 0));
        this.zombieSpawnSystem.nextSpawnTime = Date.now() + this.zombieSpawnSystem.spawnDelay;
        
        checkSpawning();
    }

    spawnZombie(position) {
        // Temporarily disable zombie spawning until we fix the model loading
        console.log('Zombie spawning temporarily disabled');
        return;
    }

    update(delta) {
        // Skip frustum culling if camera is not available
        if (window.camera) {
            const frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(
                new THREE.Matrix4().multiplyMatrices(
                    window.camera.projectionMatrix,
                    window.camera.matrixWorldInverse
                )
            );

            // Update only visible buildings
            this.buildingInstances.forEach(building => {
                if (frustum.containsPoint(building.position)) {
                    building.visible = true;
                } else {
                    building.visible = false;
                }
            });
        }

        // Make windows and signs flicker occasionally
        this.group.children.forEach(child => {
            if (child.material && child.material.emissive) {
                if (Math.random() < 0.01) {
                    child.material.emissiveIntensity = 0.5 + Math.random() * 1.5;
                }
            }
        });
    }
}
