/* ===================== Fin & Hook =====================
 * A fish has to swim around and avoid fishing hooks while
 * chasing a glowing pearl objective that keeps relocating.
 * Reaching it before its timer runs out builds a streak that
 * multiplies your score — so standing still costs you. The
 * game gets progressively harder over time, and the player
 * can grab power-ups (helpful) or accidentally hit
 * power-downs (harmful).
 * ======================================================= */

(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('high-score');
  const levelEl = document.getElementById('level');
  const streakEl = document.getElementById('streak');
  const missesEl = document.getElementById('misses');
  const effectsEl = document.getElementById('active-effects');

  const overlay = document.getElementById('overlay');
  const gameOverScreen = document.getElementById('game-over');
  const pauseScreen = document.getElementById('pause-screen');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const finalScoreEl = document.getElementById('final-score');
  const finalHighScoreEl = document.getElementById('final-high-score');
  const newHighMsg = document.getElementById('new-high-msg');

  /* --------------------- High score storage --------------------- */
  const HIGH_SCORE_KEY = 'finAndHook.highScore';

  function getHighScore() {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const val = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(val) ? val : 0;
  }

  function setHighScore(score) {
    const current = getHighScore();
    if (score > current) {
      localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)));
      return true;
    }
    return false;
  }

  /* --------------------------- Input ------------------------------ */
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'p') togglePause();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // Touch / mouse drag support: fish drifts toward pointer.
  let pointerTarget = null;
  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  }
  canvas.addEventListener('pointerdown', (e) => { pointerTarget = pointerPos(e); });
  canvas.addEventListener('pointermove', (e) => { if (pointerTarget) pointerTarget = pointerPos(e); });
  canvas.addEventListener('pointerup', () => { pointerTarget = null; });
  canvas.addEventListener('pointerleave', () => { pointerTarget = null; });

  /* --------------------------- Utility ----------------------------- */
  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* --------------------------- Fish -------------------------------- */
  class Fish {
    constructor() {
      this.x = W / 2;
      this.y = H / 2;
      this.vx = 0;
      this.vy = 0;
      this.radius = 16;
      this.baseSpeed = 240; // px/sec
      this.facing = 1; // 1 = right, -1 = left
      this.wobble = 0;
    }

    reset() {
      this.x = W / 2;
      this.y = H / 2;
      this.vx = 0;
      this.vy = 0;
    }

    update(dt, effects) {
      let inputX = 0;
      let inputY = 0;

      if (keys.has('arrowleft') || keys.has('a')) inputX -= 1;
      if (keys.has('arrowright') || keys.has('d')) inputX += 1;
      if (keys.has('arrowup') || keys.has('w')) inputY -= 1;
      if (keys.has('arrowdown') || keys.has('s')) inputY += 1;

      if (pointerTarget) {
        const dx = pointerTarget.x - this.x;
        const dy = pointerTarget.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          inputX = dx / d;
          inputY = dy / d;
        }
      }

      if (effects.controlsReversed > 0) {
        inputX *= -1;
        inputY *= -1;
      }

      const len = Math.hypot(inputX, inputY);
      if (len > 0) {
        inputX /= len;
        inputY /= len;
      }

      let speed = this.baseSpeed;
      if (effects.speedBoost > 0) speed *= 1.6;
      if (effects.slowed > 0) speed *= 0.5;

      const targetVx = inputX * speed;
      const targetVy = inputY * speed;

      // smooth acceleration for a "swimmy" feel
      const accel = 10;
      this.vx += (targetVx - this.vx) * Math.min(1, accel * dt);
      this.vy += (targetVy - this.vy) * Math.min(1, accel * dt);

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.x = clamp(this.x, this.radius, W - this.radius);
      this.y = clamp(this.y, this.radius, H - this.radius);

      if (Math.abs(this.vx) > 5) this.facing = this.vx > 0 ? 1 : -1;
      this.wobble += dt * 10;
    }

    draw(ctx, effects, tilt = 0, hooked = false) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.facing, 1);
      ctx.rotate(this.facing * tilt);

      if (effects.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120, 230, 255, ${0.5 + 0.3 * Math.sin(this.wobble * 2)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const tailWag = Math.sin(this.wobble) * (hooked ? 0.8 : 0.35);

      // tail
      ctx.beginPath();
      ctx.moveTo(-this.radius, 0);
      ctx.lineTo(-this.radius - 14, -10 + tailWag * 10);
      ctx.lineTo(-this.radius - 14, 10 + tailWag * 10);
      ctx.closePath();
      ctx.fillStyle = '#ff9d3b';
      ctx.fill();

      // body
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, this.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fillStyle = effects.shield > 0 ? '#8fe8ff' : '#ffb14e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();

      // eye
      ctx.beginPath();
      ctx.arc(this.radius * 0.45, -this.radius * 0.15, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = hooked ? '#3a0d0d' : '#1a1a1a';
      ctx.fill();

      if (hooked) {
        // the hook caught in its mouth, and the line running up off-frame
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.9, 0);
        ctx.lineTo(this.radius * 0.9, -12);
        ctx.arc(this.radius * 0.9, -14, 2.5, Math.PI / 2, Math.PI * 1.6, true);
        ctx.strokeStyle = '#d8d8d8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /* --------------------------- Hooks -------------------------------- */
  class Hook {
    constructor(level) {
      this.reset(level, true);
    }

    reset(level, initial = false) {
      this.anchorX = rand(40, W - 40);
      this.y = initial ? rand(-400, H) : rand(-260, -40);
      this.speed = rand(70, 110) * (1 + level * 0.14);
      this.amplitude = clamp(30 + level * 3, 30, 110);
      this.freq = rand(0.8, 1.6);
      this.phase = rand(0, Math.PI * 2);
      this.radius = 12;
      this.t = 0;
    }

    update(dt, level, slowFactor) {
      this.t += dt;
      this.y += this.speed * slowFactor * dt;
      this.x = this.anchorX + Math.sin(this.t * this.freq + this.phase) * this.amplitude;
      if (this.y - this.radius > H) {
        this.reset(level);
      }
    }

    draw(ctx) {
      // fishing line down from top of screen
      ctx.beginPath();
      ctx.moveTo(this.x, 0);
      ctx.lineTo(this.x, this.y - this.radius);
      ctx.strokeStyle = 'rgba(230,240,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // hook shape
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(0, this.radius * 0.4);
      ctx.arc(0, this.radius * 0.4, this.radius * 0.5, Math.PI, Math.PI * 0.15, true);
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -this.radius, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d8d8d8';
      ctx.fill();
      ctx.restore();
    }

    collides(fish) {
      return dist(this.x, this.y, fish.x, fish.y) < this.radius + fish.radius * 0.8;
    }
  }

  // The boat lurking at the surface, revealed when a hook reels the fish
  // in. Drawn from below the waterline looking up at its hull.
  function drawBoat(ctx, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(W, -30);
    ctx.lineTo(W * 0.82, 34);
    ctx.quadraticCurveTo(W / 2, 58, W * 0.18, 34);
    ctx.closePath();
    const hullGrad = ctx.createLinearGradient(0, -30, 0, 58);
    hullGrad.addColorStop(0, '#4a2f18');
    hullGrad.addColorStop(1, '#2a1a0d');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(W * t, -30);
      ctx.quadraticCurveTo(W / 2, 50 * (1 - Math.abs(t - 0.5) * 1.6), W * t, -30);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ------------------------- Objective ------------------------------- */
  // A relocating waypoint the fish must keep reaching before its ring
  // empties. Reaching it builds a streak (and a score multiplier);
  // letting it expire resets the streak. This is what forces the fish
  // to always be swimming toward something instead of camping safely.
  class Objective {
    constructor(x, y, timeLimit) {
      this.x = x;
      this.y = y;
      this.radius = 13;
      this.timeLimit = timeLimit;
      this.timeLeft = timeLimit;
      this.pulse = rand(0, Math.PI * 2);
    }

    update(dt) {
      this.timeLeft -= dt;
      this.pulse += dt;
    }

    draw(ctx) {
      const frac = clamp(this.timeLeft / this.timeLimit, 0, 1);
      const ringColor = frac > 0.5 ? '#6dffb0' : frac > 0.25 ? '#ffd76d' : '#ff6b6b';
      const bob = Math.sin(this.pulse * 3) * 3;
      const cx = this.x;
      const cy = this.y + bob;

      // outer glow, pulsing with urgency
      const glowR = this.radius * (2.6 + (1 - frac) * 0.8);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, hexToRgba(ringColor, 0.4));
      glow.addColorStop(1, hexToRgba(ringColor, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // background track ring
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // countdown ring
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // pearl core
      const coreGrad = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, this.radius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, '#ffe9b8');
      coreGrad.addColorStop(1, '#f2c66d');
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // rotating sparkle cross
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.pulse * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
      ctx.moveTo(0, -4); ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* -------------------------- Pickups -------------------------------- */
  const PICKUP_TYPES = [
    { key: 'shield', good: true, color: '#6dffb0', label: 'Shield' },
    { key: 'slowmo', good: true, color: '#7bd6ff', label: 'Slow-Mo' },
    { key: 'star', good: true, color: '#ffe066', label: 'Bonus' },
    { key: 'speedy', good: true, color: '#c58bff', label: 'Speed Up' },
    { key: 'reverse', good: false, color: '#ff7b7b', label: 'Reversed!' },
    { key: 'heavy', good: false, color: '#b5651d', label: 'Weighed Down!' },
    { key: 'ink', good: false, color: '#7a4fb5', label: 'Inked!' },
  ];

  // Vector icon for each pickup type, drawn centered at the origin so it
  // can be layered on top of the glowing core disc.
  function drawPickupIcon(ctx, key, age, spin) {
    ctx.save();
    ctx.strokeStyle = '#0b2430';
    ctx.fillStyle = '#0b2430';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (key) {
      case 'shield': {
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6.5, -5);
        ctx.lineTo(6.5, 2);
        ctx.quadraticCurveTo(6.5, 7, 0, 9.5);
        ctx.quadraticCurveTo(-6.5, 7, -6.5, 2);
        ctx.lineTo(-6.5, -5);
        ctx.closePath();
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        break;
      }
      case 'slowmo': {
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();
        const hourAngle = age * 0.6;
        const minAngle = age * 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(hourAngle) * 3.5, Math.sin(hourAngle) * 3.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(minAngle) * 5.5, Math.sin(minAngle) * 5.5);
        ctx.stroke();
        break;
      }
      case 'star': {
        ctx.rotate(spin * 0.4);
        ctx.beginPath();
        const spikes = 5;
        const outer = 8;
        const inner = 3.4;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = (Math.PI / spikes) * i - Math.PI / 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'speedy': {
        ctx.beginPath();
        ctx.moveTo(1.5, -9);
        ctx.lineTo(-4, -0.5);
        ctx.lineTo(-0.5, -0.5);
        ctx.lineTo(-2.5, 9);
        ctx.lineTo(5, -2);
        ctx.lineTo(1, -2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'reverse': {
        ctx.rotate(spin);
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0.4, Math.PI - 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 6, Math.PI + 0.4, Math.PI * 2 - 0.4);
        ctx.stroke();
        const a1 = Math.PI - 0.4;
        const p1x = Math.cos(a1) * 6;
        const p1y = Math.sin(a1) * 6;
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p1x - 3, p1y - 1);
        ctx.lineTo(p1x - 1, p1y + 3);
        ctx.closePath();
        ctx.fill();
        const a2 = Math.PI * 2 - 0.4;
        const p2x = Math.cos(a2) * 6;
        const p2y = Math.sin(a2) * 6;
        ctx.beginPath();
        ctx.moveTo(p2x, p2y);
        ctx.lineTo(p2x + 3, p2y + 1);
        ctx.lineTo(p2x + 1, p2y - 3);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'heavy': {
        ctx.beginPath();
        ctx.arc(0, -6, 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-5, -1);
        ctx.lineTo(5, -1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 3, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;
      }
      case 'ink': {
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.bezierCurveTo(6, -1, 6, 5, 0, 8);
        ctx.bezierCurveTo(-6, 5, -6, -1, 0, -8);
        ctx.closePath();
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
    }
    ctx.restore();
  }

  // Power-ups and power-downs spawn equally often overall (50/50 by
  // category), regardless of how many types are in each — each type's
  // weight is normalized by its category size so the categories balance.
  const GOOD_TYPE_COUNT = PICKUP_TYPES.filter((t) => t.good).length;
  const BAD_TYPE_COUNT = PICKUP_TYPES.length - GOOD_TYPE_COUNT;
  function pickPickupType() {
    const weights = PICKUP_TYPES.map((t) => (t.good ? 1 / GOOD_TYPE_COUNT : 1 / BAD_TYPE_COUNT));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand(0, total);
    for (let i = 0; i < PICKUP_TYPES.length; i++) {
      if (r < weights[i]) return PICKUP_TYPES[i];
      r -= weights[i];
    }
    return PICKUP_TYPES[PICKUP_TYPES.length - 1];
  }

  class Pickup {
    constructor() {
      const type = pickPickupType();
      this.type = type;
      this.radius = 15;
      this.x = rand(this.radius * 2, W - this.radius * 2);
      this.y = rand(this.radius * 2, H - this.radius * 2);
      this.age = 0;
      this.lifespan = rand(7, 11);
      this.bob = rand(0, Math.PI * 2);
      this.spin = rand(0, Math.PI * 2);
      this.spinDir = type.good ? 1 : -1;
      this.collected = false;
    }

    update(dt) {
      this.age += dt;
      this.bob += dt * 3;
      this.spin += dt * this.spinDir * 0.8;
    }

    // Power-ups still fade out on their own after a while. Power-downs
    // never expire on a timer — they linger in the water as a growing
    // hazard until the fish actually grabs a power-up, which sweeps them
    // all away (or the fish blunders into one directly).
    get expired() {
      if (this.collected) return true;
      return this.type.good && this.age > this.lifespan;
    }

    draw(ctx) {
      const fade = this.type.good && this.age > this.lifespan - 2
        ? Math.max(0, (this.lifespan - this.age) / 2)
        : 1;
      const yOff = Math.sin(this.bob) * 4;
      const pulse = 1 + Math.sin(this.bob * 1.3) * 0.08;
      const cx = this.x;
      const cy = this.y + yOff;

      ctx.save();
      ctx.globalAlpha = fade;

      // outer glow
      const glowR = this.radius * 2.4;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, hexToRgba(this.type.color, 0.35));
      glow.addColorStop(1, hexToRgba(this.type.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // rotating dashed ring — spins one way for good, the other for bad
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.spin);
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(this.type.color, 0.7);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // core disc with a soft highlight
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius * pulse, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(cx - 4, cy - 5, 1, cx, cy, this.radius * pulse);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, this.type.color);
      coreGrad.addColorStop(1, hexToRgba(this.type.color, 0.85));
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // themed icon on top
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      drawPickupIcon(ctx, this.type.key, this.age, this.spin);

      ctx.restore();
    }

    collides(fish) {
      return dist(this.x, this.y, fish.x, fish.y) < this.radius + fish.radius * 0.8;
    }
  }

  /* ---------------------------- Game ---------------------------------- */
  // Power-downs last 3x as long as power-ups, so a single mistake really
  // costs you while the helpful effects stay short bursts.
  const EFFECT_DURATIONS = {
    shield: 5,
    slowmo: 6,
    speedBoost: 6,
    controlsReversed: 15,
    slowed: 15,
    ink: 15,
  };

  class Game {
    constructor() {
      this.fish = new Fish();
      this.hooks = [];
      this.pickups = [];
      this.popups = [];
      this.reset();
    }

    reset() {
      this.fish.reset();
      this.hooks = [];
      this.pickups = [];
      this.popups = [];
      this.elapsed = 0;
      this.score = 0;
      this.level = 1;
      this.streak = 0;
      this.combo = 1;
      this.pearlMisses = 0;
      this.pickupTimer = rand(2, 4);
      this.effects = {
        shield: 0,
        slowmo: 0,
        speedBoost: 0,
        controlsReversed: 0,
        slowed: 0,
        ink: 0,
      };
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.dying = false;
      this.deathSeq = null;
      this.deathReason = 'caught';
      for (let i = 0; i < this.targetHookCount(); i++) {
        this.hooks.push(new Hook(this.level));
      }
      this.spawnObjective();
    }

    targetHookCount() {
      return Math.min(3 + this.level, 14);
    }

    spawnObjective() {
      const minDist = 160;
      const pad = 40;
      let x = rand(pad, W - pad);
      let y = rand(pad, H - pad);
      let tries = 0;
      while (dist(x, y, this.fish.x, this.fish.y) < minDist && tries < 20) {
        x = rand(pad, W - pad);
        y = rand(pad, H - pad);
        tries++;
      }
      // Pearls start out forgiving, then ramp up faster and faster —
      // the quadratic term barely matters early but dominates late.
      const lvl = this.level;
      const timeLimit = clamp(7.5 - lvl * 0.25 - lvl * lvl * 0.015, 2.5, 7.5);
      this.objective = new Objective(x, y, timeLimit);
    }

    addPopup(x, y, text, color) {
      this.popups.push({ x, y, text, color, life: 1 });
    }

    start() {
      this.reset();
      this.running = true;
      overlay.classList.add('hidden');
      gameOverScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
    }

    applyPickup(type) {
      switch (type.key) {
        case 'shield':
          this.effects.shield = EFFECT_DURATIONS.shield;
          break;
        case 'slowmo':
          this.effects.slowmo = EFFECT_DURATIONS.slowmo;
          break;
        case 'star':
          this.score += 50;
          break;
        case 'speedy':
          this.effects.speedBoost = EFFECT_DURATIONS.speedBoost;
          break;
        case 'reverse':
          if (this.effects.shield <= 0) this.effects.controlsReversed = EFFECT_DURATIONS.controlsReversed;
          break;
        case 'heavy':
          if (this.effects.shield <= 0) this.effects.slowed = EFFECT_DURATIONS.slowed;
          break;
        case 'ink':
          if (this.effects.shield <= 0) this.effects.ink = EFFECT_DURATIONS.ink;
          break;
      }
    }

    // The fish gets yanked straight up along the culprit hook's line and
    // disappears into the boat lurking at the surface. The rest of the
    // world freezes while this plays out so nothing else can kill the
    // fish mid-animation.
    startDeath(hook) {
      this.dying = true;
      this.deathReason = 'caught';
      this.deathSeq = {
        t: 0,
        riseDuration: 1.0,
        settleDuration: 0.9,
        startX: this.fish.x,
        startY: this.fish.y,
        targetX: hook.anchorX,
        hook,
      };
    }

    updateDeath(dt) {
      const d = this.deathSeq;
      d.t += dt;
      this.fish.wobble += dt * 26;

      if (d.t <= d.riseDuration) {
        const f = d.t / d.riseDuration;
        const ease = f * f * (3 - 2 * f);
        this.fish.x = d.startX + (d.targetX - d.startX) * ease;
        this.fish.y = d.startY + (-34 - d.startY) * ease;
      }

      if (d.t >= d.riseDuration + d.settleDuration) {
        this.finishDeath();
      }
    }

    finishDeath() {
      this.dying = false;
      this.deathSeq = null;
      this.endGame();
    }

    drawDeath(ctx) {
      const d = this.deathSeq;
      const riseFrac = clamp(d.t / d.riseDuration, 0, 1);
      const boatAlpha = clamp((d.t - d.riseDuration * 0.25) / (d.riseDuration * 0.75), 0, 1);

      drawBoat(ctx, boatAlpha);

      if (boatAlpha > 0) {
        ctx.beginPath();
        ctx.moveTo(d.targetX, -30);
        ctx.lineTo(d.targetX, 0);
        ctx.strokeStyle = 'rgba(230,240,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const tilt = -(Math.PI / 2) * riseFrac + Math.sin(d.t * 15) * 0.18 * riseFrac;
      this.fish.draw(ctx, this.effects, tilt, true);

      // splash rings once the fish breaks the surface
      const sinceSplash = d.t - d.riseDuration * 0.85;
      if (sinceSplash > 0) {
        for (let i = 0; i < 3; i++) {
          const rt = sinceSplash - i * 0.12;
          if (rt <= 0) continue;
          const alpha = clamp(1 - rt / 0.6, 0, 1) * 0.6;
          if (alpha <= 0) continue;
          const r = 6 + rt * 90;
          ctx.beginPath();
          ctx.ellipse(d.targetX, 0, r, r * 0.35, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220,240,255,${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    update(dt) {
      if (this.dying) {
        this.updateDeath(dt);
        return;
      }
      if (!this.running || this.paused || this.gameOver) return;

      this.elapsed += dt;
      this.level = 1 + Math.floor(this.elapsed / 15);
      this.score += dt * 10 * (1 + (this.level - 1) * 0.15) * this.combo;

      // tick down timed effects
      for (const key of Object.keys(this.effects)) {
        if (this.effects[key] > 0) this.effects[key] = Math.max(0, this.effects[key] - dt);
      }

      this.fish.update(dt, this.effects);

      const slowFactor = this.effects.slowmo > 0 ? 0.45 : 1;

      // keep hook count matched to current difficulty level
      while (this.hooks.length < this.targetHookCount()) {
        this.hooks.push(new Hook(this.level));
      }

      for (const hook of this.hooks) {
        hook.update(dt, this.level, slowFactor);
        if (this.effects.shield <= 0 && hook.collides(this.fish)) {
          this.startDeath(hook);
          return;
        }
      }

      // chase-the-pearl objective: reaching it in time builds a streak
      // (and a score multiplier); letting it time out resets the streak.
      if (this.objective) {
        this.objective.update(dt);
        if (dist(this.fish.x, this.fish.y, this.objective.x, this.objective.y)
            < this.objective.radius + this.fish.radius * 0.8) {
          const frac = clamp(this.objective.timeLeft / this.objective.timeLimit, 0, 1);
          const reward = 25 + Math.round(35 * frac) + this.streak * 5;
          this.score += reward;
          this.streak += 1;
          this.pearlMisses = 0;
          this.combo = clamp(1 + this.streak * 0.08, 1, 3);
          this.addPopup(this.objective.x, this.objective.y, `+${reward}`, '#ffe9b8');
          this.spawnObjective();
        } else if (this.objective.timeLeft <= 0) {
          this.streak = 0;
          this.combo = 1;
          this.pearlMisses += 1;
          if (this.pearlMisses >= 3) {
            this.deathReason = 'exhausted';
            this.endGame();
            return;
          }
          this.addPopup(this.objective.x, this.objective.y, 'Missed!', '#ff6b6b');
          this.spawnObjective();
        }
      }

      for (const p of this.popups) {
        p.life -= dt * 0.8;
        p.y -= dt * 30;
      }
      this.popups = this.popups.filter((p) => p.life > 0);

      this.pickupTimer -= dt;
      if (this.pickupTimer <= 0) {
        this.pickupTimer = rand(3.5, 6);
        if (this.pickups.length < 5) this.pickups.push(new Pickup());
      }

      for (const pickup of this.pickups) {
        pickup.update(dt);
        if (pickup.collides(this.fish)) {
          this.applyPickup(pickup.type);
          pickup.collected = true;
          if (pickup.type.good) {
            // grabbing a power-up sweeps away any power-downs lurking on screen
            let cleared = false;
            for (const other of this.pickups) {
              if (!other.type.good && !other.collected) {
                other.collected = true;
                cleared = true;
              }
            }
            if (cleared) this.addPopup(this.fish.x, this.fish.y - 24, 'Cleared!', '#6dffb0');
          }
        }
      }
      this.pickups = this.pickups.filter((p) => !p.expired);
    }

    endGame() {
      this.gameOver = true;
      this.running = false;
      const titleEl = gameOverScreen.querySelector('h1');
      if (titleEl) {
        titleEl.textContent = this.deathReason === 'exhausted' ? 'Exhausted!' : 'Caught!';
      }
      const finalScore = Math.floor(this.score);
      const isNewHigh = setHighScore(finalScore);
      finalScoreEl.textContent = finalScore;
      finalHighScoreEl.textContent = getHighScore();
      newHighMsg.classList.toggle('hidden', !isNewHigh);
      gameOverScreen.classList.remove('hidden');
    }

    draw(ctx) {
      ctx.clearRect(0, 0, W, H);

      if (this.objective) this.objective.draw(ctx);
      for (const pickup of this.pickups) pickup.draw(ctx);
      for (const hook of this.hooks) {
        if (this.dying && hook === this.deathSeq.hook) continue;
        hook.draw(ctx);
      }

      if (this.dying) {
        this.drawDeath(ctx);
      } else {
        this.fish.draw(ctx, this.effects);
      }

      for (const p of this.popups) {
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }

      if (this.effects.ink > 0) {
        const gradient = ctx.createRadialGradient(
          this.fish.x, this.fish.y, 40,
          this.fish.x, this.fish.y, 260
        );
        gradient.addColorStop(0, 'rgba(10,5,20,0)');
        gradient.addColorStop(1, 'rgba(10,5,20,0.88)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
      }
    }

    renderHud() {
      scoreEl.textContent = Math.floor(this.score);
      highScoreEl.textContent = getHighScore();
      levelEl.textContent = this.level;
      if (streakEl) streakEl.textContent = `${this.streak} (x${this.combo.toFixed(1)})`;
      if (missesEl) missesEl.textContent = `${this.pearlMisses}/3`;

      effectsEl.innerHTML = '';
      const labels = {
        shield: 'Shield',
        slowmo: 'Slow-Mo',
        speedBoost: 'Speed Boost',
        controlsReversed: 'Reversed',
        slowed: 'Weighed Down',
        ink: 'Inked',
      };
      for (const [key, timeLeft] of Object.entries(this.effects)) {
        if (timeLeft > 0) {
          const badge = document.createElement('div');
          badge.className = 'effect-badge';
          badge.textContent = `${labels[key]} (${timeLeft.toFixed(1)}s)`;
          effectsEl.appendChild(badge);
        }
      }
    }
  }

  function togglePause() {
    if (!game.running && !game.gameOver) return;
    if (game.gameOver) return;
    game.paused = !game.paused;
    pauseScreen.classList.toggle('hidden', !game.paused);
  }

  const game = new Game();
  highScoreEl.textContent = getHighScore();

  startBtn.addEventListener('click', () => game.start());
  restartBtn.addEventListener('click', () => game.start());

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    game.update(dt);
    game.draw(ctx);
    game.renderHud();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

// Register the service worker so the game keeps working offline and can
// be installed as a PWA. Skipped on file:// (no origin to scope to) and
// wrapped in a feature check since this file is also embedded standalone.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // offline-first support is a nice-to-have; the game still works without it
    });
  });
}
