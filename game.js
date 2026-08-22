/* ===================== Fin & Hook =====================
 * A fish has to swim around and avoid fishing hooks. The
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

    draw(ctx, effects) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.facing, 1);

      if (effects.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120, 230, 255, ${0.5 + 0.3 * Math.sin(this.wobble * 2)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const tailWag = Math.sin(this.wobble) * 0.35;

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
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();

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

  /* -------------------------- Pickups -------------------------------- */
  const PICKUP_TYPES = [
    { key: 'shield', good: true, color: '#6dffb0', symbol: 'S', label: 'Shield' },
    { key: 'slowmo', good: true, color: '#7bd6ff', symbol: 'Z', label: 'Slow-Mo' },
    { key: 'star', good: true, color: '#ffe066', symbol: '+', label: 'Bonus' },
    { key: 'speedy', good: true, color: '#c58bff', symbol: '>', label: 'Speed Up' },
    { key: 'reverse', good: false, color: '#ff7b7b', symbol: 'R', label: 'Reversed!' },
    { key: 'heavy', good: false, color: '#b5651d', symbol: 'A', label: 'Weighed Down!' },
    { key: 'ink', good: false, color: '#7a4fb5', symbol: 'I', label: 'Inked!' },
  ];

  class Pickup {
    constructor() {
      const type = PICKUP_TYPES[Math.floor(rand(0, PICKUP_TYPES.length))];
      this.type = type;
      this.radius = 14;
      this.x = rand(this.radius * 2, W - this.radius * 2);
      this.y = rand(this.radius * 2, H - this.radius * 2);
      this.age = 0;
      this.lifespan = rand(7, 11);
      this.bob = rand(0, Math.PI * 2);
    }

    update(dt) {
      this.age += dt;
      this.bob += dt * 3;
    }

    get expired() {
      return this.age > this.lifespan;
    }

    draw(ctx) {
      const fade = this.age > this.lifespan - 2 ? Math.max(0, (this.lifespan - this.age) / 2) : 1;
      const yOff = Math.sin(this.bob) * 4;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(this.x, this.y + yOff, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.type.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.stroke();
      ctx.fillStyle = '#022';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.type.symbol, this.x, this.y + yOff + 1);
      ctx.restore();
    }

    collides(fish) {
      return dist(this.x, this.y, fish.x, fish.y) < this.radius + fish.radius * 0.8;
    }
  }

  /* ---------------------------- Game ---------------------------------- */
  const EFFECT_DURATIONS = {
    shield: 5,
    slowmo: 6,
    speedBoost: 6,
    controlsReversed: 5,
    slowed: 5,
    ink: 5,
  };

  class Game {
    constructor() {
      this.fish = new Fish();
      this.hooks = [];
      this.pickups = [];
      this.reset();
    }

    reset() {
      this.fish.reset();
      this.hooks = [];
      this.pickups = [];
      this.elapsed = 0;
      this.score = 0;
      this.level = 1;
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
      for (let i = 0; i < this.targetHookCount(); i++) {
        this.hooks.push(new Hook(this.level));
      }
    }

    targetHookCount() {
      return Math.min(3 + this.level, 14);
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

    update(dt) {
      if (!this.running || this.paused || this.gameOver) return;

      this.elapsed += dt;
      this.level = 1 + Math.floor(this.elapsed / 15);
      this.score += dt * 10 * (1 + (this.level - 1) * 0.15);

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
          this.endGame();
          return;
        }
      }

      this.pickupTimer -= dt;
      if (this.pickupTimer <= 0) {
        this.pickupTimer = rand(3.5, 6);
        if (this.pickups.length < 5) this.pickups.push(new Pickup());
      }

      for (const pickup of this.pickups) {
        pickup.update(dt);
        if (pickup.collides(this.fish)) {
          this.applyPickup(pickup.type);
          pickup.age = pickup.lifespan + 1; // mark for removal
        }
      }
      this.pickups = this.pickups.filter((p) => !p.expired);
    }

    endGame() {
      this.gameOver = true;
      this.running = false;
      const finalScore = Math.floor(this.score);
      const isNewHigh = setHighScore(finalScore);
      finalScoreEl.textContent = finalScore;
      finalHighScoreEl.textContent = getHighScore();
      newHighMsg.classList.toggle('hidden', !isNewHigh);
      gameOverScreen.classList.remove('hidden');
    }

    draw(ctx) {
      ctx.clearRect(0, 0, W, H);

      for (const pickup of this.pickups) pickup.draw(ctx);
      for (const hook of this.hooks) hook.draw(ctx);
      this.fish.draw(ctx, this.effects);

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
