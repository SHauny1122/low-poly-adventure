import { Enemy } from './Enemy.js';

export class EnemyManager {
    constructor(scene, buildings) {
        this.scene = scene;
        this.enemies = [];
        this.buildings = buildings;  // Store reference to buildings
    }

    createEnemy(position) {
        // Check if position is safe before spawning
        if (this.buildings && !this.buildings.isPositionSafeForSpawning(position)) {
            console.log('Cannot spawn enemy - too close to buildings');
            return null;
        }
        
        console.log('Spawning enemy at:', Math.round(position.x), Math.round(position.z));
        const enemy = new Enemy(this.scene, position);
        this.enemies.push(enemy);
        return enemy;
    }

    update(playerPosition, delta) {
        this.enemies.forEach(enemy => {
            enemy.update(playerPosition, delta);
        });
    }

    checkCollisions(point) {
        return this.enemies.some(enemy => enemy.checkCollision(point));
    }

    handlePlayerAttack(playerPosition, attackRange = 3) {
        let hitEnemy = false;
        this.enemies.forEach(enemy => {
            const distance = enemy.position.distanceTo(playerPosition);
            if (distance <= attackRange) {
                enemy.takeDamage();
                hitEnemy = true;
                console.log('Hit enemy! Distance:', distance);
            }
        });
        return hitEnemy;
    }

    dispose() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
    }
}
