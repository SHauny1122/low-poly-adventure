import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Character } from './character';
import { Portal } from './portal';
import { CyberpunkCity } from './cyberpunkCity';
import { DeLorean } from './vehicles/DeLorean';
import { Truck } from './vehicles/Truck';
import { Drone } from './vehicles/Drone';
import { Robot } from './vehicles/Robot';  
import { VendingMachine } from './props/VendingMachine';
import nipplejs from 'nipplejs';
import { AudioManager } from './audio/AudioManager';
import { CombatSystem } from './combat/CombatSystem';
import { FloatingEnemy } from './enemies/FloatingEnemy';

let scene, camera, renderer;
let character;
let portal;
let city;
let clock;
let delorean;
let truck;
let drones = []; // Array to hold multiple drones
let robots = []; // Array to hold multiple robots
let vendingMachines = []; // Array to store vending machines
let floatingEnemies = []; // Array to store floating enemies
let joystick = null;
let audioManager;
let combatSystem;  
const MOVEMENT_SPEED = 8;
const SPRINT_SPEED = 16;
const ACCELERATION = 4;
const DECELERATION = 8;
const ROTATION_SPEED = Math.PI * 1.0;
const ROTATION_SMOOTHING = 0.15;
const CAMERA_HEIGHT = 5;
const CAMERA_DISTANCE = 10.2; // Reduced by 15% from 12

// Enemy spawning variables
let enemySpawnTimer = 0;
const ENEMY_SPAWN_INTERVAL = 5; // Increased from 2 to 5 seconds between spawns
const MAX_ENEMIES = 5; // Limit the maximum number of enemies to 5 at a time

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

// Joystick state (for mobile)
const joystickState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    force: 0
};

// Joystick and mobile controls
const joystickContainer = document.createElement('div');
joystickContainer.style.position = 'fixed';
joystickContainer.style.bottom = '80px';
joystickContainer.style.left = '80px';
joystickContainer.style.width = '120px';
joystickContainer.style.height = '120px';
joystickContainer.style.zIndex = '1000';
document.body.appendChild(joystickContainer);

// Create mobile buttons for sprint, aim, and shoot
const createMobileButton = (text, bottom, right, callback) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.position = 'fixed';
    button.style.bottom = bottom;
    button.style.right = right;
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    button.style.border = '2px solid white';
    button.style.color = 'white';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';
    button.style.display = 'flex';
    button.style.justifyContent = 'center';
    button.style.alignItems = 'center';
    button.style.userSelect = 'none';
    
    // Add touch events
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        callback(true);
    });
    
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        callback(false);
    });
    
    document.body.appendChild(button);
    return button;
};

// Create sprint button
const sprintButton = createMobileButton('SPRINT', '80px', '80px', (isActive) => {
    isSprinting = isActive;
});

// Create aim button
const aimButton = createMobileButton('AIM', '150px', '80px', (isActive) => {
    if (isActive) {
        combatSystem.enterCombatMode();
    } else {
        combatSystem.exitCombatMode();
    }
});

// Create shoot button
const shootButton = createMobileButton('SHOOT', '80px', '150px', (isActive) => {
    if (isActive) {
        combatSystem.shoot();
    }
});

// Initialize joystick for mobile controls
function initJoystick() {
    // Remove existing joystick if it exists
    if (joystick) {
        joystick.destroy();
    }
    
    const options = {
        zone: joystickContainer,
        mode: 'static',
        position: { left: '50%', bottom: '50%' },
        color: 'white',
        size: 120,
        lockX: false,
        lockY: false
    };
    
    joystick = nipplejs.create(options);

    // Joystick event handlers
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
}

// Function to check if we're on a mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Function to show or hide mobile controls
function toggleMobileControls(show) {
    const display = show ? 'flex' : 'none';
    joystickContainer.style.display = display;
    sprintButton.style.display = display;
    aimButton.style.display = display;
    shootButton.style.display = display;
}

async function init() {
    // Create scene
    scene = new THREE.Scene();
    // Add cyberpunk fog
    const fogColor = new THREE.Color(0x150215); // Dark purple for cyberpunk feel
    scene.fog = new THREE.FogExp2(fogColor, 0.015); // Exponential fog for more realistic distance falloff
    scene.background = fogColor; // Match background with fog

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

        // Temporarily disable vehicle loading
        /*
        // Create and position DeLorean
        delorean = new DeLorean();
        await delorean.load();
        delorean.setPosition(5, 1, -15);
        delorean.setRotation(0, Math.PI * 0.139, 0);
        delorean.setScale(1);
        scene.add(delorean.group);

        // Create and position Truck
        truck = new Truck();
        await truck.load();
        truck.setPosition(-5, 1, 20);
        truck.setRotation(0, Math.PI * 0.5, 0);
        truck.setScale(10.5);
        scene.add(truck.group);

        // Create and position drones
        const NUM_DRONES = 5;
        const STREET_LENGTH = 580;
        const DRONE_SPACING = STREET_LENGTH / NUM_DRONES;

        for (let i = 0; i < NUM_DRONES; i++) {
            const drone = new Drone();
            await drone.load();
            
            const startZ = -290 + (i * DRONE_SPACING);
            const height = 8 + (Math.random() * 2 - 1);
            drone.setPosition(0, height, startZ);
            drone.setScale(0.8);

            drone.speed = 0.200 + (Math.random() * 0.04 - 0.02);
            
            scene.add(drone.group);
            drones.push(drone);
        }
        */

        // Create and position multiple robots
        // const robotCount = 5;
        // for (let i = 0; i < robotCount; i++) {
        //     const robot = new Robot();
        //     await robot.load();
        //     robot.setScale(0.3); // Much smaller scale, changed from 2.0
            
        //     // Set initial position with offset
        //     const startZ = -290 + ((580 / robotCount) * i); // Spread robots along street
        //     robot.setPosition(4, 0, startZ); // Offset on X axis to not collide with drones
            
        //     robots.push(robot);
        //     scene.add(robot.group);
        // }

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

        // Initialize audio manager
        audioManager = new AudioManager();

        // Start the music when the scene is ready
        scene.addEventListener('ready', () => {
            audioManager.start();
        });

        // Initialize combat system
        combatSystem = new CombatSystem(scene, camera, character);
        
        // Add shot handler to the scene
        scene.onShot = (crosshairPosition) => {
            // Create a raycaster from the camera
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(crosshairPosition, combatSystem.isInCombatMode ? combatSystem.combatCamera : camera);
            
            // Check for intersections with floating enemies
            let hit = false;
            for (const enemy of floatingEnemies) {
                if (!enemy.isDead && !enemy.isExploding) {
                    // Check if ray intersects enemy's bounding sphere
                    if (raycaster.ray.intersectsSphere(enemy.boundingSphere)) {
                        enemy.hit();
                        hit = true;
                        console.log("Hit enemy!");
                        break;
                    }
                }
            }
            
            return hit;
        };

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

        // Initialize joystick
        initJoystick();
        
        // Show mobile controls only on mobile devices
        toggleMobileControls(isMobileDevice());

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

    // WASD and Arrow controls with joystick integration
    if (keys['KeyW'] || keys['ArrowUp']) moveZ += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) rotate += 1;
    if (keys['KeyD'] || keys['ArrowRight']) rotate -= 1;

    // Add joystick input
    if (joystickState.forward) moveZ += joystickState.force;
    if (joystickState.backward) moveZ -= joystickState.force;
    if (joystickState.left) rotate += joystickState.force;
    if (joystickState.right) rotate -= joystickState.force;

    // Apply rotation to the group (which contains the model)
    character.group.rotation.y += rotate * ROTATION_SPEED * delta;

    // Calculate movement direction based on character's rotation
    const moveDirection = new THREE.Vector3(
        Math.sin(character.group.rotation.y) * moveZ,
        0,
        Math.cos(character.group.rotation.y) * moveZ
    );

    // Update velocity based on movement input
    const targetVelocity = moveDirection.multiplyScalar(isSprinting ? SPRINT_SPEED : MOVEMENT_SPEED);

    // Apply movement with acceleration
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
    
    // Update drones
    for (const drone of drones) {
        drone.update(delta);
    }
    
    // Update robots
    for (const robot of robots) {
        robot.update(delta);
    }
    
    // Spawn new floating enemies
    enemySpawnTimer += delta;
    if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL && floatingEnemies.length < MAX_ENEMIES) {
        spawnFloatingEnemy();
        enemySpawnTimer = 0;
    }
    
    // Update floating enemies
    for (let i = floatingEnemies.length - 1; i >= 0; i--) {
        const enemy = floatingEnemies[i];
        const alive = enemy.update(delta);
        
        if (!alive) {
            // Remove dead enemy
            scene.remove(enemy.group);
            enemy.dispose();
            floatingEnemies.splice(i, 1);
        }
    }

    // Update combat system
    combatSystem.update();

    // Only render with main camera if not in combat mode
    if (!combatSystem.isInCombatMode) {
        renderer.render(scene, camera);
    } else {
        renderer.render(scene, combatSystem.combatCamera);
    }
}

// Function to spawn a new floating enemy
function spawnFloatingEnemy() {
    // Spawn enemy at a random position on the street
    const x = (Math.random() * 10) - 5; // Random position across the street (-5 to 5)
    const y = 2 + (Math.random() * 3); // Random height between 2-5 units
    const z = -50; // Far down the street
    
    const position = new THREE.Vector3(x, y, z);
    const enemy = new FloatingEnemy(position);
    
    scene.add(enemy.group);
    floatingEnemies.push(enemy);
    
    console.log("Spawned new floating enemy at", x.toFixed(2), y.toFixed(2), z.toFixed(2));
}

// Make camera available globally for frustum culling
window.camera = camera;

// Initialize
init();
