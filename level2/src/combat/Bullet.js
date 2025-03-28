import * as THREE from 'three';

export class Bullet {
    constructor(position, direction) {
        // Super simple bullet - just a big blue sphere
        const geometry = new THREE.SphereGeometry(2, 16, 16); // Very big for testing
        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Pure blue
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Create group
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        
        // Set position and direction
        this.group.position.copy(position);
        this.direction = direction.normalize();
        
        // Simple values
        this.speed = 10; // Very slow for testing
        this.lifetime = 5; // Long lifetime for testing
        this.age = 0;
        
        console.log("Created bullet at", 
            this.group.position.x.toFixed(2),
            this.group.position.y.toFixed(2),
            this.group.position.z.toFixed(2)
        );
    }

    update(delta) {
        // Super simple movement
        const moveX = this.direction.x * this.speed * delta;
        const moveY = this.direction.y * this.speed * delta;
        const moveZ = this.direction.z * this.speed * delta;
        
        this.group.position.x += moveX;
        this.group.position.y += moveY;
        this.group.position.z += moveZ;
        
        console.log("Bullet now at", 
            this.group.position.x.toFixed(2),
            this.group.position.y.toFixed(2),
            this.group.position.z.toFixed(2)
        );
        
        // Update age
        this.age += delta;
        return this.age < this.lifetime;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
