import * as THREE from 'three';

export class Portal {
    constructor() {
        // Create a simple portal ring
        const geometry = new THREE.TorusGeometry(2, 0.3, 16, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x00ffff,
            emissive: 0x0088ff,
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = Math.PI / 2; // Make it stand upright
        
        // Add a simple glow effect
        const glowGeometry = new THREE.TorusGeometry(2.2, 0.4, 16, 32);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.3
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.rotation.x = Math.PI / 2;
        
        // Create a group to hold both meshes
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.glowMesh);
        
        // Add detection sphere for collision
        this.detectionRadius = 3;
        this.lastCheckTime = 0;
        this.checkInterval = 500; // Check every 500ms
    }

    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }

    update(delta) {
        // Rotate the portal slowly
        this.mesh.rotation.z += delta * 0.5;
        this.glowMesh.rotation.z -= delta * 0.3;
        
        // Pulse the glow
        const pulseScale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
        this.glowMesh.scale.set(pulseScale, pulseScale, 1);
    }

    checkCollision(playerPosition) {
        const now = Date.now();
        if (now - this.lastCheckTime < this.checkInterval) return false;
        this.lastCheckTime = now;

        const distance = playerPosition.distanceTo(this.group.position);
        return distance < this.detectionRadius;
    }

    fadeOut() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: black;
                opacity: 0;
                transition: opacity 1s;
                pointer-events: none;
                z-index: 1000;
            `;
            document.body.appendChild(overlay);

            // Trigger fade out
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });

            // After fade completes
            setTimeout(() => {
                resolve();
            }, 1000);
        });
    }

    async transportToLevel(targetLevel) {
        await this.fadeOut();
        
        // Switch to the other level using relative paths
        const targetUrl = targetLevel === 1 
            ? '/'           // Level 1 is at root
            : '/level2/';   // Level 2 is in level2 directory
            
        window.location.href = targetUrl;
    }
}
