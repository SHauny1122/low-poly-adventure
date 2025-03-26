import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Character } from './character';
import { Portal } from './portal';
import { CyberpunkCity } from './cyberpunkCity';

let scene, camera, renderer;
let character;
let portal;
let city;
let clock;
const MOVEMENT_SPEED = 8;
const SPRINT_SPEED = 16;
const ACCELERATION = 4;
const DECELERATION = 8;
const ROTATION_SPEED = Math.PI * 1.0;
const ROTATION_SMOOTHING = 0.15;
const CAMERA_HEIGHT = 5;
const CAMERA_DISTANCE = 12;

// Movement variables
const velocity = new THREE.Vector3();
let isSprinting = false;

// Key state
const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    ShiftLeft: false
};

async function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Dark background

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Create clock
    clock = new THREE.Clock();

    try {
        // Create cyberpunk city
        city = new CyberpunkCity();
        scene.add(city.group);

        // Create and load character
        character = new Character();
        const model = await character.load();
        scene.add(model);

        // Set initial character position
        character.group.position.set(0, 0, -5);

        // Create and position portal
        portal = new Portal();
        portal.setPosition(0, 1, -20);
        portal.group.rotation.x = Math.PI / 2; // Rotate 90 degrees to stand upright
        portal.group.scale.set(2, 2, 2); // Make portal twice as big
        scene.add(portal.group);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x666666); // Brighter ambient light
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
        directionalLight.position.set(10, 15, 10);
        scene.add(directionalLight);

        // Add some cyberpunk-style point lights
        const colors = [0xff00ff, 0x00ffff, 0xff0088];
        colors.forEach((color, i) => {
            const light = new THREE.PointLight(color, 2, 30); // Increased intensity and range
            light.position.set(Math.sin(i * Math.PI * 2/3) * 15, 8, Math.cos(i * Math.PI * 2/3) * 15);
            scene.add(light);
        });

        // Setup keyboard controls
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Start animation loop
        animate();
    } catch (error) {
        console.error('Error initializing level:', error);
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.textContent = 'Error loading level. Please refresh.';
        }
    }
}

function onKeyDown(event) {
    if (event.code === 'ShiftLeft') {
        isSprinting = true;
    }
    keys[event.key.toLowerCase()] = true;
}

function onKeyUp(event) {
    if (event.code === 'ShiftLeft') {
        isSprinting = false;
    }
    keys[event.key.toLowerCase()] = false;
}

function updateCharacterMovement() {
    if (!character || !character.group) return;

    const delta = clock.getDelta();
    let moveZ = 0;
    let rotate = 0;

    // WASD and Arrow controls
    if (keys.w || keys.ArrowUp) moveZ -= 1;
    if (keys.s || keys.ArrowDown) moveZ += 1;
    if (keys.a || keys.ArrowLeft) rotate += 1;
    if (keys.d || keys.ArrowRight) rotate -= 1;

    // Apply rotation
    character.model.rotation.y += rotate * ROTATION_SPEED * delta;

    // Calculate movement direction based on character's rotation
    const moveDirection = new THREE.Vector3(
        Math.sin(character.model.rotation.y) * -moveZ,
        0,
        Math.cos(character.model.rotation.y) * -moveZ
    );

    // Apply movement with acceleration
    const targetVelocity = moveDirection.multiplyScalar(isSprinting ? SPRINT_SPEED : MOVEMENT_SPEED);
    velocity.lerp(targetVelocity, ACCELERATION * delta);

    // Calculate next position
    const newX = character.group.position.x + velocity.x * delta;
    const newZ = character.group.position.z + velocity.z * delta;

    // Check collision and update position
    if (!city.checkCollision(newX, newZ)) {
        character.group.position.x = newX;
        character.group.position.z = newZ;

        // Handle animations based on movement
        const speed = velocity.length();
        if (speed > 0.1) { // If moving
            if (isSprinting && character.animations['CharacterArmature|Run']) {
                character.playAnimation('CharacterArmature|Run', 0.3);
            } else if (character.animations['CharacterArmature|Walk']) {
                character.playAnimation('CharacterArmature|Walk', 0.3);
            }
        } else if (character.animations['CharacterArmature|Idle']) {
            character.playAnimation('CharacterArmature|Idle', 0.3);
        }
    }

    // Update mixer for animations
    if (character.mixer) {
        character.mixer.update(delta);
    }

    // Update camera - always behind character
    const idealOffset = new THREE.Vector3(
        -Math.sin(character.model.rotation.y) * CAMERA_DISTANCE,
        CAMERA_HEIGHT,
        -Math.cos(character.model.rotation.y) * CAMERA_DISTANCE
    );

    camera.position.lerp(character.group.position.clone().add(idealOffset), ROTATION_SMOOTHING);
    camera.lookAt(
        character.group.position.x,
        character.group.position.y + 2,
        character.group.position.z
    );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update character movement
    updateCharacterMovement();
    
    // Render scene
    renderer.render(scene, camera);
}

// Make camera available globally for frustum culling
window.camera = camera;

// Initialize
init();
