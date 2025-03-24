import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import nipplejs from 'nipplejs';
import './game.js';
import { LocationManager } from './locations/LocationManager.js';
import { StagManager } from './StagManager.js';
import { InventorySystem } from './inventory/InventorySystem.js';
import { GemSystem } from './gems/GemSystem.js';

// Game state variables
let character = null;
let enemyManager = null;
let locationManager = null;
let stagManager = null;
let inventorySystem = null;
let gemSystem = null;

// Game constants
const MOVEMENT_SPEED = 8;  // Slightly slower for more natural movement
const SPRINT_SPEED = 16;   // Double speed when sprinting
const ACCELERATION = 4;  // Smoother acceleration
const DECELERATION = 8;  // Smoother deceleration
const ROTATION_SPEED = Math.PI * 1.0;  // Slower rotation for more natural turning
const ROTATION_SMOOTHING = 0.15;  // Smooth out the rotation
const CAMERA_HEIGHT = 5;  // Increased camera height slightly
const CAMERA_DISTANCE = 12;  // Increased distance for better view
const CHARACTER_HEIGHT = 0;
const SPAWN_POINT = new THREE.Vector3(50, 0, -80); // Near the barracks, but safe from enemies

// Combat settings
const COMBAT_SETTINGS = {
    DAGGER_DAMAGE: 20,
    DAGGER_RANGE: 2,
    ATTACK_COOLDOWN: 500
};

// Enemy settings
const ENEMY_SETTINGS = {
    MAX_HEALTH: 100,
    MOVEMENT_SPEED: 5,
    SPAWN_DISTANCE: 30,
    AGGRO_RANGE: 15
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue color

// Add subtle fog
scene.fog = new THREE.FogExp2(0x87CEEB, 0.008); // Increased density for more atmosphere

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

// Set initial camera position behind where character will spawn
camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// Mobile optimization - reduce resolution on mobile devices
if (/Android|iPhone/i.test(navigator.userAgent)) {
    renderer.setPixelRatio(Math.min(0.7, window.devicePixelRatio));
}

document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(50, 500, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(hemisphereLight);

// Character movement
let mixer;
let walkAction;
let idleAction;
let attackAction;
let runAction;
let isAttacking = false;
let isSprinting = false;
const clock = new THREE.Clock();
const velocity = new THREE.Vector3();

// Controls
const keys = {
    'KeyW': false,
    'KeyS': false,
    'KeyA': false,
    'KeyD': false,
    'Space': false,
    'ShiftLeft': false  // Track shift key for sprint
};

// Store obstacles for collision detection
const obstacles = [];
window.obstacles = obstacles; // Make obstacles available globally for buildings

// Load and place flat rocks
function placeFlatRocks() {
    const loader = new GLTFLoader();
    loader.load('/models/Rock Flat.glb', (gltf) => {
        // Create 30 flat rocks scattered around
        for (let i = 0; i < 30; i++) {
            const rock = gltf.scene.clone();
            
            // Random position within a radius
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 200 + 50; // Between 50 and 250 units from center
            rock.position.x = Math.cos(angle) * radius;
            rock.position.z = Math.sin(angle) * radius;
            
            // Random rotation
            rock.rotation.y = Math.random() * Math.PI * 2;
            
            // Random scale variation (0.8 to 1.2 of original size)
            const scale = 0.8 + Math.random() * 0.4;
            rock.scale.set(scale, scale, scale);
            
            // Removed collision data for flat rocks since they're decorative
            
            scene.add(rock);
        }
    });
}

// Function to check if a position is too close to buildings
function isTooCloseToBuildings(x, z) {
    const buildingPositions = [
        { x: 50, z: -100 },    // Barracks
        { x: -150, z: 100 },   // Farm
        { x: 200, z: 150 },    // Sawmill
        { x: -100, z: -200 }   // Houses
    ];
    
    const minDistance = 30; // Minimum distance from buildings
    
    return buildingPositions.some(pos => {
        const dx = x - pos.x;
        const dz = z - pos.z;
        return Math.sqrt(dx * dx + dz * dz) < minDistance;
    });
}

// Load and place tree & rock clusters
function placeTreeRockClusters() {
    const loader = new GLTFLoader();
    loader.load('/models/Trees-and-Rocks.glb', (gltf) => {
        // Create 15 clusters
        for (let i = 0; i < 15; i++) {
            const cluster = gltf.scene.clone();
            
            // Keep trying until we find a valid position
            let x, z;
            do {
                x = Math.random() * 400 - 200;  // -200 to 200
                z = Math.random() * 400 - 200;  // -200 to 200
            } while (isTooCloseToBuildings(x, z));
            
            cluster.position.set(x, 0, z);
            
            // Random rotation
            cluster.rotation.y = Math.random() * Math.PI * 2;
            
            // Random scale (0.9 to 1.1 of original size)
            const scale = 0.8 + Math.random() * 0.4;
            cluster.scale.set(scale, scale, scale);
            
            // Add to scene
            scene.add(cluster);
        }
    }, undefined, (error) => {
        console.error('Error loading Trees and Rocks:', error);
    });
}

// Check for collisions and get safe position
function handleCollision(currentPos, targetPos) {
    let hasCollision = false;
    let closestDistance = Infinity;
    let closestObstacle = null;
    
    for (const obstacle of obstacles) {
        const dx = targetPos.x - obstacle.position.x;
        const dz = targetPos.z - obstacle.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < obstacle.radius + 2) {
            hasCollision = true;
            if (distance < closestDistance) {
                closestDistance = distance;
                closestObstacle = obstacle;
            }
        }
    }
    
    if (hasCollision && closestObstacle) {
        // Calculate push-back direction from closest collision point
        const dx = targetPos.x - closestObstacle.position.x;
        const dz = targetPos.z - closestObstacle.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        const pushX = dx / distance;
        const pushZ = dz / distance;
        
        // Move to safe position with smoother push-back
        targetPos.x = closestObstacle.position.x + (pushX * (closestObstacle.radius + 2));
        targetPos.z = closestObstacle.position.z + (pushZ * (closestObstacle.radius + 2));
    }
    
    return hasCollision;
}

// Joystick state
const joystickState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    force: 0
};

// Joystick controls
const joystickContainer = document.createElement('div');
joystickContainer.style.position = 'fixed';
joystickContainer.style.bottom = '50px';
joystickContainer.style.left = '50px';  // Fixed left position instead of center
joystickContainer.style.transform = 'none';  // Remove center transform
joystickContainer.style.width = '100px';  // Slightly smaller
joystickContainer.style.height = '100px';
document.body.appendChild(joystickContainer);

const joystick = nipplejs.create({
    zone: joystickContainer,
    mode: 'static',
    position: { left: '50%', bottom: '50%' },
    color: 'white',
    size: 100  // Match container size
});

joystick.on('move', (evt, data) => {
    const angle = data.angle.radian;
    const force = Math.min(data.force, 1.0);
    joystickState.force = force;
    
    // Reset joystick state
    joystickState.forward = false;
    joystickState.backward = false;
    joystickState.left = false;
    joystickState.right = false;
    
    // Convert angle to cardinal directions
    if (angle >= -Math.PI/4 && angle < Math.PI/4) {
        joystickState.right = true;
    } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
        joystickState.forward = true;
    } else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) {
        joystickState.left = true;
    } else {
        joystickState.backward = true;
    }
});

joystick.on('end', () => {
    joystickState.forward = false;
    joystickState.backward = false;
    joystickState.left = false;
    joystickState.right = false;
    joystickState.force = 0;
});

// Load character model
const loader = new GLTFLoader();

// Call both placement functions
placeFlatRocks();
placeTreeRockClusters();

loader.load('/models/Character Animated (2).glb', function(gltf) {
    character = gltf.scene;
    character.scale.set(1, 1, 1);
    character.position.copy(SPAWN_POINT);
    character.position.y = CHARACTER_HEIGHT;
    character.castShadow = true;
    character.receiveShadow = true;
    scene.add(character);
    
    mixer = new THREE.AnimationMixer(character);
    
    // Set up animations
    const animations = gltf.animations;
    walkAction = mixer.clipAction(animations.find(a => a.name.toLowerCase().includes('walk')));
    idleAction = mixer.clipAction(animations.find(a => a.name.toLowerCase().includes('idle')));
    attackAction = mixer.clipAction(animations.find(a => a.name.toLowerCase().includes('attack')));
    
    // Load run animation from separate file
    new GLTFLoader().load('/models/Character Animated (4).glb', function(runGltf) {
        const runAnim = runGltf.animations.find(a => a.name.toLowerCase().includes('run'));
        if (runAnim) {
            runAction = mixer.clipAction(runAnim);
            runAction.setEffectiveTimeScale(1);
            runAction.play();
            runAction.setEffectiveWeight(0); // Start with weight 0
        }
    });
    
    // Configure animations
    walkAction.setEffectiveTimeScale(1.2);
    walkAction.play();
    idleAction.play();
    
    // Set initial state
    walkAction.setEffectiveWeight(0);
    idleAction.setEffectiveWeight(1);
    
    // Configure attack animation
    attackAction.setEffectiveTimeScale(4.0);  // Super fast attack
    attackAction.setLoop(THREE.LoopOnce);
    attackAction.clampWhenFinished = true;
    
    mixer.addEventListener('finished', function(e) {
        if (e.action === attackAction) {
            isAttacking = false;
            attackAction.stop();
            
            // Instant transition back
            if (velocity.lengthSq() > 0.1) {
                walkAction.setEffectiveWeight(1);  // Instant transition
                idleAction.setEffectiveWeight(0);
            } else {
                walkAction.setEffectiveWeight(0);
                idleAction.setEffectiveWeight(1);
            }
        }
    });
    
    // Create dagger
    createDagger();
    
    // Dispatch sceneReady event to initialize terrain and environment
    window.dispatchEvent(new CustomEvent('sceneReady', { 
        detail: { 
            scene: scene,
            camera: camera
        }
    }));
});

// Create and attach dagger
function createDagger() {
    let handBone = character.getObjectByName('FistR');
    
    const daggerGroup = new THREE.Group();
    const mainHolder = new THREE.Group();
    
    // Blade
    const bladeGeometry = new THREE.ConeGeometry(0.001, 0.005, 6);
    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        metalness: 1.0,
        roughness: 0.3,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.rotation.x = -Math.PI / 2;
    blade.position.y = 0.0025;
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.0005, 0.0007, 0.003, 6);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2b1f,
        metalness: 0.1,
        roughness: 0.9,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.0003;
    
    // Guard
    const guardGeometry = new THREE.BoxGeometry(0.0025, 0.0007, 0.0007);
    const guardMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B8878,
        metalness: 0.9,
        roughness: 0.4,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.y = 0.0003;
    
    daggerGroup.add(blade);
    daggerGroup.add(handle);
    daggerGroup.add(guard);
    mainHolder.add(daggerGroup);
    
    const loader = new GLTFLoader();
    loader.load('/models/Dagger.glb', function(gltf) {
        if (handBone) {
            const posHolder = new THREE.Group();
            handBone.add(posHolder);
            posHolder.position.set(0.001, 0.0005, -0.0002);
            posHolder.rotation.set(
                -0.01 * Math.PI,
                0.45 * Math.PI,
                0.02 * Math.PI
            );
            posHolder.add(mainHolder);
        }
    });
}

// Attack function
function attack() {
    if (!isAttacking && character) {
        isAttacking = true;
        
        // Play attack animation
        attackAction.reset();
        attackAction.setEffectiveWeight(1);
        attackAction.setLoop(THREE.LoopOnce);
        attackAction.play();
        
        // Handle enemy damage
        if (window.enemyManager) {
            window.enemyManager.handlePlayerAttack(character.position);
        }
        
        // Reset after animation finishes
        setTimeout(() => {
            isAttacking = false;
            attackAction.setEffectiveWeight(0);
            if (velocity.lengthSq() > 0.1) {
                walkAction.setEffectiveWeight(1);
            } else {
                idleAction.setEffectiveWeight(1);
            }
        }, 500); // Half second attack animation
    }
}

// Minimap setup
const minimapCanvas = document.getElementById('minimap');
const minimapCamera = new THREE.OrthographicCamera(
    -100, 100,  // Left, Right
    100, -100,  // Top, Bottom
    1, 1000     // Near, Far
);
minimapCamera.position.set(0, 300, 0); // Higher up for better overview
minimapCamera.zoom = 0.8; // Zoom out slightly to show more area
minimapCamera.updateProjectionMatrix();
minimapCamera.position.set(0, 200, 0);
minimapCamera.lookAt(0, 0, 0);
minimapCamera.layers.enable(1);

// Single minimap renderer
const minimapRenderer = new THREE.WebGLRenderer({
    canvas: minimapCanvas,
    antialias: true,
    alpha: true
});
minimapRenderer.setPixelRatio(window.devicePixelRatio);
minimapRenderer.setClearColor(0x2E7D32, 1); // Set background to grass green

// Create minimap scene
const minimapScene = new THREE.Scene();
minimapScene.background = new THREE.Color(0x2E7D32); // Match background color

// Create player marker for minimap (larger blue triangle)
const markerGeometry = new THREE.ConeGeometry(6, 12, 3); // Made bigger (was 4, 8)
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00BFFF }); // Changed to bright cyan blue
const playerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
playerMarker.rotation.x = Math.PI / 2;
playerMarker.position.y = 2;
playerMarker.layers.set(1);
minimapScene.add(playerMarker);

// Create building markers for minimap
function createBuildingMarker(position, color, scale = 1) {
    const markerGeometry = new THREE.BoxGeometry(8 * scale, 8 * scale, 8 * scale);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(position);
    marker.position.y = 1;
    marker.layers.set(1);
    minimapScene.add(marker);
    return marker;
}

// Add building markers
const buildingMarkers = [
    // Barracks (brown)
    createBuildingMarker(new THREE.Vector3(50, 0, -100), 0x8B4513, 1.5),
    // Farm (light green)
    createBuildingMarker(new THREE.Vector3(-150, 0, 100), 0x90EE90, 1.2),
    // Sawmill (darker brown)
    createBuildingMarker(new THREE.Vector3(200, 0, 150), 0x654321, 1.2),
    // Houses (tan)
    createBuildingMarker(new THREE.Vector3(-100, 0, -200), 0xDEB887, 1.2)
];

// Add chest marker (gold color)
const chestMarker = createBuildingMarker(new THREE.Vector3(60, 0, -105), 0xFFD700, 0.5);

// Function to update minimap size
function updateMinimapSize() {
    const container = document.getElementById('minimapContainer');
    const rect = container.getBoundingClientRect();
    minimapRenderer.setSize(rect.width, rect.height, false);
}

// Initial size and resize handling
updateMinimapSize();
window.addEventListener('resize', updateMinimapSize);

// Update minimap in render loop
function updateMinimap() {
    if (!character || !minimapCamera) return;
    
    // Update minimap camera position
    minimapCamera.position.set(
        character.position.x,
        100,
        character.position.z
    );
    
    // Update player marker
    if (playerMarker) {
        playerMarker.position.x = character.position.x;
        playerMarker.position.z = character.position.z;
        playerMarker.rotation.y = -character.rotation.y + Math.PI/2;
    }
    
    // Get minimap boundaries
    const minimapContainer = document.getElementById('minimapContainer');
    if (!minimapContainer) return;
    
    const minimapRect = minimapContainer.getBoundingClientRect();
    const minimapCenterX = minimapRect.left + minimapRect.width / 2;
    const minimapCenterY = minimapRect.top + minimapRect.height / 2;
    const minimapRadius = minimapRect.width / 2;
    
    // Update enemy markers and indicators
    if (window.enemies) {
        window.enemies.forEach((enemy, index) => {
            if (!enemy?.mesh || !enemyMinimapMarkers[index] || !enemyIndicators[index]) return;
            
            // Update minimap marker position
            const marker = enemyMinimapMarkers[index];
            marker.position.x = enemy.mesh.position.x;
            marker.position.z = enemy.mesh.position.z;
            
            // Update marker color based on enemy state
            const material = marker.material;
            if (enemy.state === 'dead') {
                material.color.setHex(0x666666); // Grey for dead enemies
            } else {
                material.color.setHex(0xff0000); // Red for active enemies
            }
            
            // Calculate enemy position relative to player
            const relativeX = enemy.mesh.position.x - character.position.x;
            const relativeZ = enemy.mesh.position.z - character.position.z;
            
            // Calculate angle and distance
            const angle = Math.atan2(relativeZ, relativeX);
            const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
            
            // Check if enemy is within minimap view (100 units radius - increased from 50)
            const minimapRange = 100;
            if (distance <= minimapRange) {
                // Enemy is in minimap view - show marker, hide indicator
                marker.visible = true;
                enemyIndicators[index].style.display = 'none';
            } else {
                // Enemy is off-screen - hide marker, show indicator
                marker.visible = false;
                
                // Calculate indicator position on minimap edge
                const indicatorDistance = minimapRadius * 0.9; // Slightly inside the edge
                const indicatorX = minimapCenterX + Math.cos(angle) * indicatorDistance;
                const indicatorY = minimapCenterY + Math.sin(angle) * indicatorDistance;
                
                const indicator = enemyIndicators[index];
                indicator.style.display = 'block';
                indicator.style.left = indicatorX + 'px';
                indicator.style.top = indicatorY + 'px';
                
                // Add distance text
                const distanceInUnits = Math.round(distance);
                indicator.innerHTML = `❌<br>${distanceInUnits}m`;
                
                // Make indicator more visible
                indicator.style.color = '#ff3333';
                indicator.style.fontSize = '20px';
                indicator.style.textShadow = '2px 2px 4px black';
                indicator.style.transform = 'translate(-50%, -50%)';
            }
        });
    }
    
    // Render final minimap
    minimapRenderer.render(minimapScene, minimapCamera);
}

// Initialize arrays for enemies and markers
window.enemies = [];
const enemyMinimapMarkers = [];
const enemyIndicators = [];

// Add enemy markers to minimap
function createEnemyMinimapMarker(enemy) {
    const markerGeometry = new THREE.BoxGeometry(3, 3, 3);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Changed from MeshStandardMaterial
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.y = 50; // Keep above other minimap elements
    minimapScene.add(marker);
    return marker;
}

// Create edge indicator with better visibility
function createEdgeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'minimap-edge-indicator';
    indicator.style.position = 'absolute';
    indicator.style.display = 'none';
    indicator.style.color = '#ff3333';
    indicator.style.fontSize = '20px';
    indicator.style.fontWeight = 'bold';
    indicator.style.textShadow = '2px 2px 4px black';
    indicator.style.pointerEvents = 'none';
    indicator.style.textAlign = 'center';
    indicator.style.zIndex = '1000';
    document.getElementById('minimapContainer').appendChild(indicator);
    return indicator;
}

// Create initial indicators (will be populated when enemies spawn)
for (let i = 0; i < 4; i++) {
    enemyIndicators.push(createEdgeIndicator());
    enemyMinimapMarkers.push(createEnemyMinimapMarker());
}

// Add attack button for mobile
const attackButton = document.createElement('button');
attackButton.style.position = 'fixed';
attackButton.style.bottom = '50px';
attackButton.style.right = '30px';  // Closer to edge
attackButton.style.width = '70px';  // Slightly larger
attackButton.style.height = '70px';
attackButton.style.borderRadius = '50%';
attackButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
attackButton.style.border = '2px solid white';
attackButton.style.color = 'white';
attackButton.style.fontSize = '30px';  // Larger icon
attackButton.innerHTML = '⚔️';
attackButton.style.cursor = 'pointer';
document.body.appendChild(attackButton);

attackButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    attack();
});

// Add sprint button for mobile
const sprintButton = document.createElement('button');
sprintButton.style.position = 'fixed';
sprintButton.style.bottom = '120px';  // Above attack button
sprintButton.style.right = '20px';
sprintButton.style.width = '60px';
sprintButton.style.height = '60px';
sprintButton.style.borderRadius = '50%';
sprintButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
sprintButton.style.border = '2px solid white';
sprintButton.style.color = 'white';
sprintButton.style.fontSize = '12px';
sprintButton.textContent = 'Sprint';
sprintButton.style.display = 'none';  // Hide by default

// Only show sprint button on mobile
if (/Android|iPhone/i.test(navigator.userAgent)) {
    sprintButton.style.display = 'block';
}

sprintButton.addEventListener('touchstart', () => {
    isSprinting = true;
});

sprintButton.addEventListener('touchend', () => {
    isSprinting = false;
});

document.body.appendChild(sprintButton);

// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
        if (e.code === 'ShiftLeft') {
            isSprinting = true;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft') {
            isSprinting = false;
        }
    }
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        attack();
    }
});

// Handle window resize for responsive UI
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update minimap size
    const minimapContainer = document.getElementById('minimapContainer');
    minimapContainer.style.width = (isMobile ? 120 : 200) + 'px';
    minimapContainer.style.height = (isMobile ? 120 : 200) + 'px';
    minimapContainer.style.bottom = isMobile ? '10px' : '20px';
    minimapContainer.style.right = isMobile ? '10px' : '20px';
    updateMinimapSize();
});

// Gems
const gems = window.gems || [];

// Function to create a gem
function createGem(position, type = 'green') {
    const geometry = new THREE.OctahedronGeometry(0.5);
    const material = new THREE.MeshStandardMaterial({ 
        color: type === 'green' ? 0x00ff00 : 0xff69b4,
        metalness: 0.7,
        roughness: 0.2,
        emissive: type === 'green' ? 0x00ff00 : 0xff69b4,
        emissiveIntensity: 0.2
    });
    const gem = new THREE.Mesh(geometry, material);
    
    // For green gems, create a triangle formation
    let finalPosition = position.clone();
    if (type === 'green') {
        const gemIndex = window.gemIndex || 0;
        const radius = 1; // Spread them out a bit more
        const angle = (gemIndex / 3) * Math.PI * 2;
        finalPosition.x += Math.cos(angle) * radius;
        finalPosition.z += Math.sin(angle) * radius;
        console.log(`Creating green gem ${gemIndex + 1} at offset:`, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    
    gem.position.copy(finalPosition);
    gem.position.y = 1;
    gem.userData.type = type;
    gem.userData.isGem = true;
    
    // Add floating animation
    const startY = gem.position.y;
    gem.userData.update = (delta) => {
        gem.position.y = startY + Math.sin(Date.now() * 0.003) * 0.3;
        gem.rotation.y += delta * 2;
    };
    
    scene.add(gem);
    return gem;
}

// Make createGem globally available
window.createGem = createGem;

// Update gem collection logic in the collision check
function checkCollisions() {
    if (!character) return;
    
    const charPos = character.position;
    
    // Create an array of gems to remove after the loop
    const gemsToRemove = [];
    
    // First, find all gems and log their distances
    const gems = scene.children.filter(child => child.userData && child.userData.isGem);
    if (gems.length > 0) {
        console.log('=== Found Gems ===');
        gems.forEach(gem => {
            const distance = charPos.distanceTo(gem.position);
            if (gem.userData.type === 'green') {
                console.log(`GREEN GEM at distance ${distance.toFixed(2)}`);
            }
        });
        console.log('================');
    }
    
    // Then check for collection
    scene.children.forEach((child) => {
        if (child.userData && child.userData.isGem) {
            const gemPos = child.position;
            const distance = charPos.distanceTo(gemPos);
            
            if (distance < 2) {  // If character is close enough
                // Add to inventory
                const gemType = child.userData.type;
                if (gemType === 'green') {
                    console.log('!!! COLLECTING GREEN GEM !!!');
                    console.log('Distance:', distance.toFixed(2));
                    console.log('Gem position:', gemPos);
                    console.log('Player position:', charPos);
                }
                console.log(`Collecting ${gemType} gem with userData:`, child.userData);
                inventorySystem.addGems(gemType, 1);
                
                // Add to removal array instead of removing immediately
                gemsToRemove.push(child);
                console.log(`Current gem counts - Green: ${inventorySystem.gems.green}, Pink: ${inventorySystem.gems.pink}`);
            }
        }
    });
    
    // Remove gems after the loop
    gemsToRemove.forEach(gem => {
        scene.remove(gem);
        // Also remove from window.gems array if it exists there
        if (window.gems) {
            const index = window.gems.indexOf(gem);
            if (index > -1) {
                window.gems.splice(index, 1);
            }
        }
    });
}

// Initialize game objects
// Initialize game world
function initializeWorld() {
    // Create inventory and gem systems
    inventorySystem = new InventorySystem();
    gemSystem = new GemSystem(scene);
    window.gemSystem = gemSystem; // Make it globally accessible
    
    // Create stags
    stagManager = new StagManager(scene);
    
    // Start animation loop
    animate();
}

// Start animation loop
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (character) {
        let moveZ = 0;
        let rotate = 0;
        
        // WASD controls (keeping original logic)
        if (keys['KeyW']) moveZ -= 1;
        if (keys['KeyS']) moveZ += 1;
        if (keys['KeyA']) rotate += 1;  
        if (keys['KeyD']) rotate -= 1;  
        
        // Joystick controls
        if (joystickState.forward) moveZ -= joystickState.force || 1;
        if (joystickState.backward) moveZ += joystickState.force || 1;
        if (joystickState.left) rotate += joystickState.force || 1;  
        if (joystickState.right) rotate -= joystickState.force || 1;  
        
        // Apply rotation
        character.rotation.y += rotate * ROTATION_SPEED * delta;
        
        // Calculate movement direction based on character's rotation
        const moveDirection = new THREE.Vector3(
            Math.sin(character.rotation.y) * -moveZ,
            0,
            Math.cos(character.rotation.y) * -moveZ
        );
        
        // Apply movement
        const targetVelocity = moveDirection.multiplyScalar(isSprinting ? SPRINT_SPEED : MOVEMENT_SPEED);
        velocity.lerp(targetVelocity, ACCELERATION * delta);
        
        // Store previous position for collision handling
        const previousPosition = character.position.clone();
        
        // Calculate next position
        const nextPosition = character.position.clone().add(velocity.clone().multiplyScalar(delta));
        
        // Handle collisions and get safe position
        if (handleCollision(character.position, nextPosition)) {
            // On collision, stop movement completely
            velocity.set(0, 0, 0);
        } else {
            // No collision, proceed with movement
            character.position.copy(nextPosition);
        }
        
        // Update animations
        if (mixer) {
            mixer.update(delta);
            if (!isAttacking) {
                const speed = velocity.length() / (isSprinting ? SPRINT_SPEED : MOVEMENT_SPEED);
                if (isSprinting && runAction) {  
                    runAction.setEffectiveWeight(speed);
                    walkAction.setEffectiveWeight(0);
                } else {
                    walkAction.setEffectiveWeight(speed);
                    if (runAction) runAction.setEffectiveWeight(0);  
                }
                idleAction.setEffectiveWeight(1 - speed);
            }
        }
        
        // Update stags
        if (stagManager) stagManager.update(delta);
        
        // Update enemies
        if (enemyManager) enemyManager.update(delta);
        
        // Update gems
        scene.children.forEach((child) => {
            if (child.userData && child.userData.update) {
                child.userData.update(delta);
            }
        });
        
        // Check for gem collisions
        checkCollisions();
        
        // Camera follow logic - always behind character
        const idealOffset = new THREE.Vector3(
            -Math.sin(character.rotation.y) * CAMERA_DISTANCE,
            CAMERA_HEIGHT,
            -Math.cos(character.rotation.y) * CAMERA_DISTANCE
        );
        
        // Position camera behind character
        camera.position.lerp(character.position.clone().add(idealOffset), 0.1);
        camera.lookAt(
            character.position.x,
            character.position.y + 2,
            character.position.z
        );
        
        // Update game state
        window.dispatchEvent(new CustomEvent('beforeRender', {
            detail: {
                playerPosition: character.position,
                previousPosition: previousPosition,
                delta: delta * 1000 // Convert to milliseconds for consistency
            }
        }));
    }
    
    // Update minimap
    updateMinimap();
    
    // Render scene
    renderer.render(scene, camera);
    minimapRenderer.render(minimapScene, minimapCamera);
}

initializeWorld();
animate();
