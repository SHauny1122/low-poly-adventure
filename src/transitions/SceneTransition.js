export class SceneTransition {
    constructor() {
        this.isTransitioning = false;
        this.particles = [];
        this.createOverlay();
        this.createLevelText();
        this.createTimeVortex();
    }

    createOverlay() {
        // Create black overlay
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.backgroundColor = 'black';
        this.overlay.style.opacity = '0';
        this.overlay.style.transition = 'opacity 2s';
        this.overlay.style.zIndex = '2000';
        this.overlay.style.pointerEvents = 'none';
        document.body.appendChild(this.overlay);
    }

    createLevelText() {
        // Create level text
        this.levelText = document.createElement('div');
        this.levelText.style.position = 'fixed';
        this.levelText.style.top = '50%';
        this.levelText.style.left = '50%';
        this.levelText.style.transform = 'translate(-50%, -50%)';
        this.levelText.style.color = '#fff';
        this.levelText.style.fontSize = '64px';
        this.levelText.style.fontWeight = 'bold';
        this.levelText.style.opacity = '0';
        this.levelText.style.transition = 'opacity 1s';
        this.levelText.style.zIndex = '2001';
        this.levelText.style.fontFamily = 'Arial, sans-serif';
        this.levelText.style.textShadow = '0 0 20px #44ccff';
        this.levelText.style.pointerEvents = 'none';
        document.body.appendChild(this.levelText);
    }

    createTimeVortex() {
        // Create time vortex canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.opacity = '0';
        this.canvas.style.transition = 'opacity 1s';
        this.canvas.style.zIndex = '2002';
        this.canvas.style.pointerEvents = 'none';
        document.body.appendChild(this.canvas);

        // Set canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.ctx = this.canvas.getContext('2d');
        this.createParticles();

        // Add resize listener after everything is initialized
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.createParticles();
        });
    }

    createParticles() {
        this.particles = [];
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        for (let i = 0; i < 200; i++) {
            this.particles.push({
                x: width / 2,
                y: height / 2,
                angle: Math.random() * Math.PI * 2,
                radius: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 2,
                distance: 0,
                color: Math.random() < 0.5 ? '#44ccff' : '#ffffff'
            });
        }
    }

    updateVortex() {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let p of this.particles) {
            p.distance += p.speed;
            
            const x = this.canvas.width / 2 + Math.cos(p.angle) * p.distance;
            const y = this.canvas.height / 2 + Math.sin(p.angle) * p.distance;
            
            this.ctx.beginPath();
            this.ctx.fillStyle = p.color;
            this.ctx.arc(x, y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Reset particle if it goes off screen
            if (p.distance > Math.max(this.canvas.width, this.canvas.height)) {
                p.distance = 0;
                p.angle = Math.random() * Math.PI * 2;
            }
        }
    }

    async transitionToLevel(levelNumber) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Fade to black
        this.overlay.style.opacity = '1';
        await this.wait(2000);

        // Show level text
        this.levelText.textContent = `Level ${levelNumber}`;
        this.levelText.style.opacity = '1';
        await this.wait(2000);

        // Hide level text and show vortex
        this.levelText.style.opacity = '0';
        this.canvas.style.opacity = '1';
        
        // Start vortex animation
        let startTime = Date.now();
        const animate = () => {
            if (Date.now() - startTime < 3000) {
                this.updateVortex();
                requestAnimationFrame(animate);
            } else {
                // End transition
                this.canvas.style.opacity = '0';
                this.overlay.style.opacity = '0';
                this.isTransitioning = false;
            }
        };
        animate();

        // Wait for vortex animation
        await this.wait(3000);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    dispose() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.levelText && this.levelText.parentNode) {
            this.levelText.parentNode.removeChild(this.levelText);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
