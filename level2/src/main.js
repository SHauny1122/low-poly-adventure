import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Character } from './character';
import { Portal } from './portal';
import { CyberpunkCity } from './cyberpunkCity';
import { DeLorean } from './vehicles/DeLorean';
import { Truck } from './vehicles/Truck';

let scene, camera, renderer;
let character;
let portal;
let city;
let clock;
let delorean;
let truck;
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
        portal.group.rotation.z = Math.PI; // Rotate to face the right direction
        portal.group.scale.set(2, 2, 2); // Make portal twice as big
        scene.add(portal.group);

        // Create and position DeLorean
        delorean = new DeLorean();
        await delorean.load();
        delorean.setPosition(5, 1, -15); // Raised Y position to be level with road
        delorean.setRotation(0, Math.PI * 0.25, 0); // Angle it slightly
        delorean.setScale(1);
        scene.add(delorean.group);

        // Create and position Truck
        truck = new Truck();
        await truck.load();
        truck.setPosition(-5, 1, 20); // Keep same position
        truck.setRotation(0, Math.PI * 0.1, 0); // Keep same rotation
        truck.setScale(10); // Made it even bigger (8 -> 10)
        scene.add(truck.group);

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
    keys[event.code] = true;  
}

function onKeyUp(event) {
    if (event.code === 'ShiftLeft') {
        isSprinting = false;
    }
    keys[event.code] = false;  
}

function updateCharacterMovement(delta) {
    if (!character || !character.loaded) return;

    let moveZ = 0;
    let rotate = 0;

    // WASD and Arrow controls
    if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) rotate += 1;
    if (keys['KeyD'] || keys['ArrowRight']) rotate -= 1;

    // Apply rotation to the group (which contains the model)
    character.group.rotation.y += rotate * ROTATION_SPEED * delta;

    // Calculate movement direction based on group's rotation
    const moveDirection = new THREE.Vector3(
        Math.sin(character.group.rotation.y) * -moveZ,
        0,
        Math.cos(character.group.rotation.y) * -moveZ
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
            if (isSprinting) {
                character.playAnimation('CharacterArmature|Run', 0.3);
            } else {
                character.playAnimation('CharacterArmature|Walk', 0.3);
            }
        } else {
            character.playAnimation('CharacterArmature|Idle', 0.3);
        }
    }

    // Update camera - always behind character
    const idealOffset = new THREE.Vector3(
        -Math.sin(character.group.rotation.y) * CAMERA_DISTANCE,
        CAMERA_HEIGHT,
        -Math.cos(character.group.rotation.y) * CAMERA_DISTANCE
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
    const delta = clock.getDelta();

    if (character && character.loaded) {
        updateCharacterMovement(delta);
        character.update(delta);
        
        // Check for portal collision
        if (portal && portal.checkCollision(character)) {
            portal.transportToLevel(1); // Transport back to level 1
        }
    }

    if (portal) portal.update(delta);
    if (city) city.update(delta);
    // Remove vehicle updates since they don't need them
    
    renderer.render(scene, camera);
}

// Make camera available globally for frustum culling
window.camera = camera;

// Initialize
init();
