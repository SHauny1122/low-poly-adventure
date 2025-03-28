import * as THREE from 'three';

export class CombatSystem {
    constructor(scene, camera, character) {
        this.scene = scene;
        this.mainCamera = camera;
        this.character = character;
        this.isInCombatMode = false;

        // Create a separate camera for combat mode
        this.combatCamera = new THREE.PerspectiveCamera(
            70,  // Higher FOV for combat view
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Create a nicer crosshair
        this.createCrosshair();
        
        // Mouse movement
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.initialRotationY = 0;
        
        // Create muzzle flash
        this.createMuzzleFlash();
        
        // Shooting system
        this.lastShootTime = 0;
        this.shootCooldown = 0.1; // 100ms between shots
        this.raycaster = new THREE.Raycaster();
        
        // Bind event handlers
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onKeyPress = this.onKeyPress.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);

        // Add event listeners
        document.addEventListener('keypress', this.onKeyPress);
    }

    createCrosshair() {
        // Create crosshair group
        this.crosshairGroup = new THREE.Group();

        // Create material with better opacity and thicker lines
        const crosshairMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 1, // Full opacity
            linewidth: 3  // Thicker lines
        });

        // Create center dot (tiny)
        const dotGeometry = new THREE.CircleGeometry(0.002, 32);  // Made dot much smaller
        const dotMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        this.centerDot = new THREE.Mesh(dotGeometry, dotMaterial);
        
        // Create lines with gaps (much bigger)
        // Vertical lines (top and bottom with gap)
        const verticalTop = new Float32Array([
            0, 0.1, 0,   // Top outer
            0, 0.03, 0    // Top inner
        ]);
        const verticalBottom = new Float32Array([
            0, -0.1, 0,  // Bottom outer
            0, -0.03, 0   // Bottom inner
        ]);

        // Horizontal lines (left and right with gap)
        const horizontalLeft = new Float32Array([
            -0.1, 0, 0,  // Left outer
            -0.03, 0, 0   // Left inner
        ]);
        const horizontalRight = new Float32Array([
            0.1, 0, 0,   // Right outer
            0.03, 0, 0    // Right inner
        ]);

        // Create the lines
        const verticalTopGeometry = new THREE.BufferGeometry();
        const verticalBottomGeometry = new THREE.BufferGeometry();
        const horizontalLeftGeometry = new THREE.BufferGeometry();
        const horizontalRightGeometry = new THREE.BufferGeometry();

        verticalTopGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verticalTop, 3));
        verticalBottomGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verticalBottom, 3));
        horizontalLeftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(horizontalLeft, 3));
        horizontalRightGeometry.setAttribute('position', new THREE.Float32BufferAttribute(horizontalRight, 3));

        // Create the line segments
        this.verticalTopLine = new THREE.Line(verticalTopGeometry, crosshairMaterial);
        this.verticalBottomLine = new THREE.Line(verticalBottomGeometry, crosshairMaterial);
        this.horizontalLeftLine = new THREE.Line(horizontalLeftGeometry, crosshairMaterial);
        this.horizontalRightLine = new THREE.Line(horizontalRightGeometry, crosshairMaterial);

        // Add everything to the group
        this.crosshairGroup.add(this.centerDot);
        this.crosshairGroup.add(this.verticalTopLine);
        this.crosshairGroup.add(this.verticalBottomLine);
        this.crosshairGroup.add(this.horizontalLeftLine);
        this.crosshairGroup.add(this.horizontalRightLine);

        // Position crosshair in front of combat camera (closer to camera)
        this.crosshairGroup.position.z = -0.1;
        
        // Hide crosshair initially
        this.crosshairGroup.visible = false;

        // Add to scene initially
        this.scene.add(this.crosshairGroup);
    }

    createMuzzleFlash() {
        // Create a group for the muzzle flash
        this.muzzleFlash = new THREE.Group();
        
        // Create star-shaped flash
        const flashGeometry = new THREE.PlaneGeometry(1, 1);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa44, // Orange-yellow color
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending // Makes it glow
        });

        // Create multiple planes for 3D effect
        for (let i = 0; i < 3; i++) {
            const plane = new THREE.Mesh(flashGeometry, flashMaterial.clone());
            plane.rotation.z = (i * Math.PI) / 3; // Rotate each plane
            this.muzzleFlash.add(plane);
        }

        // Add a center glow
        const centerGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const centerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, // White center
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const centerGlow = new THREE.Mesh(centerGeometry, centerMaterial);
        this.muzzleFlash.add(centerGlow);

        this.scene.add(this.muzzleFlash);
    }

    shoot() {
        const now = performance.now() / 1000;
        if (now - this.lastShootTime < this.shootCooldown) return;
        this.lastShootTime = now;

        // Position muzzle flash in front of camera
        const flashPosition = this.combatCamera.position.clone();
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.combatCamera.quaternion);
        flashPosition.addScaledVector(forward, 2);
        
        this.muzzleFlash.position.copy(flashPosition);
        this.muzzleFlash.lookAt(
            flashPosition.x + forward.x,
            flashPosition.y + forward.y,
            flashPosition.z + forward.z
        );
        
        // Show muzzle flash with random rotation for variety
        this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
        this.muzzleFlash.children.forEach(flash => {
            flash.material.opacity = 1;
            // Random scale for variety
            const scale = 0.8 + Math.random() * 0.4;
            flash.scale.set(scale, scale, scale);
        });

        // Get normalized screen coordinates of crosshair center (always in center of screen)
        const crosshairPosition = new THREE.Vector2(0, 0);
        
        // Try both scene and window.scene for the shot handler
        console.log('Firing shot, checking for onShot handler...');
        let hit = false;
        if (this.scene && this.scene.onShot) {
            console.log('Found shot handler on scene');
            hit = this.scene.onShot(crosshairPosition);
        } else if (window.scene && window.scene.onShot) {
            console.log('Found shot handler on window.scene');
            hit = window.scene.onShot(crosshairPosition);
        } else {
            console.log('No shot handler found on scene or window.scene');
            // Try to find the handler on any child of the scene
            this.scene.traverse((object) => {
                if (!hit && object.onShot) {
                    console.log('Found shot handler on scene object');
                    hit = object.onShot(crosshairPosition);
                }
            });
        }
        console.log('Shot result:', hit ? 'Hit!' : 'Miss');
        
        // Hide muzzle flash after 50ms with fade
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < 100) { // 100ms animation
                const opacity = 1 - (elapsed / 100);
                this.muzzleFlash.children.forEach(flash => {
                    flash.material.opacity = opacity;
                });
                requestAnimationFrame(animate);
            } else {
                this.muzzleFlash.children.forEach(flash => {
                    flash.material.opacity = 0;
                });
            }
        };
        animate();
    }

    onMouseDown(event) {
        if (!this.isInCombatMode) return;
        if (event.button === 0) { // Left click
            console.log('Left click detected in combat mode');
            this.shoot();
        }
    }

    onMouseMove(event) {
        if (!this.isInCombatMode) return;

        const sensitivity = 0.002;
        this.mouseX = event.movementX * sensitivity;
        this.mouseY = event.movementY * sensitivity;

        // Update camera rotation
        this.targetRotationX += this.mouseY;  
        this.targetRotationY -= this.mouseX;  

        // Limit vertical rotation
        this.targetRotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.targetRotationX));

        // Limit horizontal rotation to 180 degrees (90 degrees each side)
        const maxRotation = Math.PI / 2; // 90 degrees
        const deltaFromInitial = ((this.targetRotationY - this.initialRotationY + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (deltaFromInitial > maxRotation) {
            this.targetRotationY = this.initialRotationY + maxRotation;
        } else if (deltaFromInitial < -maxRotation) {
            this.targetRotationY = this.initialRotationY - maxRotation;
        }

        // Apply rotation
        this.combatCamera.rotation.x = this.targetRotationX;
        this.combatCamera.rotation.y = this.targetRotationY;
    }

    async toggleCombatMode() {
        try {
            if (!this.isInCombatMode) {
                // Enter combat mode
                console.log('Entering combat mode');
                
                // Position combat camera at arms length in front of character
                const characterPosition = this.character.group.position.clone();
                const characterDirection = new THREE.Vector3(0, 0, 1);
                characterDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.character.group.rotation.y);
                characterDirection.multiplyScalar(1.5);
                
                characterPosition.y += 1.5;
                characterPosition.add(characterDirection);
                this.combatCamera.position.copy(characterPosition);
                
                // Reset rotations to match character's direction
                this.targetRotationX = 0;
                this.targetRotationY = this.character.group.rotation.y + Math.PI;
                this.initialRotationY = this.targetRotationY;
                this.combatCamera.rotation.set(0, this.targetRotationY, 0);
                
                // Make combat camera globally available
                window.combatCamera = this.combatCamera;
                
                // Show crosshair
                this.crosshairGroup.visible = true;
                
                // Only request pointer lock if not already locked
                if (!document.pointerLockElement) {
                    await document.body.requestPointerLock();
                }
                
                // Add mouse listeners
                document.addEventListener('mousemove', this.onMouseMove);
                document.addEventListener('mousedown', this.onMouseDown);
                this.isInCombatMode = true;
            } else {
                // Exit combat mode
                console.log('Exiting combat mode');
                
                // Hide crosshair
                this.crosshairGroup.visible = false;
                
                // Remove global combat camera reference
                window.combatCamera = null;
                
                // Only exit pointer lock if we're currently locked
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                
                // Remove mouse listeners
                document.removeEventListener('mousemove', this.onMouseMove);
                document.removeEventListener('mousedown', this.onMouseDown);
                this.isInCombatMode = false;
            }
        } catch (error) {
            console.error('Error toggling combat mode:', error);
        }
    }

    onKeyPress(event) {
        if (event.code === 'Space') {
            this.toggleCombatMode();
        }
    }

    update(delta) {
        if (!this.isInCombatMode) return;

        // Update combat camera position to follow character
        if (this.character) {
            const characterPosition = this.character.group.position.clone();
            const characterDirection = new THREE.Vector3(0, 0, 1);
            characterDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.character.group.rotation.y);
            characterDirection.multiplyScalar(1.5);
            
            characterPosition.y += 1.5;
            characterPosition.add(characterDirection);
            this.combatCamera.position.copy(characterPosition);

            // Update crosshair position to match camera
            this.crosshairGroup.position.copy(this.combatCamera.position);
            this.crosshairGroup.rotation.copy(this.combatCamera.rotation);
            this.crosshairGroup.translateZ(-0.1);
        }
    }

    // Clean up when removing the system
    dispose() {
        document.removeEventListener('keypress', this.onKeyPress);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        // Clean up crosshair and muzzle flash
        if (this.crosshairGroup) {
            this.scene.remove(this.crosshairGroup);
        }
        if (this.muzzleFlash) {
            this.scene.remove(this.muzzleFlash);
        }
    }
}
