// Sample usage:
// import { FireworkShow } from './fireworks.js';
// const fw = new FireworkShow();
// fw.init();

// Firework class
class Firework {
  constructor(x, y, targetX, targetY, color) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.color = color;
    this.speed = 10;
    this.angle = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.distanceToTarget = Math.sqrt((targetX - x) ** 2 + (targetY - y) ** 2);
    this.distanceTraveled = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.distanceTraveled += this.speed;

    return this.distanceTraveled < this.distanceToTarget;
  }

  draw(ctx) {
    // ctx : CanvasRenderingContext2D
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  explode(particles) {
    const particleCount = 25 + Math.random() * 15;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(this.targetX, this.targetY, this.color));
    }
  }
}

// Particle class
// Represents individual particles created when a firework explodes
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.opacity = 1;
    this.decay = Math.random() * 0.02 + 0.01;
    this.speed = Math.random() * 6 + 2;
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.gravity = 0.15;
    this.friction = 0.98;
    this.size = Math.random() * 2 + 1;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    this.opacity -= this.decay;

    return this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.shadowBlur = 5;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class FireworkShow {
  COLORS = [
    "#FF1744",
    "#FF9800",
    "#FFEB3B",
    "#4CAF50",
    "#00BCD4",
    "#2196F3",
    "#9C27B0",
    "#E91E63",
    "#FF5722",
    "#8BC34A",
  ];

  init() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext("2d");

    this.setupCanvasDimensions(canvas);
    this.startFireworksAnimation(ctx, canvas);
    this.handleWindowResize(canvas);
  }

  createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = "fireworks-canvas";
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      pointer-events: none;
      background: transparent;
    `;

    document.body.appendChild(canvas);
    return canvas;
  }

  setupCanvasDimensions(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  startFireworksAnimation(ctx, canvas) {
    const fireworks = [];
    const particles = [];
    const duration = 8000; // 8 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > duration) {
        this.fadeOutCanvas(canvas, elapsed - duration);
        if (elapsed > duration + 1500) {
          document.body.removeChild(canvas);
          return;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Launch new fireworks
      if (Math.random() < 0.12 && elapsed < duration - 1500) {
        const firework = this.createFirework(canvas);
        fireworks.push(firework);
      }

      // Update and draw fireworks
      this.updateFireworks(fireworks, particles, ctx);
      this.updateParticles(particles, ctx);

      requestAnimationFrame(animate);
    };

    animate();
  }

  createFirework(canvas) {
    const startX = Math.random() * canvas.width;
    const startY = canvas.height;
    const targetX = Math.random() * canvas.width;
    const targetY = Math.random() * canvas.height * 0.5;
    const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];

    return new Firework(startX, startY, targetX, targetY, color);
  }

  updateFireworks(fireworks, particles, ctx) {
    for (let i = fireworks.length - 1; i >= 0; i--) {
      if (!fireworks[i].update()) {
        fireworks[i].explode(particles);
        fireworks.splice(i, 1);
      } else {
        fireworks[i].draw(ctx);
      }
    }
  }

  updateParticles(particles, ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update()) {
        particles.splice(i, 1);
      } else {
        particles[i].draw(ctx);
      }
    }
  }

  fadeOutCanvas(canvas, fadeTime) {
    canvas.style.opacity = Math.max(0, 1 - fadeTime / 1500);
  }

  handleWindowResize(canvas) {
    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
}



export { FireworkShow };