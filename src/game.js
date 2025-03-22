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

// Performance settings
const SHADOW_MAP_SIZE = 512;  // Further reduced shadows
const SHADOW_DISTANCE = 50;   // Shorter shadow distance
const VIEW_DISTANCE = 200;    // Shorter view distance
const FOG_COLOR = 0x90a4ae;
const TREE_COUNT = 100;      // Reduced from 200
const ROCK_COUNT = 20;       // Reduced from 40
const GRASS_PATCH_COUNT = 2000; // Reduced from 5000
const ENEMY_COUNT = 5;       // Reduced from 10
const RENDER_DISTANCE = 100; // Only render close objects

// Track objects for culling
let allObjects = [];
let lastCullTime = 0;
const CULL_INTERVAL = 500; // Check every 500ms

// Initialize scene with optimized settings
export function initScene() {
    scene = new THREE.Scene();
    
    scene.fog = new THREE.Fog(FOG_COLOR, VIEW_DISTANCE * 0.4, VIEW_DISTANCE);
    scene.background = new THREE.Color(FOG_COLOR);
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 100, 0);
    light.castShadow = true;
    
    light.shadow.mapSize.width = SHADOW_MAP_SIZE;
    light.shadow.mapSize.height = SHADOW_MAP_SIZE;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = SHADOW_DISTANCE;
    light.shadow.camera.left = -SHADOW_DISTANCE/2;
    light.shadow.camera.right = SHADOW_DISTANCE/2;
    light.shadow.camera.top = SHADOW_DISTANCE/2;
    light.shadow.camera.bottom = -SHADOW_DISTANCE/2;
    
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    return scene;
}

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
    
    // Only show shadows within shadow distance
    terrain.material.shadowSide = THREE.FrontSide;
    return terrain;
}

// Initialize trees with distance culling
function createTrees(scene, count = TREE_COUNT) { 
    const loader = new GLTFLoader();
    loader.load('/assets/models/Pine Tree.glb', (gltf) => {
        const treeModel = gltf.scene;
        
        // Optimize tree model
        treeModel.traverse(child => {
            if (child.isMesh) {
                child.material.fog = true;
                child.castShadow = true;
                child.receiveShadow = true;
                // Use lower quality materials
                child.material.flatShading = true;
                child.material.precision = 'lowp';
            }
        });
        
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
            
            scene.add(tree);
            allObjects.push({ 
                object: tree, 
                type: 'tree',
                position: tree.position 
            });
        }
    });
}

// Initialize rocks with reduced count
function createRocks(scene, count = ROCK_COUNT) {
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
            allObjects.push({ 
                object: rock, 
                type: 'rock',
                position: rock.position 
            });
        }
    });
}

// Initialize grass with reduced count
function createGrassPatches(scene, count = GRASS_PATCH_COUNT) {
    const loader = new GLTFLoader();
    
    loader.load('/assets/models/Grass Patch (1).glb', (gltf) => {
        for (let i = 0; i < count; i++) {
            const grassPatch = gltf.scene.clone();
            
            // Concentrate grass more in the visible area
            const radius = Math.random() * 350;  
            const angle = Math.random() * Math.PI * 2;
            grassPatch.position.x = Math.cos(angle) * radius;
            grassPatch.position.z = Math.sin(angle) * radius;
            
            // Make patches slightly larger for more visibility
            const scale = 1.2 + Math.random() * 0.8;  
            grassPatch.scale.set(scale, scale, scale);
            
            // Randomize rotation for natural look
            grassPatch.rotation.y = Math.random() * Math.PI * 2;
            
            // Group grass patches more densely
            if (Math.random() < 0.3) {  
                for (let j = 0; j < 3; j++) {  
                    const clusterPatch = gltf.scene.clone();
                    const clusterRadius = 2 + Math.random() * 3;  
                    const clusterAngle = Math.random() * Math.PI * 2;
                    
                    clusterPatch.position.x = grassPatch.position.x + Math.cos(clusterAngle) * clusterRadius;
                    clusterPatch.position.z = grassPatch.position.z + Math.sin(clusterAngle) * clusterRadius;
                    clusterPatch.rotation.y = Math.random() * Math.PI * 2;
                    
                    const clusterScale = scale * (0.8 + Math.random() * 0.4);  
                    clusterPatch.scale.set(clusterScale, clusterScale, clusterScale);
                    
                    clusterPatch.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    scene.add(clusterPatch);
                    allObjects.push({ 
                        object: clusterPatch, 
                        type: 'grass',
                        position: clusterPatch.position 
                    });
                }
            }
            
            // Avoid spawning too close to spawn point
            const distanceFromSpawn = Math.sqrt(
                grassPatch.position.x * grassPatch.position.x + 
                grassPatch.position.z * grassPatch.position.z
            );
            
            if (distanceFromSpawn > 15) {
                grassPatch.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                scene.add(grassPatch);
                allObjects.push({ 
                    object: grassPatch, 
                    type: 'grass',
                    position: grassPatch.position 
                });
            }
        }
    });
}

// Initialize enemies with reduced count
function createEnemies(scene, count = ENEMY_COUNT) {
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
            allObjects.push({ 
                object: enemy, 
                type: 'enemy',
                position: enemy.position 
            });
            
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

// Initialize chest and gems
function createChestAndGems(scene) {
    const loader = new GLTFLoader();
    loader.load('/assets/models/Chest.glb', (gltf) => {
        const chest = gltf.scene;
        chest.position.set(60, 0, -105); 
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

// Initialize shrubs
function createShrubs(scene) {
    const loader = new GLTFLoader();
    
    loader.load('/assets/models/Shrub.glb', (gltf) => {
        for (let i = 0; i < 50; i++) {
            const shrub = gltf.scene.clone();
            
            shrub.position.x = Math.random() * 800 - 400;
            shrub.position.z = Math.random() * 800 - 400;
            shrub.position.y = 0;
            
            shrub.rotation.y = Math.random() * Math.PI * 2;
            
            const scale = 2 + Math.random();
            shrub.scale.set(scale, scale, scale);
            
            shrub.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(shrub);
            allObjects.push({ 
                object: shrub, 
                type: 'shrub',
                position: shrub.position 
            });
        }
    }, undefined, (error) => {
        console.error('Error loading shrub:', error);
    });
}

// Initialize clouds
function createClouds(scene) {
    const loader = new GLTFLoader();
    
    loader.load('/assets/models/Clouds.glb', (gltf) => {
        for (let i = 0; i < 35; i++) {
            const cloud = gltf.scene.clone();
            
            cloud.position.x = Math.random() * 1200 - 600;  
            cloud.position.z = Math.random() * 1200 - 600;
            cloud.position.y = 80 + Math.random() * 30;
            
            cloud.rotation.y = Math.random() * Math.PI * 2;
            
            const scale = 12 + Math.random() * 8; 
            cloud.scale.set(scale, scale, scale);
            
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
            allObjects.push({ 
                object: cloud, 
                type: 'cloud',
                position: cloud.position 
            });
        }
    }, undefined, (error) => {
        console.error('Error loading clouds:', error);
    });
}

// Culling system - hide distant objects
function updateObjectVisibility(playerPosition) {
    const now = Date.now();
    if (now - lastCullTime < CULL_INTERVAL) return;
    lastCullTime = now;
    
    allObjects.forEach(obj => {
        const distance = playerPosition.distanceTo(obj.position);
        const shouldBeVisible = distance < RENDER_DISTANCE;
        
        if (obj.object.visible !== shouldBeVisible) {
            obj.object.visible = shouldBeVisible;
            
            // Only update shadows when visible
            if (obj.object.traverse) {
                obj.object.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = shouldBeVisible;
                        child.receiveShadow = shouldBeVisible;
                    }
                });
            }
        }
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

// Update game state with culling
window.addEventListener('beforeRender', (e) => {
    const { playerPosition, delta } = e.detail;
    updateObjectVisibility(playerPosition);
    
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
    
    createTrees(scene, TREE_COUNT);
    createRocks(scene, ROCK_COUNT);
    createEnemies(scene, ENEMY_COUNT);
    createChestAndGems(scene);
    createGrassPatches(scene, GRASS_PATCH_COUNT);
    createShrubs(scene);
    createClouds(scene);
    
    // Initialize buildings
    new Buildings(scene, scene);
    
    locationManager = new LocationManager(scene, scene);
});
