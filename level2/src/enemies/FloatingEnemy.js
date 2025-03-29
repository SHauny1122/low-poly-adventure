import * as THREE from 'three';

export class FloatingEnemy {
    constructor(position) {
        // Create a blue glowing sphere with reduced geometry complexity
        this.geometry = new THREE.SphereGeometry(1, 8, 8); // Reduced segments from 16 to 8
        this.material = new THREE.MeshBasicMaterial({ // Changed from MeshStandardMaterial to MeshBasicMaterial
            color: 0x0088ff,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Create group
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        
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
        
        // Pulse the color
        const pulseValue = 0.5 + Math.abs(Math.sin(this.time * 3)) * 0.5;
        this.material.color.setRGB(pulseValue * 0.0, pulseValue * 0.5, pulseValue);
        
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
        this.material.color.set(0x00ffff);
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
