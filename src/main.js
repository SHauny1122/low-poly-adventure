import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import nipplejs from 'nipplejs';
import './game.js';

// Game constants
const MOVEMENT_SPEED = 8;  // Slightly slower for more natural movement
const ACCELERATION = 4;  // Smoother acceleration
const DECELERATION = 8;  // Smoother deceleration
const ROTATION_SPEED = Math.PI * 1.0;  // Slower rotation for more natural turning
const ROTATION_SMOOTHING = 0.15;  // Smooth out the rotation
const CAMERA_HEIGHT = 5;  // Increased camera height slightly
const CAMERA_DISTANCE = 12;  // Increased distance for better view
const CHARACTER_HEIGHT = 0;
const SPAWN_POINT = new THREE.Vector3(0, 0, 0);

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
scene.fog = new THREE.FogExp2(0x87CEEB, 0.005); // Same sky blue color, very subtle density

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
let character;
let mixer;
let walkAction;
let idleAction;
let attackAction;
let isAttacking = false;
const clock = new THREE.Clock();
const velocity = new THREE.Vector3();

// Controls
const keys = {
    'KeyW': false,
    'KeyS': false,
    'KeyA': false,
    'KeyD': false,
    'Space': false
};

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
        const targetVelocity = moveDirection.multiplyScalar(MOVEMENT_SPEED);
        velocity.lerp(targetVelocity, ACCELERATION * delta);
        
        // Update character position
        character.position.addScaledVector(velocity, delta);
        
        // Update animations
        if (mixer) {
            mixer.update(delta);
            if (!isAttacking) {
                const speed = velocity.length() / MOVEMENT_SPEED;
                walkAction.setEffectiveWeight(speed);
                idleAction.setEffectiveWeight(1 - speed);
            }
        }
        
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
    }
    
    renderer.render(scene, camera);
    minimapRenderer.render(minimapScene, minimapCamera);
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

// Load and place flat rocks
function placeFlatRocks() {
    loader.load('src/assets/models/Rock Flat.glb', (gltf) => {
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
            
            scene.add(rock);
        }
    });
}

// Load and place tree & rock clusters
function placeTreeRockClusters() {
    loader.load('src/assets/models/Trees %26 Rocks.glb', (gltf) => {
        // Create 15 clusters scattered around (fewer since they're larger)
        for (let i = 0; i < 15; i++) {
            const cluster = gltf.scene.clone();
            
            // Random position within a larger radius (since they're bigger)
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 300 + 100; // Between 100 and 400 units from center
            cluster.position.x = Math.cos(angle) * radius;
            cluster.position.z = Math.sin(angle) * radius;
            
            // Random rotation
            cluster.rotation.y = Math.random() * Math.PI * 2;
            
            // Random scale (0.9 to 1.1 of original size)
            const scale = 0.9 + Math.random() * 0.2;
            cluster.scale.set(scale, scale, scale);
            
            scene.add(cluster);
        }
    });
}

// Call both placement functions
placeFlatRocks();
placeTreeRockClusters();

loader.load('/assets/models/Character Animated (2).glb', function(gltf) {
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
    const guardMaterial = new THREE.MeshStandardMaterial({
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
    loader.load('/assets/models/Dagger.glb', function(gltf) {
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
    if (!isAttacking) {
        isAttacking = true;
        attackAction.reset();
        attackAction.setEffectiveWeight(1);
        attackAction.play();
        
        // No blending during attack
        if (velocity.lengthSq() > 0.1) {
            walkAction.setEffectiveWeight(0);  // No walk animation during attack
        }
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
const markerGeometry = new THREE.ConeGeometry(4, 8, 3);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x4169E1 }); // Royal blue
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
    if (character) {
        // Update player marker position
        playerMarker.position.x = character.position.x;
        playerMarker.position.z = character.position.z;
        playerMarker.rotation.y = -character.rotation.y + Math.PI/2;
        
        // Update camera to follow player
        minimapCamera.position.x = character.position.x;
        minimapCamera.position.z = character.position.z;
        
        // Render minimap with all markers
        minimapRenderer.render(minimapScene, minimapCamera);
    }
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

// Event listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Only left mouse button for attack
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

// Start animation loop
animate();
