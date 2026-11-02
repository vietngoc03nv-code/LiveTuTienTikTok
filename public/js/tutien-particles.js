// ============================================================================
// HỆ THỐNG HIỆU ỨNG LINH KHÍ & LÔI ĐÌNH (PARTICLES & VISUAL FX)
// ============================================================================

class TuTienParticleEngine {
  constructor() {
    this.bgCanvas = document.getElementById('particlesCanvas');
    this.fxCanvas = document.getElementById('effectsCanvas');

    if (!this.bgCanvas || !this.fxCanvas) {
      console.warn('[ParticleEngine] Không tìm thấy canvas');
      return;
    }

    this.bgCtx = this.bgCanvas.getContext('2d');
    this.fxCtx = this.fxCanvas.getContext('2d');

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.particles = [];
    this.maxParticles = 65;
    this.fxElements = []; // swords, lightnings, bursts

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initBackgroundParticles();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const parent = this.bgCanvas.parentElement;
    this.width = parent ? parent.clientWidth : window.innerWidth;
    this.height = parent ? parent.clientHeight : window.innerHeight;

    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    this.fxCanvas.width = this.width;
    this.fxCanvas.height = this.height;
  }

  initBackgroundParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2.5 + 0.8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.8 - 0.2, // Bay lên trời như tiên khí
        alpha: Math.random() * 0.7 + 0.2,
        color: Math.random() > 0.4 ? '#f6c85f' : (Math.random() > 0.5 ? '#38ef7d' : '#00d2ff')
      });
    }
  }

  // Tạo vụ nổ linh khí (Breakthrough hoặc Thả Tim nhiều)
  burstQi(x, y, count = 25, color = '#f6c85f') {
    const targetX = x !== undefined ? x : this.width / 2;
    const targetY = y !== undefined ? y : this.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.fxElements.push({
        type: 'spark',
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        color
      });
    }
  }

  // Tạo tia sét Lôi Kiếp giáng xuống
  triggerLightning(x) {
    const startX = x !== undefined ? x : this.width / 2 + (Math.random() - 0.5) * 60;
    const segments = [];
    let curX = startX;
    let curY = 0;
    const targetY = this.height * 0.52;

    while (curY < targetY) {
      const nextY = curY + Math.random() * 35 + 15;
      const nextX = curX + (Math.random() - 0.5) * 55;
      segments.push({ x1: curX, y1: curY, x2: nextX, y2: Math.min(targetY, nextY) });
      curX = nextX;
      curY = nextY;
    }

    this.fxElements.push({
      type: 'lightning',
      segments,
      alpha: 1.0,
      width: 4.5,
      color: '#e0f2fe'
    });

    // Rung giật màn hình
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
      wrapper.style.transform = 'translate(' + ((Math.random() - 0.5) * 8) + 'px, ' + ((Math.random() - 0.5) * 8) + 'px)';
      setTimeout(() => {
        wrapper.style.transform = 'none';
      }, 150);
    }
  }

  // Tạo vệt kiếm khí trảm Boss
  triggerSwordSlash() {
    const startX = this.width * 0.2 + Math.random() * (this.width * 0.6);
    const startY = this.height * 0.35;
    const endX = this.width * 0.5 + (Math.random() - 0.5) * 80;
    const endY = this.height * 0.15; // Boss bar location

    this.fxElements.push({
      type: 'slash',
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      alpha: 1.0,
      width: 5,
      color: '#ff4757'
    });

    this.burstQi(endX, endY, 15, '#ff6b81');
  }

  // Chữ số sát thương hoặc Exp bay lên
  showFloatingText(text, x, y, color = '#f6c85f') {
    const container = document.querySelector('.canvas-wrapper') || document.body;
    const span = document.createElement('div');
    span.className = 'floating-text';
    span.textContent = text;
    span.style.color = color;
    span.style.left = (x !== undefined ? x : (this.width / 2 + (Math.random() - 0.5) * 120)) + 'px';
    span.style.top = (y !== undefined ? y : (this.height * 0.45 + (Math.random() - 0.5) * 60)) + 'px';
    container.appendChild(span);

    setTimeout(() => {
      span.remove();
    }, 1400);
  }

  animate() {
    // 1. Vẽ nền Linh Khí
    this.bgCtx.clearRect(0, 0, this.width, this.height);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < 0) {
        p.y = this.height;
        p.x = Math.random() * this.width;
      }
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;

      this.bgCtx.beginPath();
      this.bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.bgCtx.fillStyle = p.color;
      this.bgCtx.globalAlpha = p.alpha;
      this.bgCtx.shadowBlur = 10;
      this.bgCtx.shadowColor = p.color;
      this.bgCtx.fill();
    }
    this.bgCtx.globalAlpha = 1.0;
    this.bgCtx.shadowBlur = 0;

    // 2. Vẽ hiệu ứng tức thời (Sét, Kiếm Khí, Hạt văng)
    this.fxCtx.clearRect(0, 0, this.width, this.height);
    for (let i = this.fxElements.length - 1; i >= 0; i--) {
      const el = this.fxElements[i];

      if (el.type === 'spark') {
        el.x += el.vx;
        el.y += el.vy;
        el.alpha -= el.decay;

        if (el.alpha <= 0) {
          this.fxElements.splice(i, 1);
          continue;
        }

        this.fxCtx.beginPath();
        this.fxCtx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
        this.fxCtx.fillStyle = el.color;
        this.fxCtx.globalAlpha = Math.max(0, el.alpha);
        this.fxCtx.shadowBlur = 8;
        this.fxCtx.shadowColor = el.color;
        this.fxCtx.fill();
      } else if (el.type === 'lightning') {
        el.alpha -= 0.08;
        if (el.alpha <= 0) {
          this.fxElements.splice(i, 1);
          continue;
        }

        this.fxCtx.lineWidth = el.width;
        this.fxCtx.strokeStyle = el.color;
        this.fxCtx.globalAlpha = Math.max(0, el.alpha);
        this.fxCtx.shadowBlur = 20;
        this.fxCtx.shadowColor = '#60a5fa';

        this.fxCtx.beginPath();
        for (const seg of el.segments) {
          this.fxCtx.moveTo(seg.x1, seg.y1);
          this.fxCtx.lineTo(seg.x2, seg.y2);
        }
        this.fxCtx.stroke();
      } else if (el.type === 'slash') {
        el.alpha -= 0.12;
        if (el.alpha <= 0) {
          this.fxElements.splice(i, 1);
          continue;
        }

        this.fxCtx.lineWidth = el.width;
        this.fxCtx.strokeStyle = el.color;
        this.fxCtx.globalAlpha = Math.max(0, el.alpha);
        this.fxCtx.shadowBlur = 25;
        this.fxCtx.shadowColor = '#ff4757';

        this.fxCtx.beginPath();
        this.fxCtx.moveTo(el.x1, el.y1);
        this.fxCtx.lineTo(el.x2, el.y2);
        this.fxCtx.stroke();
      }
    }
    this.fxCtx.globalAlpha = 1.0;
    this.fxCtx.shadowBlur = 0;

    requestAnimationFrame(this.animate);
  }
}

window.TuTienParticleEngine = TuTienParticleEngine;
