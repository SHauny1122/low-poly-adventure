import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { LocationManager } from './locations/LocationManager.js';
import { Buildings } from './locations/Buildings.js';

// Game state
let scene = null;
let locationManager;
let enemies = [];
let gems = [];
let gemsCollected = 0;
let clouds = [];

// Initialize terrain
function createTerrain() {
    const geometry = new THREE.PlaneGeometry(800, 800, 300, 300);
    const material = new THREE.MeshStandardMaterial({
        color: 0x2E7D32,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    return terrain;
}

// Initialize trees
function createTrees(scene, count = 200) { 
    const loader = new GLTFLoader();
    loader.load('/assets/models/Pine Tree.glb', (gltf) => {
        const treeModel = gltf.scene;
        
        for (let i = 0; i < count; i++) {
            const tree = treeModel.clone();
            const scale = 2 * (0.8 + Math.random() * 0.4);
            tree.scale.set(scale, scale, scale);
            
            let validPosition = false;
            let attempts = 0;
            while (!validPosition && attempts < 50) {
                const x = (Math.random() - 0.5) * 700;
                const z = (Math.random() - 0.5) * 700;
                
                const distanceFromSpawn = Math.sqrt(x * x + z * z);
                if (distanceFromSpawn > 24) {
                    validPosition = true;
                    tree.position.set(x, 0, z);
                }
                attempts++;
            }
            
            tree.castShadow = true;
            tree.receiveShadow = true;
            scene.add(tree);
        }
    });
}

// Initialize enemies
function createEnemies(scene, count = 10) {
    const loader = new GLTFLoader();
    loader.load('/assets/models/Skeleton.glb', (gltf) => {
        const enemyModel = gltf.scene;
        const enemyAnimations = gltf.animations;
        
        for (let i = 0; i < count; i++) {
            const enemy = enemyModel.clone();
            const scale = 1.2;
            enemy.scale.set(scale, scale, scale);
            
            let validPosition = false;
            let attempts = 0;
            while (!validPosition && attempts < 50) {
                const x = (Math.random() - 0.5) * 600;
                const z = (Math.random() - 0.5) * 600;
                
                const distanceFromSpawn = Math.sqrt(x * x + z * z);
                if (distanceFromSpawn > 50) {
                    validPosition = true;
                    enemy.position.set(x, 0, z);
                }
                attempts++;
            }
            
            const mixer = new THREE.AnimationMixer(enemy);
            const idleAnim = mixer.clipAction(enemyAnimations.find(a => a.name.toLowerCase().includes('idle')));
            const walkAnim = mixer.clipAction(enemyAnimations.find(a => a.name.toLowerCase().includes('walk')));
            const attackAnim = mixer.clipAction(enemyAnimations.find(a => a.name.toLowerCase().includes('attack')));
            
            idleAnim.play();
            
            enemy.castShadow = true;
            enemy.receiveShadow = true;
            scene.add(enemy);
            
            enemies.push({
                mesh: enemy,
                mixer: mixer,
                animations: {
                    idle: idleAnim,
                    walk: walkAnim,
                    attack: attackAnim
                },
                health: 100,
                state: 'idle',
                target: null
            });
        }
    });
}

// Initialize rocks
function createRocks(scene, count = 40) {
    const loader = new GLTFLoader();
    loader.load('/assets/models/Rock.glb', (gltf) => {
        const rockModel = gltf.scene;
        
        for (let i = 0; i < count; i++) {
            const rock = rockModel.clone();
            const scale = 1.5 * (0.6 + Math.random() * 0.8);
            rock.scale.set(scale, scale, scale);
            
            let validPosition = false;
            let attempts = 0;
            while (!validPosition && attempts < 50) {
                const x = (Math.random() - 0.5) * 700;
                const z = (Math.random() - 0.5) * 700;
                
                const distanceFromSpawn = Math.sqrt(x * x + z * z);
                if (distanceFromSpawn > 18) {
                    validPosition = true;
                    rock.position.set(x, 0, z);
                }
                attempts++;
            }
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            scene.add(rock);
        }
    });
}

// Initialize chest and gems
function createChestAndGems(scene) {
    const loader = new GLTFLoader();
    loader.load('/assets/models/Chest.glb', (gltf) => {
        const chest = gltf.scene;
        chest.position.set(60, 0, -105); // Moved further away from barracks
        chest.scale.set(2, 2, 2);
        chest.rotation.y = Math.PI / 4;
        chest.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(chest);

        // Create gems around chest
        const gemGeometry = new THREE.OctahedronGeometry(0.5);
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x00ff00,
            emissiveIntensity: 0.2
        });

        for (let i = 0; i < 5; i++) {
            const gem = new THREE.Mesh(gemGeometry, gemMaterial);
            const angle = (i / 5) * Math.PI * 2;
            const radius = 3;
            gem.position.set(
                chest.position.x + Math.cos(angle) * radius,
                0.5,
                chest.position.z + Math.sin(angle) * radius
            );
            gem.rotation.y = Math.random() * Math.PI * 2;
            gem.castShadow = true;
            gem.receiveShadow = true;
            scene.add(gem);
            gems.push(gem);
        }
    });
}

// Initialize grass patches
function createGrassPatches(scene) {
    const loader = new GLTFLoader();
    
    loader.load('/assets/models/Grass Patch (1).glb', (gltf) => {
        // Increased to 725 grass patches (45% more)
        for (let i = 0; i < 725; i++) {
            const grassPatch = gltf.scene.clone();
            
            // Using full map area for better coverage
            grassPatch.position.x = Math.random() * 800 - 400;
            grassPatch.position.z = Math.random() * 800 - 400;
            grassPatch.position.y = 0;
            
            // Random rotation
            grassPatch.rotation.y = Math.random() * Math.PI * 2;
            
            // Keep the current scale as it looks good
            const scale = 1.5 + Math.random() * 0.5;
            grassPatch.scale.set(scale, scale, scale);
            
            // Enable shadows
            grassPatch.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(grassPatch);
        }
    }, undefined, (error) => {
        console.error('Error loading grass patch:', error);
    });
}

function createShrubs(scene) {
    const loader = new GLTFLoader();
    
    loader.load('/assets/models/Shrub.glb', (gltf) => {
        // Create 50 shrubs
        for (let i = 0; i < 50; i++) {
            const shrub = gltf.scene.clone();
            
            // Random position across the map
            shrub.position.x = Math.random() * 800 - 400;
            shrub.position.z = Math.random() * 800 - 400;
            shrub.position.y = 0;
            
            // Random rotation
            shrub.rotation.y = Math.random() * Math.PI * 2;
            
            // Random scale variation
            const scale = 2 + Math.random();
            shrub.scale.set(scale, scale, scale);
            
            // Enable shadows
            shrub.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(shrub);
        }
    }, undefined, (error) => {
        console.error('Error loading shrub:', error);
    });
}

function createClouds(scene) {
    const loader = new GLTFLoader();
    
    loader.load('/assets/models/Clouds.glb', (gltf) => {
        // Create 35 clouds
        for (let i = 0; i < 35; i++) {
            const cloud = gltf.scene.clone();
            
            // Random position high in the sky, wider distribution
            cloud.position.x = Math.random() * 1200 - 600;  
            cloud.position.z = Math.random() * 1200 - 600;
            cloud.position.y = 80 + Math.random() * 30;
            
            // Random rotation
            cloud.rotation.y = Math.random() * Math.PI * 2;
            
            // Slightly smaller scale for more clouds
            const scale = 12 + Math.random() * 8; 
            cloud.scale.set(scale, scale, scale);
            
            // Make clouds slightly transparent
            cloud.traverse((child) => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.9;
                }
            });
            
            scene.add(cloud);
            clouds.push({
                mesh: cloud,
                speed: 0.1 + Math.random() * 0.2, 
                direction: new THREE.Vector3(
                    Math.random() - 0.5,
                    0,
                    Math.random() - 0.5
                ).normalize()
            });
        }
    }, undefined, (error) => {
        console.error('Error loading clouds:', error);
    });
}

// Update enemies
function updateEnemies(delta, playerPosition) {
    enemies.forEach(enemy => {
        enemy.mixer.update(delta);
        
        const distanceToPlayer = enemy.mesh.position.distanceTo(playerPosition);
        
        if (distanceToPlayer < 15 && enemy.state !== 'attack') {
            enemy.state = 'attack';
            enemy.animations.idle.fadeOut(0.2);
            enemy.animations.walk.fadeOut(0.2);
            enemy.animations.attack.reset().fadeIn(0.2).play();
        } else if (distanceToPlayer < 30 && enemy.state !== 'walk') {
            enemy.state = 'walk';
            enemy.animations.idle.fadeOut(0.2);
            enemy.animations.attack.fadeOut(0.2);
            enemy.animations.walk.reset().fadeIn(0.2).play();
            
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, enemy.mesh.position)
                .normalize();
            enemy.mesh.position.addScaledVector(direction, delta * 5);
            enemy.mesh.lookAt(playerPosition);
        } else if (distanceToPlayer >= 30 && enemy.state !== 'idle') {
            enemy.state = 'idle';
            enemy.animations.walk.fadeOut(0.2);
            enemy.animations.attack.fadeOut(0.2);
            enemy.animations.idle.reset().fadeIn(0.2).play();
        }
    });
}

// Update game state
window.addEventListener('beforeRender', (e) => {
    const { playerPosition, delta } = e.detail;
    
    if (locationManager) {
        locationManager.update(playerPosition);
    }
    
    updateEnemies(delta, playerPosition);
    
    // Update cloud positions
    clouds.forEach(cloud => {
        cloud.mesh.position.x += cloud.direction.x * cloud.speed;
        cloud.mesh.position.z += cloud.direction.z * cloud.speed;
        
        // Wrap clouds around when they go too far
        if (cloud.mesh.position.x > 500) cloud.mesh.position.x = -500;
        if (cloud.mesh.position.x < -500) cloud.mesh.position.x = 500;
        if (cloud.mesh.position.z > 500) cloud.mesh.position.z = -500;
        if (cloud.mesh.position.z < -500) cloud.mesh.position.z = 500;
    });
    
    // Check for gem collection
    if (scene) {  
        for (let i = gems.length - 1; i >= 0; i--) {
            const gem = gems[i];
            if (!gem) continue;
            
            // Calculate distance ignoring Y axis
            const dx = playerPosition.x - gem.position.x;
            const dz = playerPosition.z - gem.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < 4) {
                scene.remove(gem);
                gems.splice(i, 1);
                gemsCollected++;
                console.log('Gem collected! Total:', gemsCollected);
            }
        }
    }
});

// Wait for the scene to be ready
window.addEventListener('sceneReady', (e) => {
    scene = e.detail.scene;
    const camera = e.detail.camera;
    
    const terrain = createTerrain();
    scene.add(terrain);
    
    createTrees(scene, 200);
    createRocks(scene, 60);
    createEnemies(scene, 10);
    createChestAndGems(scene);
    createGrassPatches(scene);
    createShrubs(scene);
    createClouds(scene);
    
    // Initialize buildings
    new Buildings(scene, scene);
    
    locationManager = new LocationManager(scene, scene);
});
