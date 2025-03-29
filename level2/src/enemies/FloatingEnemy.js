import * as THREE from 'three';

export class FloatingEnemy {
    constructor(position) {
        // Create a blue glowing sphere
        this.geometry = new THREE.SphereGeometry(1, 16, 16);
        this.material = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            emissive: 0x0044ff,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Add a point light to make it glow
        this.light = new THREE.PointLight(0x0088ff, 1, 10);
        this.light.position.set(0, 0, 0);
        
        // Create group
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.light);
        
        // Set position
        if (position) {
            this.group.position.copy(position);
        }
        
        // Movement properties
        this.speed = 5 + Math.random() * 3; // Random speed between 5-8
        this.floatAmplitude = 0.5; // How high it floats up and down
        this.floatSpeed = 2 + Math.random() * 2; // Speed of floating motion
        this.initialY = this.group.position.y;
        this.time = Math.random() * Math.PI * 2; // Random starting phase
        
        // Health and state
        this.health = 1;
        this.isDead = false;
        this.isExploding = false;
        this.explosionTime = 0;
        this.explosionDuration = 0.5; // Half a second explosion
        
        // Collision detection
        this.boundingSphere = new THREE.Sphere(this.group.position, 1);
    }
    
    update(delta) {
        if (this.isDead) return false;
        
        if (this.isExploding) {
            this.updateExplosion(delta);
            return true;
        }
        
        // Move forward (toward positive Z)
        this.group.position.z += this.speed * delta;
        
        // Floating up and down motion
        this.time += delta * this.floatSpeed;
        this.group.position.y = this.initialY + Math.sin(this.time) * this.floatAmplitude;
        
        // Slight wobble rotation
        this.group.rotation.x = Math.sin(this.time * 0.5) * 0.1;
        this.group.rotation.z = Math.cos(this.time * 0.7) * 0.1;
        
        // Pulse the glow
        const pulseIntensity = 1 + Math.sin(this.time * 3) * 0.3;
        this.light.intensity = pulseIntensity;
        this.material.emissiveIntensity = pulseIntensity;
        
        // Update bounding sphere for collision detection
        this.boundingSphere.center.copy(this.group.position);
        
        // Remove if too far away
        if (this.group.position.z > 50) {
            return false;
        }
        
        return true;
    }
    
    hit() {
        if (this.isDead || this.isExploding) return;
        
        this.health -= 1;
        if (this.health <= 0) {
            this.startExplosion();
        }
    }
    
    startExplosion() {
        this.isExploding = true;
        this.explosionTime = 0;
        
        // Create explosion effect - make the sphere bigger and fade out
        this.mesh.scale.set(1, 1, 1);
        
        // Change color to more intense blue
        this.material.emissive.set(0x00ffff);
        this.material.emissiveIntensity = 3;
        this.light.color.set(0x00ffff);
        this.light.intensity = 3;
    }
    
    updateExplosion(delta) {
        this.explosionTime += delta;
        
        if (this.explosionTime < this.explosionDuration) {
            // Expand the sphere
            const scale = 1 + (this.explosionTime / this.explosionDuration) * 3;
            this.mesh.scale.set(scale, scale, scale);
            
            // Fade out
            const opacity = 1 - (this.explosionTime / this.explosionDuration);
            this.material.opacity = opacity;
            this.light.intensity = 3 * opacity;
        } else {
            this.isDead = true;
            return false;
        }
        
        return true;
    }
    
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}
