import { Barracks } from './Barracks.js';

export class LocationManager {
    constructor(scene, minimapScene) {
        this.scene = scene;
        this.minimapScene = minimapScene;
        this.locations = new Map();
        this.initializeLocations();
    }

    initializeLocations() {
        // Add barracks as our first location
        const barracks = new Barracks(this.scene, this.minimapScene);
        this.locations.set('barracks', barracks);
    }

    update(playerPosition) {
        // Check for nearby locations
        this.locations.forEach((location, name) => {
            if (location.isPlayerNear(playerPosition)) {
                // We can add UI notifications or triggers here later
                console.log(`Player is near ${name}`);
            }
        });
    }
}
