import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Barracks {
    constructor(scene, minimapScene) {
        this.scene = scene;
        this.minimapScene = minimapScene;
        this.position = new THREE.Vector3(50, 0, -100);
        this.loaded = false;
        this.model = null;
        
        // Create minimap marker
        const markerGeometry = new THREE.BoxGeometry(5, 5, 5);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf4a460,
            transparent: true,
            opacity: 0.8
        });
        this.minimapMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.minimapMarker.position.copy(this.position);
        this.minimapMarker.position.y = 2;
        this.minimapMarker.layers.set(1);
        this.minimapScene.add(this.minimapMarker);
        
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('src/assets/buildings/Barracks.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.scale.set(8, 8, 8);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.scene.add(this.model);
            this.loaded = true;
        }, (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }, (error) => {
            console.error('Error loading barracks:', error);
        });
    }

    isPlayerNear(playerPosition) {
        if (!this.loaded) return false;
        const distance = playerPosition.distanceTo(this.position);
        return distance < 30;
    }

    update(playerPosition) {
        // Add any barracks-specific update logic here
        // For example, opening doors when player is near
    }
}
