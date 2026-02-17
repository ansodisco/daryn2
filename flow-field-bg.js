(function () {
    const body = document.body;
    const config = {
        color: body.dataset.ffColor || "#6366f1",
        trailOpacity: parseFloat(body.dataset.ffTrail) || 0.15,
        particleCount: parseInt(body.dataset.ffCount) || 600,
        speed: parseFloat(body.dataset.ffSpeed) || 1,
        bg: body.dataset.ffBg || "#faf8f3" // Default cream background
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Style canvas to be fixed background
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-100'; // Behind everything
    canvas.style.pointerEvents = 'none'; // Don't block clicks
    canvas.style.background = config.bg; // Base background color

    document.body.prepend(canvas);

    // --- LOGIC ---
    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles = [];
    let mouse = { x: -1000, y: -1000 };

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(init = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = 0;
            this.vy = 0;
            this.age = 0;
            this.life = Math.random() * 200 + 100;
        }

        update() {
            // Flow field
            const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

            this.vx += Math.cos(angle) * 0.2 * config.speed;
            this.vy += Math.sin(angle) * 0.2 * config.speed;

            // Mouse interaction
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const interactionRadius = 150;

            if (distance < interactionRadius) {
                const force = (interactionRadius - distance) / interactionRadius;
                this.vx -= dx * force * 0.05;
                this.vy -= dy * force * 0.05;
            }

            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.95;
            this.vy *= 0.95;

            this.age++;
            if (this.age > this.life) {
                this.reset();
            }

            // Wrap
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw(ctx) {
            ctx.fillStyle = config.color;
            const alpha = 1 - Math.abs((this.age / this.life) - 0.5) * 2;
            ctx.globalAlpha = alpha;
            ctx.fillRect(this.x, this.y, 1.5, 1.5);
        }
    }

    function init() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        particles = [];
        for (let i = 0; i < config.particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        // Fade effect
        // Use background color with opacity for trails
        // If bg is hex, we need to convert to rgba properly or just overlay
        // Simplified: Use the computed body background or config.bg

        // Actually, to get trails on a colored background, we need to draw the background color
        // with the trail opacity (which is usually alpha < 1).
        // e.g. ctx.fillStyle = `rgba(250, 248, 243, ${config.trailOpacity})`;

        ctx.globalAlpha = config.trailOpacity;
        ctx.fillStyle = config.bg;
        ctx.fillRect(0, 0, width, height);

        // Reset alpha for particles
        ctx.globalAlpha = 1;

        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        requestAnimationFrame(animate);
    }

    // Events
    window.addEventListener('resize', init);
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    // Start
    init();
    animate();

    console.log("Flow Field Background Initialized");
})();
