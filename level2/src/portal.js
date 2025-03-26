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
        this.mesh.rotation.x = 0; // Make it stand upright
        
        // Add a simple glow effect
        const glowGeometry = new THREE.TorusGeometry(2.2, 0.4, 16, 32);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.3
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.rotation.x = 0;

        // Create the portal center effect
        const centerGeometry = new THREE.CircleGeometry(1.8, 32);
        const centerMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = length(vUv - center);
                    
                    // Create swirling effect
                    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
                    float spiral = sin(dist * 10.0 - time * 2.0 + angle * 4.0);
                    
                    // Create color gradient
                    vec3 color1 = vec3(0.0, 0.8, 1.0); // Cyan
                    vec3 color2 = vec3(0.0, 0.0, 0.8); // Dark blue
                    vec3 color = mix(color1, color2, spiral * 0.5 + 0.5);
                    
                    // Add pulsing
                    float pulse = sin(time * 3.0) * 0.2 + 0.8;
                    
                    // Add edge fade
                    float edge = smoothstep(1.0, 0.8, dist);
                    
                    gl_FragColor = vec4(color * pulse, edge);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        this.centerMesh.rotation.x = 0;
        
        // Create a group to hold all meshes
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.glowMesh);
        this.group.add(this.centerMesh);
        
        // Detection sphere for collision
        this.detectionRadius = 3;
        this.lastCheckTime = 0;
        this.checkInterval = 500; // Check every 500ms
    }

    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }

    update(delta) {
        // Pulse the glow
        const pulseScale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
        this.glowMesh.scale.set(pulseScale, pulseScale, 1);
        
        if (this.centerMesh && this.centerMesh.material.uniforms) {
            this.centerMesh.material.uniforms.time.value += delta;
        }
    }

    checkCollision(character) {
        const now = Date.now();
        if (now - this.lastCheckTime < this.checkInterval) return false;
        this.lastCheckTime = now;

        const characterPos = character.getPosition();
        const portalPos = this.group.position;
        
        const distance = characterPos.distanceTo(portalPos);
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
                transition: opacity 1s ease;
                pointer-events: none;
            `;
            document.body.appendChild(overlay);
            
            // Start fade out
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                
                // When fade out is complete
                setTimeout(() => {
                    resolve();
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                    }, 100);
                }, 1000);
            });
        });
    }

    async transportToLevel(targetLevel) {
        await this.fadeOut();
        window.location.href = targetLevel === 2 ? '../level2/index.html' : '../index.html';
    }
}
