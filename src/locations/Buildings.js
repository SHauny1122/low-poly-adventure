import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class Buildings {
    constructor(scene, minimapScene) {
        this.scene = scene;
        this.minimapScene = minimapScene;
        this.buildings = [];
        
        // Building configurations with positions and scales
        this.buildingConfigs = [
            {
                name: 'Barracks',
                path: '/assets/buildings/Barracks.glb',
                position: new THREE.Vector3(50, 0, -100),
                scale: 8,
                markerColor: 0xf4a460
            },
            {
                name: 'Farm',
                path: '/assets/models/Farm.glb',
                position: new THREE.Vector3(-150, 0, 100),  // Northeast
                scale: 8,  // Matched to barracks
                markerColor: 0x90EE90  // Light green
            },
            {
                name: 'Sawmill',
                path: '/assets/models/Fantasy Sawmill.glb',
                position: new THREE.Vector3(200, 0, 150),   // Southeast
                scale: 8,  // Matched to barracks
                markerColor: 0x8B4513  // Saddle brown
            },
            {
                name: 'Houses',
                path: '/assets/models/Houses.glb',
                position: new THREE.Vector3(-100, 0, -200), // Northwest
                scale: 8,  // Matched to barracks
                markerColor: 0xDEB887  // Burlywood
            }
        ];
        
        this.loadBuildings();
    }

    createMinimapMarker(position, color) {
        const markerGeometry = new THREE.BoxGeometry(5, 5, 5);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        marker.position.y = 2;
        marker.layers.set(1);
        this.minimapScene.add(marker);
        return marker;
    }

    loadBuildings() {
        const loader = new GLTFLoader();
        
        this.buildingConfigs.forEach(config => {
            loader.load(config.path, (gltf) => {
                const model = gltf.scene;
                model.position.copy(config.position);
                model.scale.set(config.scale, config.scale, config.scale);
                
                // Enable shadows with distance optimization
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enable fog for distance fade-out
                        if (child.material) {
                            child.material.fog = true;
                        }
                    }
                });
                
                this.scene.add(model);
                
                // Create minimap marker
                const marker = this.createMinimapMarker(config.position, config.markerColor);
                
                // Add building collision with different radii
                if (window.obstacles) {
                    window.obstacles.push({
                        position: config.position.clone(),
                        // Adjust radius based on building type
                        radius: config.name === 'Sawmill' ? 20 : // Larger for Sawmill
                                (config.name === 'Barracks' ? 8 : // Even smaller for Barracks
                                (config.name === 'Farm' ? 10 : 15)) // Farm and others
                    });
                }
                
                this.buildings.push({
                    name: config.name,
                    model: model,
                    marker: marker,
                    position: config.position
                });
                
            }, undefined, (error) => {
                console.error(`Error loading ${config.name}:`, error);
            });
        });
    }

    isPlayerNearAnyBuilding(playerPosition, threshold = 20) {
        return this.buildings.some(building => {
            const distance = playerPosition.distanceTo(building.position);
            return distance < threshold;
        });
    }

    getNearestBuilding(playerPosition) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.buildings.forEach(building => {
            const distance = playerPosition.distanceTo(building.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = building;
            }
        });
        
        return nearest;
    }
}
