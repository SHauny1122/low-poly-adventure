import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import nipplejs from 'nipplejs';
import './game.js';

// Game constants
const MOVEMENT_SPEED = 10;
const ACCELERATION = 30;
const DECELERATION = 40;
const ROTATION_SPEED = 8;
const CAMERA_HEIGHT = 3;
const CAMERA_DISTANCE = 8;
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
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

// Set initial camera position behind where character will spawn
camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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
const direction = new THREE.Vector3();

// Controls
const keys = {
    'KeyW': false,
    'KeyS': false,
    'KeyA': false,
    'KeyD': false,
    'Space': false
};

// Initialize minimap with responsive size
const isMobile = window.innerWidth < 768;
const minimapWidth = isMobile ? 120 : 200;  // Smaller on mobile
const minimapHeight = isMobile ? 120 : 200;
const minimapContainer = document.createElement('div');
minimapContainer.style.position = 'absolute';
minimapContainer.style.bottom = isMobile ? '10px' : '20px';  // Closer to edge on mobile
minimapContainer.style.right = isMobile ? '10px' : '20px';
minimapContainer.style.width = minimapWidth + 'px';
minimapContainer.style.height = minimapHeight + 'px';
minimapContainer.style.border = '2px solid white';
minimapContainer.style.borderRadius = '5px';
minimapContainer.style.overflow = 'hidden';
minimapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
document.body.appendChild(minimapContainer);

const minimapCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
minimapCamera.position.set(0, 100, 0);
minimapCamera.lookAt(new THREE.Vector3(0, 0, 0));
minimapCamera.layers.set(1);

const minimapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
minimapRenderer.setSize(minimapWidth, minimapHeight);
minimapRenderer.setClearColor(0x000000, 0.3);
minimapContainer.appendChild(minimapRenderer.domElement);

// Create player marker for minimap
const markerGeometry = new THREE.ConeGeometry(1.5, 3, 3);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const playerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
playerMarker.rotation.x = -Math.PI / 2;
playerMarker.rotation.z = Math.PI;
playerMarker.layers.set(1);
scene.add(playerMarker);

// Load character model
const loader = new GLTFLoader();
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
    attackAction.setLoop(THREE.LoopOnce);
    attackAction.clampWhenFinished = true;
    
    mixer.addEventListener('finished', function(e) {
        if (e.action === attackAction) {
            isAttacking = false;
            attackAction.stop();
            
            // Return to previous animation with smooth transition
            if (velocity.lengthSq() > 0.1) {
                walkAction.fadeIn(0.2);
                idleAction.fadeOut(0.2);
            } else {
                walkAction.fadeOut(0.2);
                idleAction.fadeIn(0.2);
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
        
        // Blend with current animation
        if (velocity.lengthSq() > 0.1) {
            walkAction.setEffectiveWeight(0.3);
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (mixer) {
        mixer.update(delta);
    }
    
    if (character) {
        // Get camera angle for movement direction
        const cameraAngle = Math.PI + Math.atan2(
            camera.position.x - character.position.x,
            camera.position.z - character.position.z
        );

        // Calculate movement direction relative to camera
        let directionX = 0;
        let directionZ = 0;

        // Movement controls exactly as per working memory
        if (keys['KeyW']) { // Forward
            directionX += Math.sin(cameraAngle);
            directionZ += Math.cos(cameraAngle);
        }
        if (keys['KeyS']) { // Backward
            directionX -= Math.sin(cameraAngle);
            directionZ -= Math.cos(cameraAngle);
        }
        if (keys['KeyA']) { // Left
            directionX += Math.cos(cameraAngle);
            directionZ -= Math.sin(cameraAngle);
        }
        if (keys['KeyD']) { // Right
            directionX -= Math.cos(cameraAngle);
            directionZ += Math.sin(cameraAngle);
        }

        // Normalize movement direction
        const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
        if (length > 0) {
            directionX /= length;
            directionZ /= length;
        }

        if (length > 0.1) {
            const moveDirection = new THREE.Vector3(directionX, 0, directionZ);
            velocity.lerp(moveDirection.multiplyScalar(MOVEMENT_SPEED), ACCELERATION * delta);
            character.position.addScaledVector(velocity, delta);
            
            // Character always faces movement direction
            character.rotation.y = Math.atan2(directionX, directionZ);
            
            // Transition to walking animation
            if (!isAttacking) {
                walkAction.setEffectiveWeight(1);
                idleAction.setEffectiveWeight(0);
            }
            
            // Update camera to follow behind character at fixed angle
            const idealOffset = new THREE.Vector3(
                character.position.x - Math.sin(character.rotation.y) * CAMERA_DISTANCE,
                character.position.y + CAMERA_HEIGHT,
                character.position.z - Math.cos(character.rotation.y) * CAMERA_DISTANCE
            );
            
            camera.position.lerp(idealOffset, 0.1);
            camera.lookAt(character.position);
        } else {
            velocity.lerp(new THREE.Vector3(0, 0, 0), DECELERATION * delta);
            
            // Transition to idle animation
            if (!isAttacking) {
                walkAction.setEffectiveWeight(0);
                idleAction.setEffectiveWeight(1);
            }
        }
        
        // Update minimap
        playerMarker.position.copy(character.position);
        playerMarker.position.y = 2;
        playerMarker.rotation.z = character.rotation.y + Math.PI;
        minimapCamera.position.x = character.position.x;
        minimapCamera.position.z = character.position.z;
        minimapRenderer.render(scene, minimapCamera);
    }
    
    // Render both main view and minimap
    renderer.render(scene, camera);
    
    // Dispatch animation update event
    window.dispatchEvent(new CustomEvent('beforeRender', {
        detail: {
            delta: delta,
            playerPosition: character ? character.position : new THREE.Vector3()
        }
    }));
}

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

// Mobile controls
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
    const force = Math.min(data.force, 1);
    
    keys['KeyW'] = false;
    keys['KeyS'] = false;
    keys['KeyA'] = false;
    keys['KeyD'] = false;
    
    if (force > 0.1) {
        // Forward is up (-PI/4 to -3PI/4)
        // Back is down (PI/4 to 3PI/4)
        // Left is left (3PI/4 to -3PI/4)
        // Right is right (-PI/4 to PI/4)
        if (angle > -Math.PI/4 && angle < Math.PI/4) keys['KeyD'] = true;         // Right
        if (angle > Math.PI/4 && angle < 3*Math.PI/4) keys['KeyS'] = true;        // Back
        if (angle > 3*Math.PI/4 || angle < -3*Math.PI/4) keys['KeyA'] = true;     // Left
        if (angle > -3*Math.PI/4 && angle < -Math.PI/4) keys['KeyW'] = true;      // Forward
    }
});

joystick.on('end', () => {
    keys['KeyW'] = false;
    keys['KeyS'] = false;
    keys['KeyA'] = false;
    keys['KeyD'] = false;
});

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

// Handle window resize for responsive UI
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update minimap size
    minimapContainer.style.width = (isMobile ? 120 : 200) + 'px';
    minimapContainer.style.height = (isMobile ? 120 : 200) + 'px';
    minimapContainer.style.bottom = isMobile ? '10px' : '20px';
    minimapContainer.style.right = isMobile ? '10px' : '20px';
    minimapRenderer.setSize(isMobile ? 120 : 200, isMobile ? 120 : 200);
});

// Start animation loop
animate();
