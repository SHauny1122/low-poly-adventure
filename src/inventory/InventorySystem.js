export class InventorySystem {
    constructor() {
        this.gems = {
            green: 0,
            pink: 0
        };
        
        this.createUI();
    }
    
    createUI() {
        // Create container div
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 15px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 16px;
            z-index: 1000;
            display: grid;
            gap: 8px;
            min-width: 120px;
        `;
        
        // Create gem counters
        this.greenGemCounter = document.createElement('div');
        this.greenGemCounter.innerHTML = '💎 Green: 0';
        this.greenGemCounter.style.color = '#00ff00';
        
        this.pinkGemCounter = document.createElement('div');
        this.pinkGemCounter.innerHTML = '💎 Pink: 0';
        this.pinkGemCounter.style.color = '#ff69b4';
        
        // Add counters to container
        container.appendChild(this.greenGemCounter);
        container.appendChild(this.pinkGemCounter);
        
        // Add container to document
        document.body.appendChild(container);
    }
    
    addGems(type, amount) {
        if (this.gems.hasOwnProperty(type)) {
            this.gems[type] += amount;
            this.updateUI();
            console.log(`Added ${amount} ${type} gems. New total: ${this.gems[type]}`);
        }
    }
    
    updateUI() {
        this.greenGemCounter.innerHTML = `💎 Green: ${this.gems.green}`;
        this.pinkGemCounter.innerHTML = `💎 Pink: ${this.gems.pink}`;
    }
    
    getGemCount(type) {
        return this.gems[type] || 0;
    }
    
    getTotalGems() {
        return Object.values(this.gems).reduce((a, b) => a + b, 0);
    }
}
