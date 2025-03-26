import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { LocationManager } from './locations/LocationManager.js';
import { Buildings } from './locations/Buildings.js';
import { EnemyManager } from './enemies/EnemyManager.js';
import { Portal } from './portal'; // Import Portal class

// Game state
let scene = null;
let locationManager;
let enemies = [];
let gems = [];
let gemsCollected = 0;
let clouds = [];
let droppedGems = [];
let portal = null; // Initialize portal variable

// Performance settings based on device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Adjust settings based on device type
const PERFORMANCE_SETTINGS = {
    pc: {
        SHADOW_MAP_SIZE: 512,
        SHADOW_DISTANCE: 50,
        VIEW_DISTANCE: 200,
        FOG_COLOR: 0x90a4ae,
        TREE_COUNT: 100,
        ROCK_COUNT: 20,
        GRASS_PATCH_COUNT: 2000,
        RENDER_DISTANCE: 100
    },
    mobile: {
        SHADOW_MAP_SIZE: 256,      // Lower shadow quality on mobile
        SHADOW_DISTANCE: 30,       // Shorter shadow distance
        VIEW_DISTANCE: 150,        // Slightly reduced view distance
        FOG_COLOR: 0x90a4ae,      // Same fog color
        TREE_COUNT: 100,          // Keep same number of trees
        ROCK_COUNT: 20,           // Keep same number of rocks
        GRASS_PATCH_COUNT: 2000,  // Keep same amount of grass
        RENDER_DISTANCE: 80       // Slightly reduced render distance
    }
};

// Use the appropriate settings based on device
const settings = PERFORMANCE_SETTINGS[isMobile ? 'mobile' : 'pc'];

// Track objects for culling
let allObjects = [];
let lastCullTime = 0;
const CULL_INTERVAL = 500; // Check every 500ms

// Initialize scene with optimized settings
export function initScene() {
    scene = new THREE.Scene();
    
    scene.fog = new THREE.Fog(settings.FOG_COLOR, settings.VIEW_DISTANCE * 0.4, settings.VIEW_DISTANCE);
    scene.background = new THREE.Color(settings.FOG_COLOR);
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 100, 0);
    light.castShadow = true;
    
    light.shadow.mapSize.width = settings.SHADOW_MAP_SIZE;
    light.shadow.mapSize.height = settings.SHADOW_MAP_SIZE;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = settings.SHADOW_DISTANCE;
    light.shadow.camera.left = -settings.SHADOW_DISTANCE/2;
    light.shadow.camera.right = settings.SHADOW_DISTANCE/2;
    light.shadow.camera.top = settings.SHADOW_DISTANCE/2;
    light.shadow.camera.bottom = -settings.SHADOW_DISTANCE/2;
    
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
function createTrees(scene, count = settings.TREE_COUNT) { 
    const loader = new GLTFLoader();
    loader.load('/models/Pine Tree.glb', (gltf) => {
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
function createRocks(scene, count = settings.ROCK_COUNT) {
    const loader = new GLTFLoader();
    loader.load('/models/Rock.glb', (gltf) => {
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
function createGrassPatches(scene, count = settings.GRASS_PATCH_COUNT) {
    const loader = new GLTFLoader();
    
    loader.load('/models/Grass Patch (1).glb', (gltf) => {
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

// Initialize enemies
let enemyManager;

export function createEnemies(scene, buildings) {
    // Create enemy manager and make it globally accessible
    enemyManager = new EnemyManager(scene, buildings);
    window.enemyManager = enemyManager;
    
    // Create one enemy near each building
    buildings.buildingConfigs.forEach(building => {
        // Always spawn enemies 35 units north of buildings
        const spawnPosition = building.position.clone().add(new THREE.Vector3(0, 0, -35));
        
        // Try to spawn the enemy
        const enemy = enemyManager.createEnemy(spawnPosition);
        if (enemy) {
            console.log(`Spawned enemy near ${building.name} at fixed position:`, 
                Math.round(spawnPosition.x), 
                Math.round(spawnPosition.z)
            );
        }
    });
    
    return enemyManager;
}

// Initialize chest and gems
function createChestAndGems(scene) {
    const loader = new GLTFLoader();
    const chests = [];
    window.gems = []; // Store gems globally
    
    // Load chest model for each building
    const buildings = new Buildings(scene, scene);
    buildings.buildingConfigs.forEach(building => {
        const chestPosition = building.position.clone().add(new THREE.Vector3(0, 0, -30));
        
        loader.load('/models/Chest.glb', (gltf) => {
            const chest = gltf.scene;
            chest.position.copy(chestPosition);
            chest.scale.set(3, 3, 3);
            
            // Store building name with chest for reference
            chest.userData.buildingName = building.name;
            chest.userData.hasGems = false; // Track if gems are spawned
            
            // Enable shadows
            chest.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            scene.add(chest);
            chests.push(chest);
        });
    });
    
    // Listen for enemy death events
    window.addEventListener('enemyDied', (event) => {
        const enemyPosition = event.detail.position;
        
        // Find the nearest chest to the dead enemy
        const nearestChest = chests.find(chest => {
            const distance = chest.position.distanceTo(enemyPosition);
            return distance < 40 && !chest.userData.hasGems; // Within 40 units and no gems yet
        });
        
        if (nearestChest) {
            console.log('Spawning gems at chest near', nearestChest.userData.buildingName);
            spawnGemsAtChest(scene, nearestChest);
            nearestChest.userData.hasGems = true;
        }
    });
}

// Helper function to spawn gems at a chest
function spawnGemsAtChest(scene, chest) {
    console.log('=== SPAWNING GREEN GEMS ===');
    console.log('Chest position:', chest.position);
    const gemCount = 3;
    const radius = 0.5; // Small radius
    
    // Find the nearest enemy position
    const nearestEnemy = window.enemies.find(enemy => {
        if (!enemy.mesh) return false;
        const distance = enemy.mesh.position.distanceTo(chest.position);
        return distance < 40 && enemy.state === 'dead';
    });
    
    // Use enemy position if available, otherwise use chest position
    const spawnPosition = nearestEnemy ? nearestEnemy.mesh.position : chest.position;
    console.log('Spawning gems at:', spawnPosition);
    
    for (let i = 0; i < gemCount; i++) {
        const angle = (i / gemCount) * Math.PI * 2;
        const x = spawnPosition.x + Math.cos(angle) * radius;
        const z = spawnPosition.z + Math.sin(angle) * radius;
        
        // Create gem geometry
        const gemGeometry = new THREE.OctahedronGeometry(0.5);
        const gemMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            shininess: 100,
            emissive: 0x00ff00,
            emissiveIntensity: 0.2
        });
        
        const gem = new THREE.Mesh(gemGeometry, gemMaterial);
        gem.position.set(x, spawnPosition.y + 0.5, z); // Keep them low
        
        // Add gem properties for collection
        gem.userData = {
            type: 'green',
            isGem: true,
            startY: gem.position.y,
            floatHeight: 0.2,
            floatSpeed: 0.5 + Math.random() * 0.5,
            startTime: Math.random() * Math.PI * 2
        };
        console.log(`Spawned green gem at (${x}, ${gem.position.y}, ${z})`);
        
        // Enable shadows
        gem.castShadow = true;
        gem.receiveShadow = true;
        
        scene.add(gem);
        window.gems.push(gem);
    }
    console.log('=== FINISHED SPAWNING ===');
}

// Initialize shrubs
function createShrubs(scene) {
    const loader = new GLTFLoader();
    
    loader.load('/models/Shrub.glb', (gltf) => {
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
    
    loader.load('/models/Clouds.glb', (gltf) => {
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

// Create paths between buildings
function createPaths(scene) {
    const loader = new GLTFLoader();
    const buildingPositions = [
        { x: 50, z: -100 },      // Barracks
        { x: -150, z: 100 },     // Farm
        { x: 200, z: 150 },      // Sawmill
        { x: -100, z: -200 }     // Houses
    ];

    loader.load('/models/Path (1).glb', (gltf) => {
        const pathModel = gltf.scene;
        
        // Create paths between consecutive buildings (including last to first)
        for (let i = 0; i < buildingPositions.length; i++) {
            const start = buildingPositions[i];
            const end = buildingPositions[(i + 1) % buildingPositions.length];
            
            // Calculate distance and angle between buildings
            const dx = end.x - start.x;
            const dz = end.z - start.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            
            // Create path segments
            const segmentLength = 10; // Assuming each path segment is 10 units long
            const numSegments = Math.ceil(distance / segmentLength);
            
            for (let j = 0; j < numSegments; j++) {
                const segment = pathModel.clone();
                
                // Position segment along the path
                const t = j / numSegments;
                segment.position.x = start.x + dx * t;
                segment.position.z = start.z + dz * t;
                segment.position.y = 0.1; // Slightly above ground to prevent z-fighting
                
                // Rotate segment to point towards next building
                segment.rotation.y = angle;
                
                // Scale segment to maintain consistent appearance
                const scale = 2;
                segment.scale.set(scale, scale, scale);
                
                scene.add(segment);
            }
        }
    });
}

// Function to spawn gem at enemy death location
function spawnGemAtLocation(scene, position, type = 'pink') {
    const loader = new GLTFLoader();
    const gemPath = '/models/Gem.glb';
    
    loader.load(gemPath, (gltf) => {
        const gem = gltf.scene;
        
        // If it's a green gem, calculate offset position
        let finalPosition = position.clone();
        if (type === 'green') {
            // Calculate spread based on gem index (stored in userData)
            const gemIndex = window.gemIndex || 0;
            window.gemIndex = (gemIndex + 1) % 3;
            
            // Create a small triangle formation
            const radius = 0.5;
            const angle = (gemIndex / 3) * Math.PI * 2;
            finalPosition.x += Math.cos(angle) * radius;
            finalPosition.z += Math.sin(angle) * radius;
        }
        
        gem.position.copy(finalPosition);
        gem.scale.set(0.3, 0.3, 0.3);
        
        // Set color based on type
        const gemMaterial = new THREE.MeshPhongMaterial({
            color: type === 'pink' ? 0xff69b4 : 0x00ff00,
            shininess: 100,
            emissive: type === 'pink' ? 0xff69b4 : 0x00ff00,
            emissiveIntensity: 0.2
        });
        
        gem.traverse((child) => {
            if (child.isMesh) {
                child.material = gemMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Add gem properties
        gem.userData = {
            type: type,
            isGem: true,
            startY: gem.position.y,
            floatHeight: 0.2,
            floatSpeed: 0.5 + Math.random() * 0.5,
            startTime: Math.random() * Math.PI * 2
        };
        
        scene.add(gem);
        droppedGems.push(gem);
        console.log(`Spawned ${type} gem at:`, finalPosition.x, finalPosition.z);
    });
}

// Add gem collection check to the update loop
function updateGemCollection(playerPosition) {
    const collectionRadius = 2; // Collection radius in units
    
    for (let i = droppedGems.length - 1; i >= 0; i--) {
        const gem = droppedGems[i];
        const distance = playerPosition.distanceTo(gem.position);
        
        if (distance < collectionRadius) {
            console.log('Collected dropped gem!');
            scene.remove(gem);
            droppedGems.splice(i, 1);
            // Here you can add effects, update score, etc.
        } else {
            // Update floating animation
            const time = performance.now() * 0.001;
            const floatData = gem.userData;
            gem.position.y = floatData.startY + 
                Math.sin(time * floatData.floatSpeed + floatData.startTime) * 
                floatData.floatHeight;
        }
    }
}

// Culling system - hide distant objects
function updateObjectVisibility(playerPosition) {
    const now = Date.now();
    if (now - lastCullTime < CULL_INTERVAL) return;
    lastCullTime = now;

    allObjects.forEach(obj => {
        const dx = obj.position.x - playerPosition.x;
        const dz = obj.position.z - playerPosition.z;
        const distanceSquared = dx * dx + dz * dz;
        
        // Use device-specific render distance
        if (distanceSquared > settings.RENDER_DISTANCE * settings.RENDER_DISTANCE) {
            if (obj.object.visible) obj.object.visible = false;
        } else {
            if (!obj.object.visible) obj.object.visible = true;
        }
    });
}

// Wait for the scene to be ready
window.addEventListener('sceneReady', (e) => {
    scene = e.detail.scene;
    const camera = e.detail.camera;
    
    const terrain = createTerrain();
    scene.add(terrain);
    
    // Create environment
    createTrees(scene, settings.TREE_COUNT);
    createRocks(scene, settings.ROCK_COUNT);
    createGrassPatches(scene, settings.GRASS_PATCH_COUNT);
    createShrubs(scene);
    createClouds(scene);
    createChestAndGems(scene);
    createPaths(scene);
    
    // Create portal
    portal = new Portal();
    portal.setPosition(-50, 1, -50); // Position it away from other elements
    scene.add(portal.group);
    
    // Create buildings and locations first
    const buildings = new Buildings(scene, scene);
    locationManager = new LocationManager(scene, scene);
    
    // Then create enemies after buildings are loaded
    setTimeout(() => {
        createEnemies(scene, buildings);
        console.log('Creating enemies near buildings...');
    }, 2000); // Wait 2 seconds for buildings to load
});

// Listen for enemy death to spawn gems
window.addEventListener('enemyDied', (event) => {
    spawnGemAtLocation(scene, event.detail.position);
});

// Update game state with culling
window.addEventListener('beforeRender', (e) => {
    const { playerPosition, delta } = e.detail;

    // Debug player position
    if (playerPosition) {
        console.log('Player position:', 
            Math.round(playerPosition.x), 
            Math.round(playerPosition.z)
        );
    }
    
    updateObjectVisibility(playerPosition);
    updateGemCollection(playerPosition);
    
    if (locationManager) {
        locationManager.update(playerPosition);
    }
    
    // Update enemies with delta time
    if (enemyManager && enemyManager.enemies.length > 0) {
        const enemy = enemyManager.enemies[0];
        
        // Debug enemy state
        console.log('Enemy state:', enemy.state);
        
        // Convert delta to seconds for animation mixer
        const deltaSeconds = delta / 1000;
        enemyManager.update(playerPosition, deltaSeconds);
    }
    
    // Check enemy collisions and prevent player from moving through enemies
    if (enemyManager && enemyManager.checkCollisions(playerPosition)) {
        // Move player back to previous safe position
        if (e.detail.previousPosition) {
            playerPosition.copy(e.detail.previousPosition);
        }
    }
    
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
        for (let i = window.gems.length - 1; i >= 0; i--) {
            const gem = window.gems[i];
            if (!gem) continue;
            
            // Calculate distance ignoring Y axis
            const dx = playerPosition.x - gem.position.x;
            const dz = playerPosition.z - gem.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < 4) {
                scene.remove(gem);
                window.gems.splice(i, 1);
                gemsCollected++;
                console.log('Gem collected! Total:', gemsCollected);
            }
        }
    }
    
    // Update portal
    if (portal) {
        portal.update(delta);
        
        // Check portal collision
        if (playerPosition && portal.checkCollision(playerPosition)) {
            portal.transportToLevel(2); // Transport to Level 2
        }
    }
});
