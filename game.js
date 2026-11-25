// ============================================================================
// NetShield (درع الشبكة) - 2D Cyber Defense Action Platformer
// Implements: Scenes, Background images, Object manipulation, Spritesheets,
// Physics, Input, Cameras, Tile sprites, and Audio output.
// ============================================================================

const CANVAS_W = 900;
const CANVAS_H = 540;
const WORLD_W = 2400;
const WORLD_H = 540;
const GROUND_Y = 476;
const GRAVITY = 1250;

// -------------------- Web Audio Sound & Music Engine --------------------
class CyberAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.step = 0;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.11, slideTo = null) {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + dur);
    }
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  jump() {
    this.tone(250, 0.16, 'square', 0.07, 540);
  }

  pulse() {
    this.tone(860, 0.13, 'sawtooth', 0.08, 220);
  }

  collect() {
    this.tone(587.33, 0.09, 'triangle', 0.11);
    setTimeout(() => this.tone(880, 0.14, 'triangle', 0.11), 70);
  }

  taskDone() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.14, 'triangle', 0.12), i * 80);
    });
  }

  hit() {
    this.tone(175, 0.25, 'sawtooth', 0.13, 62);
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.2, 'sine', 0.13), i * 105);
    });
  }

  lose() {
    [330, 277.18, 220, 164.81].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.11), i * 130);
    });
  }

  startBGM() {
    if (this.muted || this.bgmTimer) return;
    this.ensureCtx();
    const bass = [110, 110, 146.83, 130.81, 110, 110, 164.81, 146.83];
    this.bgmTimer = setInterval(() => {
      if (!this.muted) {
        this.tone(bass[this.step % bass.length], 0.2, 'sine', 0.04);
        this.step++;
      }
    }, 320);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// -------------------- Offscreen Spritesheet & Tile Assets --------------------
function buildVisualAssets() {
  const fw = 48;
  const fh = 56;
  const sheet = document.createElement('canvas');
  sheet.width = fw * 4;
  sheet.height = fh;
  const sctx = sheet.getContext('2d');

  for (let frame = 0; frame < 4; frame++) {
    const ox = frame * fw;
    sctx.fillStyle = frame === 3 ? '#38bdf8' : '#0284c7';
    sctx.fillRect(ox + 10, 22, 28, 20);

    sctx.fillStyle = '#e2e8f0';
    sctx.fillRect(ox + 13, 6, 22, 18);

    sctx.fillStyle = '#00f5d4';
    sctx.fillRect(ox + 17, 11, 16, 6);

    sctx.fillStyle = '#1e293b';
    sctx.fillRect(ox + 14, 24, 20, 18);
    sctx.fillStyle = '#38bdf8';
    sctx.fillRect(ox + 20, 28, 8, 8);

    sctx.fillStyle = '#94a3b8';
    if (frame === 0) {
      sctx.fillRect(ox + 15, 42, 6, 12);
      sctx.fillRect(ox + 27, 42, 6, 12);
    } else if (frame === 1) {
      sctx.fillRect(ox + 11, 42, 6, 12);
      sctx.fillRect(ox + 30, 40, 6, 10);
    } else if (frame === 2) {
      sctx.fillRect(ox + 14, 40, 6, 10);
      sctx.fillRect(ox + 28, 42, 6, 12);
    } else {
      sctx.fillRect(ox + 12, 40, 7, 9);
      sctx.fillRect(ox + 29, 39, 7, 9);
    }
  }

  const tile = document.createElement('canvas');
  tile.width = 64;
  tile.height = 64;
  const tctx = tile.getContext('2d');
  tctx.fillStyle = '#0f172a';
  tctx.fillRect(0, 0, 64, 64);
  tctx.fillStyle = '#0ea5e9';
  tctx.fillRect(0, 0, 64, 6);
  tctx.strokeStyle = '#1e3a5f';
  tctx.lineWidth = 2;
  tctx.strokeRect(4, 10, 56, 50);
  tctx.fillStyle = '#38bdf8';
  tctx.fillRect(14, 24, 12, 4);
  tctx.fillRect(38, 40, 12, 4);

  return { sheet, fw, fh, tile };
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// -------------------- Game Engine with Scenes --------------------
class NetShieldEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new CyberAudio();
    this.assets = buildVisualAssets();

    this.scene = 'MENU';
    this.keysDown = {};
    this.justPressed = {};
    this.menuFloorOffset = 0;
    this.animTimer = 0;
    this.animFrame = 0;
    this.lastTime = performance.now();

    this.endData = { won: false, score: 0, phishingFixed: 0, keysCollected: 0 };
    this.resetWorld();
    this.bindEvents();
    this.loop(this.lastTime);
  }

  resetWorld() {
    this.health = 100;
    this.score = 0;
    this.phishingFixed = 0;
    this.keysCollected = 0;
    this.invulnTimer = 0;
    this.shakeTimer = 0;
    this.camX = 0;
    this.bannerMsg = 'Mission Active: Neutralize Phishing Nodes [F] & Collect Encryption Keys!';
    this.bannerColor = '#7dd3fc';

    this.player = {
      x: 90,
      y: GROUND_Y - 54,
      w: 32,
      h: 54,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      pulseCooldown: 0
    };

    this.platforms = [
      { x: 260, y: 380, w: 160, h: 26 },
      { x: 560, y: 290, w: 160, h: 26 },
      { x: 880, y: 370, w: 160, h: 26 },
      { x: 1240, y: 280, w: 160, h: 26 },
      { x: 1580, y: 360, w: 160, h: 26 },
      { x: 1900, y: 270, w: 160, h: 26 }
    ];

    this.crates = [
      { x: 480, y: GROUND_Y - 48, w: 48, h: 48, vx: 0, vy: 0 },
      { x: 1450, y: GROUND_Y - 48, w: 48, h: 48, vx: 0, vy: 0 }
    ];

    this.phishNodes = [
      { x: 618, y: 242, w: 44, h: 48, fixed: false },
      { x: 1638, y: 312, w: 44, h: 48, fixed: false }
    ];

    this.keysItems = [
      { x: 326, y: 334, w: 28, h: 28, collected: false, bobPhase: 0 },
      { x: 1306, y: 234, w: 28, h: 28, collected: false, bobPhase: 1.5 },
      { x: 1966, y: 224, w: 28, h: 28, collected: false, bobPhase: 3.0 }
    ];

    this.firewall = { x: 2260, y: GROUND_Y - 76, w: 54, h: 76 };

    this.viruses = [
      { x: 430, y: GROUND_Y - 38, w: 38, h: 38, minX: 310, maxX: 560, vx: 100, stunTimer: 0 },
      { x: 940, y: 332, w: 38, h: 38, minX: 885, maxX: 995, vx: 75, stunTimer: 0 },
      { x: 1180, y: GROUND_Y - 38, w: 38, h: 38, minX: 1060, maxX: 1390, vx: 125, stunTimer: 0 },
      { x: 1850, y: GROUND_Y - 38, w: 38, h: 38, minX: 1720, maxX: 2100, vx: 135, stunTimer: 0 }
    ];

    this.pulses = [];
  }

  setBanner(msg, color = '#7dd3fc') {
    this.bannerMsg = msg;
    this.bannerColor = color;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }
      if (!this.keysDown[code]) {
        this.justPressed[code] = true;
      }
      this.keysDown[code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown[e.code] = false;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.audio.ensureCtx();

      if (this.scene === 'MENU') {
        if (x >= 325 && x <= 575 && y >= 379 && y <= 431) {
          this.startGame();
        }
      } else if (this.scene === 'PLAY') {
        if (x >= 765 && x <= 888 && y >= 10 && y <= 40) {
          this.audio.toggleMute();
        }
      } else if (this.scene === 'END') {
        if (x >= 335 && x <= 565 && y >= 360 && y <= 410) {
          this.startGame();
        }
      }
    });
  }

  startGame() {
    this.resetWorld();
    this.scene = 'PLAY';
    this.audio.startBGM();
    this.audio.collect();
  }

  firePulse() {
    if (this.player.pulseCooldown > 0) return;
    this.player.pulseCooldown = 0.28;
    this.audio.pulse();
    const px = this.player.facing === 1 ? this.player.x + this.player.w + 4 : this.player.x - 22;
    this.pulses.push({
      x: px,
      y: this.player.y + 22,
      w: 18,
      h: 8,
      vx: this.player.facing * 560,
      life: 0.65
    });
  }

  damagePlayer() {
    if (this.invulnTimer > 0) return;
    this.invulnTimer = 1.0;
    this.shakeTimer = 0.2;
    this.health = Math.max(0, this.health - 25);
    this.audio.hit();
    this.setBanner('WARNING: Malware Breach Detected! (-25% Integrity)', '#f87171');

    if (this.health <= 0) {
      this.audio.stopBGM();
      this.audio.lose();
      this.endData = {
        won: false,
        score: this.score,
        phishingFixed: this.phishingFixed,
        keysCollected: this.keysCollected
      };
      this.scene = 'END';
    }
  }

  update(dt) {
    if (this.justPressed['KeyM']) {
      this.audio.toggleMute();
    }

    if (this.scene === 'MENU') {
      this.menuFloorOffset = (this.menuFloorOffset + 72 * dt) % 64;
      if (this.justPressed['Enter'] || this.justPressed['Space']) {
        this.startGame();
      }
    } else if (this.scene === 'PLAY') {
      this.updatePlay(dt);
    } else if (this.scene === 'END') {
      if (this.justPressed['Enter'] || this.justPressed['KeyR']) {
        this.startGame();
      }
    }

    this.justPressed = {};
  }

  updatePlay(dt) {
    const p = this.player;
    if (p.pulseCooldown > 0) p.pulseCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    const moveLeft = this.keysDown['ArrowLeft'] || this.keysDown['KeyA'];
    const moveRight = this.keysDown['ArrowRight'] || this.keysDown['KeyD'];
    const jumpPressed = this.justPressed['ArrowUp'] || this.justPressed['KeyW'] || this.justPressed['Space'];

    if (moveLeft && !moveRight) {
      p.vx = -240;
      p.facing = -1;
    } else if (moveRight && !moveLeft) {
      p.vx = 240;
      p.facing = 1;
    } else {
      p.vx = 0;
    }

    if (jumpPressed && p.onGround) {
      p.vy = -520;
      p.onGround = false;
      this.audio.jump();
    }

    if (this.justPressed['KeyF']) {
      this.firePulse();
    }

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.x = Math.max(0, Math.min(WORLD_W - p.w, p.x));

    for (const c of this.crates) {
      if (rectsOverlap(p, c)) {
        if (p.vx > 0) {
          c.x = p.x + p.w;
        } else if (p.vx < 0) {
          c.x = p.x - c.w;
        }
        c.x = Math.max(0, Math.min(WORLD_W - c.w, c.x));
      }
      c.vy += GRAVITY * dt;
      c.y += c.vy * dt;
      if (c.y + c.h >= GROUND_Y) {
        c.y = GROUND_Y - c.h;
        c.vy = 0;
      }
      for (const plat of this.platforms) {
        if (c.vy >= 0 && rectsOverlap({ x: c.x, y: c.y + c.h - 10, w: c.w, h: 12 }, plat)) {
          c.y = plat.y - c.h;
          c.vy = 0;
        }
      }
    }

    const prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.onGround = false;

    if (p.y + p.h >= GROUND_Y) {
      p.y = GROUND_Y - p.h;
      p.vy = 0;
      p.onGround = true;
    }

    if (p.vy >= 0) {
      for (const plat of this.platforms) {
        const horizOverlap = p.x + p.w - 4 > plat.x && p.x + 4 < plat.x + plat.w;
        if (horizOverlap && prevBottom <= plat.y + 12 && p.y + p.h >= plat.y) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }

    if (!p.onGround) {
      this.animFrame = 3;
    } else if (Math.abs(p.vx) > 10) {
      this.animTimer += dt;
      if (this.animTimer >= 0.12) {
        this.animTimer = 0;
        this.animFrame = this.animFrame === 1 ? 2 : 1;
      }
    } else {
      this.animFrame = 0;
    }

    const targetCamX = Math.max(0, Math.min(WORLD_W - CANVAS_W, p.x + p.w / 2 - CANVAS_W * 0.35));
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8);

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const b = this.pulses[i];
      b.x += b.vx * dt;
      b.life -= dt;
      let remove = b.life <= 0 || b.x < 0 || b.x > WORLD_W;

      if (!remove) {
        for (const node of this.phishNodes) {
          if (!node.fixed && rectsOverlap(b, node)) {
            node.fixed = true;
            this.phishingFixed += 1;
            this.score += 150;
            remove = true;
            this.audio.taskDone();
            this.setBanner('Phishing Attack Neutralized! (+150 pts)', '#34d399');
            break;
          }
        }
      }

      if (!remove) {
        for (const v of this.viruses) {
          if (rectsOverlap(b, v)) {
            v.stunTimer = 0.8;
            v.vx = (b.vx > 0 ? 1 : -1) * 160;
            remove = true;
            break;
          }
        }
      }

      if (remove) this.pulses.splice(i, 1);
    }

    for (const k of this.keysItems) {
      k.bobPhase += dt * 4;
      if (!k.collected && rectsOverlap(p, k)) {
        k.collected = true;
        this.keysCollected += 1;
        this.score += 100;
        this.audio.collect();
        this.setBanner(`Encryption Key Secured (${this.keysCollected}/3)! (+100 pts)`, '#facc15');
      }
    }

    for (const v of this.viruses) {
      if (v.stunTimer > 0) v.stunTimer -= dt;
      v.x += v.vx * dt;
      if (v.x <= v.minX) {
        v.x = v.minX;
        v.vx = Math.abs(v.vx) || 100;
      } else if (v.x + v.w >= v.maxX) {
        v.x = v.maxX - v.w;
        v.vx = -(Math.abs(v.vx) || 100);
      }

      if (rectsOverlap(p, v)) {
        this.damagePlayer();
      }
    }

    if (rectsOverlap(p, this.firewall)) {
      if (this.phishingFixed >= this.phishNodes.length && this.keysCollected >= this.keysItems.length) {
        this.score += 300;
        this.audio.stopBGM();
        this.audio.win();
        this.endData = {
          won: true,
          score: this.score,
          phishingFixed: this.phishingFixed,
          keysCollected: this.keysCollected
        };
        this.scene = 'END';
      } else {
        this.setBanner('Firewall Locked! Complete Task 1 (Phishing) & Task 2 (Keys) first.', '#fbbf24');
      }
    }
  }

  drawBackground(ctx, scrollX) {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#040814');
    grad.addColorStop(0.55, '#0a192f');
    grad.addColorStop(1, '#0f2942');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(14, 165, 233, 0.14)';
    ctx.lineWidth = 1.5;
    const gridOffset = -(scrollX * 0.25) % 90;
    for (let x = gridOffset; x < CANVAS_W; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 40; y < CANVAS_H; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    const towers = [
      { bx: 120, y: 170, w: 68, h: 310 },
      { bx: 420, y: 125, w: 82, h: 355 },
      { bx: 780, y: 190, w: 72, h: 290 },
      { bx: 1150, y: 140, w: 86, h: 340 },
      { bx: 1520, y: 165, w: 74, h: 315 }
    ];
    towers.forEach((t) => {
      const sx = t.bx - scrollX * 0.4;
      if (sx + t.w < -40 || sx > CANVAS_W + 40) return;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(sx, t.y, t.w, t.h);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      for (let ly = t.y + 16; ly < 455; ly += 24) {
        ctx.fillRect(sx + 12, ly, t.w - 24, 5);
      }
    });
  }

  drawTiledFloor(ctx, offsetX, width, y, height) {
    const tw = 64;
    const startX = -((offsetX % tw) + tw) % tw;
    for (let x = startX; x < width + tw; x += tw) {
      ctx.drawImage(this.assets.tile, x, y, tw, height);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (this.scene === 'MENU') {
      this.drawBackground(ctx, 0);
      this.drawTiledFloor(ctx, this.menuFloorOffset, CANVAS_W, GROUND_Y, 64);

      ctx.fillStyle = 'rgba(9, 19, 38, 0.9)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(110, 42, 680, 412, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 34px Segoe UI, sans-serif';
      ctx.fillText('NETSHIELD // درع الشبكة', 450, 90);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px Segoe UI, sans-serif';
      ctx.fillText('Cybersecurity Defense Action Platformer', 450, 124);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '17px Segoe UI, sans-serif';
      ctx.fillText('YOUR 3 CYBER MISSIONS:', 450, 174);
      ctx.font = '15px Segoe UI, sans-serif';
      ctx.fillText('1. Neutralize 2 Phishing Nodes using Scan Pulse [F]', 450, 206);
      ctx.fillText('2. Collect all 3 Encryption Keys across the network', 450, 234);
      ctx.fillText('3. Reach & Activate the Main Firewall Core to win!', 450, 262);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '13px Segoe UI, sans-serif';
      ctx.fillText('Controls: [A/D or Left/Right] Move | [W/Up/Space] Jump | [F] Pulse | [M] Audio', 450, 326);

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(325, 379, 250, 52, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px Segoe UI, sans-serif';
      ctx.fillText('START DEFENSE', 450, 412);
      return;
    }

    if (this.scene === 'PLAY') {
      let shakeX = 0;
      let shakeY = 0;
      if (this.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * 10;
        shakeY = (Math.random() - 0.5) * 10;
      }

      this.drawBackground(ctx, this.camX);

      ctx.save();
      ctx.translate(-this.camX + shakeX, shakeY);

      this.drawTiledFloor(ctx, 0, WORLD_W, GROUND_Y, 64);

      for (const plat of this.platforms) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(plat.x, plat.y + plat.h - 4, plat.w, 4);
      }

      for (const c of this.crates) {
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 3;
        ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.beginPath();
        ctx.moveTo(c.x + 4, c.y + 4);
        ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4);
        ctx.moveTo(c.x + c.w - 4, c.y + 4);
        ctx.lineTo(c.x + 4, c.y + c.h - 4);
        ctx.stroke();
      }

      for (const node of this.phishNodes) {
        ctx.fillStyle = node.fixed ? '#064e3b' : '#7f1d1d';
        ctx.strokeStyle = node.fixed ? '#34d399' : '#f87171';
        ctx.lineWidth = 3;
        ctx.fillRect(node.x, node.y, node.w, node.h);
        ctx.strokeRect(node.x, node.y, node.w, node.h);

        ctx.fillStyle = node.fixed ? '#6ee7b7' : '#fef08a';
        ctx.font = 'bold 20px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.fixed ? '✓' : '!', node.x + node.w / 2, node.y + 31);
      }

      for (const k of this.keysItems) {
        if (k.collected) continue;
        const bobY = k.y + Math.sin(k.bobPhase) * 5;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(k.x + 10, bobY + 14, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(k.x + 16, bobY + 12, 10, 4);
        ctx.fillRect(k.x + 21, bobY + 16, 3, 4);
      }

      const fw = this.firewall;
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 3;
      ctx.fillRect(fw.x, fw.y, fw.w, fw.h);
      ctx.strokeRect(fw.x, fw.y, fw.w, fw.h);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(fw.x + 27, fw.y + 16);
      ctx.lineTo(fw.x + 40, fw.y + 23);
      ctx.lineTo(fw.x + 40, fw.y + 38);
      ctx.lineTo(fw.x + 27, fw.y + 52);
      ctx.lineTo(fw.x + 14, fw.y + 38);
      ctx.lineTo(fw.x + 14, fw.y + 23);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#93c5fd';
      ctx.font = '12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FIREWALL', fw.x + fw.w / 2, fw.y - 10);

      for (const v of this.viruses) {
        ctx.fillStyle = v.stunTimer > 0 ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(v.x + 11, v.y + 15, 4, 4);
        ctx.fillRect(v.x + 22, v.y + 15, 4, 4);
      }

      for (const b of this.pulses) {
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      const p = this.player;
      const sx = this.animFrame * this.assets.fw;
      ctx.save();
      if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 16) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }
      if (p.facing === -1) {
        ctx.translate(p.x + p.w + 8, p.y - 2);
        ctx.scale(-1, 1);
        ctx.drawImage(this.assets.sheet, sx, 0, this.assets.fw, this.assets.fh, 0, 0, 48, 56);
      } else {
        ctx.drawImage(this.assets.sheet, sx, 0, this.assets.fw, this.assets.fh, p.x - 8, p.y - 2, 48, 56);
      }
      ctx.restore();

      ctx.restore();

      ctx.fillStyle = 'rgba(6, 13, 31, 0.86)';
      ctx.fillRect(0, 0, CANVAS_W, 62);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 62);
      ctx.lineTo(CANVAS_W, 62);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = this.health > 50 ? '#34d399' : this.health > 25 ? '#fbbf24' : '#f87171';
      ctx.font = 'bold 15px Segoe UI, sans-serif';
      ctx.fillText(`SYSTEM INTEGRITY: ${this.health}%`, 18, 22);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '14px Segoe UI, sans-serif';
      ctx.fillText(`SCORE: ${this.score}`, 18, 46);

      const m1 = this.phishingFixed >= this.phishNodes.length ? 'DONE' : `${this.phishingFixed}/${this.phishNodes.length}`;
      const m2 = this.keysCollected >= this.keysItems.length ? 'DONE' : `${this.keysCollected}/${this.keysItems.length}`;
      const m3 =
        this.phishingFixed >= this.phishNodes.length && this.keysCollected >= this.keysItems.length
          ? 'READY -> FIREWALL!'
          : 'LOCKED';

      ctx.fillStyle = '#f8fafc';
      ctx.font = '13px Segoe UI, sans-serif';
      ctx.fillText(`Task 1 (Phishing): [${m1}]   |   Task 2 (Keys): [${m2}]`, 265, 23);
      ctx.fillText(`Task 3 (Main Firewall): [${m3}]`, 265, 45);

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#fbbf24';
      ctx.fillRect(765, 10, 123, 30);
      ctx.strokeRect(765, 10, 123, 30);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.audio.muted ? '[M] AUDIO: OFF' : '[M] AUDIO: ON', 826, 29);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(195, 70, 510, 26);
      ctx.fillStyle = this.bannerColor;
      ctx.font = 'bold 13px Segoe UI, sans-serif';
      ctx.fillText(this.bannerMsg, 450, 87);
      return;
    }

    if (this.scene === 'END') {
      this.drawBackground(ctx, 0);

      ctx.fillStyle = 'rgba(9, 19, 38, 0.92)';
      ctx.strokeStyle = this.endData.won ? '#34d399' : '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(160, 75, 580, 380, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = this.endData.won ? '#34d399' : '#f87171';
      ctx.font = 'bold 34px Segoe UI, sans-serif';
      ctx.fillText(this.endData.won ? 'NETWORK SECURED!' : 'SYSTEM BREACHED!', 450, 132);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '15px Segoe UI, sans-serif';
      ctx.fillText(
        this.endData.won
          ? 'All cyber threats neutralized & Main Firewall activated!'
          : 'Malware overwhelmed system integrity. Try again!',
        450,
        172
      );

      ctx.fillStyle = '#f8fafc';
      ctx.font = '17px Segoe UI, sans-serif';
      ctx.fillText(`Final Score: ${this.endData.score}`, 450, 230);
      ctx.fillText(`Phishing Nodes Neutralized: ${this.endData.phishingFixed} / 2`, 450, 264);
      ctx.fillText(`Encryption Keys Collected: ${this.endData.keysCollected} / 3`, 450, 298);

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(335, 360, 230, 50, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Segoe UI, sans-serif';
      ctx.fillText('PLAY AGAIN', 450, 392);
    }
  }

  loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  container.appendChild(canvas);
  new NetShieldEngine(canvas);
});
