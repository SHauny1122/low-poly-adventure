import * as THREE from 'three';

export class GemSystem {
    constructor(scene) {
        this.scene = scene;
    }
    
    createGem(position, type = 'green') {
        const geometry = new THREE.OctahedronGeometry(0.5);
        const material = new THREE.MeshStandardMaterial({ 
            color: type === 'green' ? 0x00ff00 : 0xff69b4,
            metalness: 0.7,
            roughness: 0.2
        });
        const gem = new THREE.Mesh(geometry, material);
        gem.position.copy(position);
        gem.position.y = 1;
        gem.userData.type = type;
        gem.userData.isGem = true;
        
        // Add floating animation
        const startY = gem.position.y;
        gem.userData.update = (delta) => {
            gem.position.y = startY + Math.sin(Date.now() * 0.003) * 0.3;
            gem.rotation.y += delta * 2;
        };
        
        this.scene.add(gem);
        return gem;
    }
}
