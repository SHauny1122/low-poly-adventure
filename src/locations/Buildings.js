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
                
                // Add building to global obstacles array for collision detection
                if (window.obstacles) {
                    // Add multiple collision points for better coverage
                    const buildingSize = 15 * config.scale; // Base size * scale
                    const collisionPoints = [
                        { x: 0, z: 0 },    // Center
                        { x: 1, z: 1 },    // Front right
                        { x: -1, z: 1 },   // Front left
                        { x: 1, z: -1 },   // Back right
                        { x: -1, z: -1 }   // Back left
                    ];
                    
                    collisionPoints.forEach(point => {
                        window.obstacles.push({
                            position: new THREE.Vector3(
                                config.position.x + point.x * buildingSize,
                                config.position.y,
                                config.position.z + point.z * buildingSize
                            ),
                            radius: buildingSize * 0.7 // Slightly smaller than full size for better feel
                        });
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
