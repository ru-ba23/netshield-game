// ============================================================================
// NetShield (درع الشبكة) - 2D Cyber Defense Action Platformer (Phaser 3)
// Implements: Scenes, Background images, Object manipulation, Spritesheets,
// Physics, Input, Cameras, Tile sprites, and Audio output.
// ============================================================================

// -------------------- Web Audio Synthesizer (Zero External Audio Needed) --------------------
class CyberAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.stepIndex = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
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

  playTone(freq, duration, type = 'sine', volume = 0.12, slideTo = null) {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playJump() {
    this.playTone(260, 0.18, 'square', 0.08, 560);
  }

  playPulse() {
    this.playTone(880, 0.14, 'sawtooth', 0.09, 240);
  }

  playCollect() {
    this.playTone(587.33, 0.1, 'triangle', 0.12);
    setTimeout(() => this.playTone(880, 0.16, 'triangle', 0.12), 75);
  }

  playTaskComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.16, 'triangle', 0.13), i * 85);
    });
  }

  playHit() {
    this.playTone(170, 0.28, 'sawtooth', 0.15, 65);
  }

  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.22, 'sine', 0.14), i * 110);
    });
  }

  playLose() {
    const notes = [330, 277.18, 220, 164.81];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.25, 'sawtooth', 0.12), i * 140);
    });
  }

  startBGM() {
    if (this.muted || this.bgmTimer) return;
    this.init();
    const bassLine = [110, 110, 146.83, 130.81, 110, 110, 164.81, 146.83];
    this.bgmTimer = setInterval(() => {
      if (this.muted) return;
      const freq = bassLine[this.stepIndex % bassLine.length];
      this.playTone(freq, 0.22, 'sine', 0.045);
      this.stepIndex++;
    }, 320);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

const cyberAudio = new CyberAudio();

// -------------------- Procedural Texture & Spritesheet Generator --------------------
function generateGameTextures(scene) {
  // 1. Background Image Texture (Cyber Circuit Grid Sky)
  if (!scene.textures.exists('cyber_bg')) {
    const bgCanvas = scene.textures.createCanvas('cyber_bg', 900, 540);
    const ctx = bgCanvas.getContext();

    const grad = ctx.createLinearGradient(0, 0, 0, 540);
    grad.addColorStop(0, '#040814');
    grad.addColorStop(0.55, '#0a192f');
    grad.addColorStop(1, '#0f2942');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 540);

    // Circuit lines & nodes
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.16)';
    ctx.lineWidth = 2;
    for (let x = 40; x < 900; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 540);
      ctx.stroke();
    }
    for (let y = 40; y < 540; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(900, y);
      ctx.stroke();
    }

    // Glowing server towers in background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    const towers = [
      { x: 70, y: 180, w: 65, h: 360 },
      { x: 240, y: 130, w: 80, h: 410 },
      { x: 470, y: 200, w: 70, h: 340 },
      { x: 690, y: 140, w: 85, h: 400 }
    ];
    towers.forEach((t) => {
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      for (let ly = t.y + 18; ly < 500; ly += 26) {
        ctx.fillRect(t.x + 12, ly, t.w - 24, 5);
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    });

    bgCanvas.refresh();
  }

  // 2. TileSprite Texture (Repeating Cyber Floor Tile 64x64)
  if (!scene.textures.exists('floor_tile')) {
    const tileCanvas = scene.textures.createCanvas('floor_tile', 64, 64);
    const ctx = tileCanvas.getContext();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 64, 64);

    // Top neon border
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, 64, 6);

    // Circuit pattern inside tile
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 10, 56, 50);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(14, 24, 12, 4);
    ctx.fillRect(38, 40, 12, 4);
    tileCanvas.refresh();
  }

  // 3. Elevated Platform Texture (160x26)
  if (!scene.textures.exists('platform_tex')) {
    const pCanvas = scene.textures.createCanvas('platform_tex', 160, 26);
    const ctx = pCanvas.getContext();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 160, 26);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(0, 0, 160, 4);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 22, 160, 4);
    pCanvas.refresh();
  }

  // 4. Spritesheet for Player Character ("Cyber Guardian") - 4 frames (48x56 each)
  // Frame 0: Idle, Frame 1: Run A, Frame 2: Run B, Frame 3: Jump/Pulse
  if (!scene.textures.exists('guardian_sheet')) {
    const fw = 48;
    const fh = 56;
    const sheetCanvas = scene.textures.createCanvas('guardian_sheet', fw * 4, fh);
    const ctx = sheetCanvas.getContext();

    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * fw;

      // Cape / Aura
      ctx.fillStyle = frame === 3 ? '#38bdf8' : '#0284c7';
      ctx.fillRect(ox + 10, 22, 28, 20);

      // Head / Visor Helmet
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(ox + 13, 6, 22, 18);

      // Neon Cyber Visor
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(ox + 17, 11, 16, 6);

      // Chest Armor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ox + 14, 24, 20, 18);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(ox + 20, 28, 8, 8);

      // Legs (Animated across frames)
      ctx.fillStyle = '#94a3b8';
      if (frame === 0) {
        ctx.fillRect(ox + 15, 42, 6, 12);
        ctx.fillRect(ox + 27, 42, 6, 12);
      } else if (frame === 1) {
        ctx.fillRect(ox + 11, 42, 6, 12);
        ctx.fillRect(ox + 30, 40, 6, 10);
      } else if (frame === 2) {
        ctx.fillRect(ox + 14, 40, 6, 10);
        ctx.fillRect(ox + 28, 42, 6, 12);
      } else {
        // Jump pose
        ctx.fillRect(ox + 12, 40, 7, 9);
        ctx.fillRect(ox + 29, 39, 7, 9);
      }
    }
    sheetCanvas.refresh();

    // Register frames on the canvas texture so Phaser anims work natively
    const tex = scene.textures.get('guardian_sheet');
    for (let i = 0; i < 4; i++) {
      tex.add(i, 0, i * fw, 0, fw, fh);
    }
  }

  // 5. Spritesheet for Malware Virus Enemy - 2 frames (40x40 each)
  if (!scene.textures.exists('virus_sheet')) {
    const fw = 40;
    const fh = 40;
    const vCanvas = scene.textures.createCanvas('virus_sheet', fw * 2, fh);
    const ctx = vCanvas.getContext();

    for (let frame = 0; frame < 2; frame++) {
      const ox = frame * fw;
      const pulse = frame === 0 ? 0 : 2;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ox + 20, 20, 12 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Spikes
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 3;
      const spikeLen = frame === 0 ? 17 : 19;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(ox + 20, 20);
        ctx.lineTo(ox + 20 + Math.cos(a) * spikeLen, 20 + Math.sin(a) * spikeLen);
        ctx.stroke();
      }

      // Angry Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(ox + 14, 16, 4, 4);
      ctx.fillRect(ox + 22, 16, 4, 4);
    }
    vCanvas.refresh();

    const tex = scene.textures.get('virus_sheet');
    tex.add(0, 0, 0, 0, fw, fh);
    tex.add(1, 0, fw, 0, fw, fh);
  }

  // 6. Encryption Key Texture (28x28)
  if (!scene.textures.exists('key_tex')) {
    const kCanvas = scene.textures.createCanvas('key_tex', 28, 28);
    const ctx = kCanvas.getContext();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(10, 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(10, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 12, 10, 4);
    ctx.fillRect(21, 16, 3, 4);
    ctx.fillRect(25, 16, 3, 4);
    kCanvas.refresh();
  }

  // 7. Phishing Terminal Node Texture (44x48)
  if (!scene.textures.exists('phish_node')) {
    const pCanvas = scene.textures.createCanvas('phish_node', 44, 48);
    const ctx = pCanvas.getContext();
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(4, 4, 36, 40);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 36, 40);

    // Warning exclamation mark
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(20, 11, 4, 16);
    ctx.fillRect(20, 31, 4, 4);
    pCanvas.refresh();
  }

  // 8. Secured Terminal Node Texture (44x48)
  if (!scene.textures.exists('safe_node')) {
    const sCanvas = scene.textures.createCanvas('safe_node', 44, 48);
    const ctx = sCanvas.getContext();
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(4, 4, 36, 40);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 36, 40);

    // Checkmark
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(13, 24);
    ctx.lineTo(19, 31);
    ctx.lineTo(31, 16);
    ctx.stroke();
    sCanvas.refresh();
  }

  // 9. Firewall Gate & Main Core (54x76)
  if (!scene.textures.exists('firewall_core')) {
    const fCanvas = scene.textures.createCanvas('firewall_core', 54, 76);
    const ctx = fCanvas.getContext();
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(4, 4, 46, 68);
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 46, 68);

    // Shield emblem
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(27, 16);
    ctx.lineTo(40, 23);
    ctx.lineTo(40, 38);
    ctx.lineTo(27, 52);
    ctx.lineTo(14, 38);
    ctx.lineTo(14, 23);
    ctx.closePath();
    ctx.fill();
    fCanvas.refresh();
  }

  // 10. Movable Security Block (Object Manipulation - 48x48)
  if (!scene.textures.exists('data_crate')) {
    const cCanvas = scene.textures.createCanvas('data_crate', 48, 48);
    const ctx = cCanvas.getContext();
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 44, 44);
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(46, 46);
    ctx.moveTo(46, 2);
    ctx.lineTo(2, 46);
    ctx.stroke();
    cCanvas.refresh();
  }

  // 11. Scan Pulse Projectile (18x8)
  if (!scene.textures.exists('pulse_beam')) {
    const bCanvas = scene.textures.createCanvas('pulse_beam', 18, 8);
    const ctx = bCanvas.getContext();
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(0, 0, 18, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 2, 10, 4);
    bCanvas.refresh();
  }
}

// ============================================================================
// SCENE 1: MainMenuScene (Title, Mission Brief, Controls, Start Button)
// ============================================================================
class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    generateGameTextures(this);

    // Background image
    this.add.image(450, 270, 'cyber_bg');

    // Decorative animated floor tile at bottom
    this.menuFloor = this.add.tileSprite(450, 512, 900, 56, 'floor_tile');

    // Title Panel
    const panel = this.add.graphics();
    panel.fillStyle(0x091326, 0.88);
    panel.lineStyle(2, 0x38bdf8, 1);
    panel.fillRoundedRect(110, 45, 680, 415, 16);
    panel.strokeRoundedRect(110, 45, 680, 415, 16);

    this.add.text(450, 92, 'NETSHIELD // درع الشبكة', {
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    this.add.text(450, 132, 'Cybersecurity Defense Action Platformer', {
      fontSize: '16px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // 3 Missions Summary
    const missionBox = this.add.text(
      450,
      235,
      [
        'YOUR 3 CYBER MISSIONS:',
        '1. Neutralize 2 Phishing Nodes using your Scan Pulse [F]',
        '2. Collect all 3 Encryption Keys across the network',
        '3. Reach & Activate the Main Firewall Core to win!'
      ].join('
'),
      {
        fontSize: '17px',
        color: '#e2e8f0',
        align: 'center',
        lineSpacing: 8
      }
    ).setOrigin(0.5);

    // Controls Info
    this.add.text(
      450,
      332,
      'Controls:  [Left / Right] or [A / D] Move   |   [Up / W / Space] Jump   |   [F] Scan Pulse   |   [M] Mute Audio',
      {
        fontSize: '13px',
        color: '#38bdf8'
      }
    ).setOrigin(0.5);

    // Start Game Button
    const startBtn = this.add.rectangle(450, 405, 250, 52, 0x0284c7)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x7dd3fc);

    const startText = this.add.text(450, 405, 'START DEFENSE', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    startBtn.on('pointerover', () => startBtn.setFillStyle(0x0ea5e9));
    startBtn.on('pointerout', () => startBtn.setFillStyle(0x0284c7));
    startBtn.on('pointerdown', () => {
      cyberAudio.init();
      cyberAudio.startBGM();
      cyberAudio.playCollect();
      this.scene.start('GameScene');
    });

    // Also allow pressing ENTER to start
    this.input.keyboard.once('keydown-ENTER', () => {
      cyberAudio.init();
      cyberAudio.startBGM();
      cyberAudio.playCollect();
      this.scene.start('GameScene');
    });
  }

  update() {
    this.menuFloor.tilePositionX += 1.2;
  }
}

// ============================================================================
// SCENE 2: GameScene (Core Gameplay, Physics, Camera, 3 Missions, Audio)
// ============================================================================
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const WORLD_WIDTH = 2400;
    const WORLD_HEIGHT = 540;

    // Game State
    this.health = 100;
    this.score = 0;
    this.phishingFixed = 0;
    this.totalPhishing = 2;
    this.keysCollected = 0;
    this.totalKeys = 3;
    this.invulnerable = false;
    this.facing = 1; // 1 = right, -1 = left

    // World Bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 1. Background Image (Fixed to camera for parallax feel)
    this.bgImage = this.add.image(450, 270, 'cyber_bg').setScrollFactor(0);

    // 2. TileSprite Ground across the 2400px level
    this.groundTile = this.add.tileSprite(WORLD_WIDTH / 2, 508, WORLD_WIDTH, 64, 'floor_tile');
    this.physics.add.existing(this.groundTile, true); // Static physics body

    // 3. Elevated Platforms
    this.platforms = this.physics.add.staticGroup();
    const platformCoords = [
      { x: 340, y: 380 },
      { x: 640, y: 290 },
      { x: 960, y: 370 },
      { x: 1320, y: 280 },
      { x: 1660, y: 360 },
      { x: 1980, y: 270 }
    ];
    platformCoords.forEach((p) => {
      this.platforms.create(p.x, p.y, 'platform_tex');
    });

    // 4. Object Manipulation: Movable Data Crates (Player can push them!)
    this.crates = this.physics.add.group({
      bounceX: 0,
      bounceY: 0.1,
      dragX: 500
    });
    const crate1 = this.crates.create(500, 430, 'data_crate');
    crate1.setCollideWorldBounds(true);
    const crate2 = this.crates.create(1480, 430, 'data_crate');
    crate2.setCollideWorldBounds(true);

    // 5. Animations from Spritesheets
    if (!this.anims.exists('guardian_idle')) {
      this.anims.create({
        key: 'guardian_idle',
        frames: [{ key: 'guardian_sheet', frame: 0 }],
        frameRate: 4
      });
      this.anims.create({
        key: 'guardian_run',
        frames: [
          { key: 'guardian_sheet', frame: 1 },
          { key: 'guardian_sheet', frame: 2 }
        ],
        frameRate: 8,
        repeat: -1
      });
      this.anims.create({
        key: 'guardian_jump',
        frames: [{ key: 'guardian_sheet', frame: 3 }],
        frameRate: 6
      });
    }

    if (!this.anims.exists('virus_pulse')) {
      this.anims.create({
        key: 'virus_pulse',
        frames: [
          { key: 'virus_sheet', frame: 0 },
          { key: 'virus_sheet', frame: 1 }
        ],
        frameRate: 5,
        repeat: -1
      });
    }

    // 6. Player Character ("Cyber Guardian")
    this.player = this.physics.add.sprite(90, 420, 'guardian_sheet', 0);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(30, 50);
    this.player.body.setOffset(9, 6);

    // 7. Mission 1 Targets: Phishing Nodes (Shoot with Scan Pulse [F])
    this.phishNodes = this.physics.add.staticGroup();
    const node1 = this.phishNodes.create(640, 253, 'phish_node');
    node1.setData('fixed', false);
    const node2 = this.phishNodes.create(1660, 323, 'phish_node');
    node2.setData('fixed', false);

    // 8. Mission 2 Targets: 3 Encryption Keys
    this.keysGroup = this.physics.add.group({ allowGravity: false });
    const keyPositions = [
      { x: 340, y: 335 },
      { x: 1320, y: 235 },
      { x: 1980, y: 225 }
    ];
    keyPositions.forEach((kp) => {
      const k = this.keysGroup.create(kp.x, kp.y, 'key_tex');
      this.tweens.add({
        targets: k,
        y: kp.y - 8,
        duration: 900,
        yoyo: true,
        repeat: -1
      });
    });

    // 9. Mission 3 Target: Main Firewall Core at end of level
    this.firewallCore = this.physics.add.staticSprite(2280, 438, 'firewall_core');
    this.firewallLabel = this.add.text(2280, 382, 'MAIN FIREWALL
(Complete Tasks 1 & 2)', {
      fontSize: '12px',
      color: '#93c5fd',
      align: 'center'
    }).setOrigin(0.5);

    // 10. Patrolling Malware Viruses
    this.viruses = this.physics.add.group({ allowGravity: false });
    const virusConfigs = [
      { x: 430, y: 452, minX: 320, maxX: 580, vx: 95 },
      { x: 960, y: 335, minX: 895, maxX: 1025, vx: 75 },
      { x: 1180, y: 452, minX: 1050, maxX: 1380, vx: 120 },
      { x: 1850, y: 452, minX: 1720, maxX: 2080, vx: 135 }
    ];
    virusConfigs.forEach((vc) => {
      const v = this.viruses.create(vc.x, vc.y, 'virus_sheet', 0);
      v.play('virus_pulse');
      v.setData('minX', vc.minX);
      v.setData('maxX', vc.maxX);
      v.setVelocityX(vc.vx);
    });

    // 11. Scan Pulse Projectiles Group
    this.pulses = this.physics.add.group({ allowGravity: false });

    // 12. Physics Colliders & Overlaps
    this.physics.add.collider(this.player, this.groundTile);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.collider(this.crates, this.groundTile);
    this.physics.add.collider(this.crates, this.platforms);

    // Collect Encryption Keys
    this.physics.add.overlap(this.player, this.keysGroup, this.handleCollectKey, null, this);

    // Scan Pulse hits Phishing Node
    this.physics.add.overlap(this.pulses, this.phishNodes, this.handleFixPhishing, null, this);

    // Scan Pulse pushes/stuns Virus
    this.physics.add.overlap(this.pulses, this.viruses, this.handlePulseVirus, null, this);

    // Player touches Virus
    this.physics.add.overlap(this.player, this.viruses, this.handlePlayerHit, null, this);

    // Player reaches Main Firewall
    this.physics.add.overlap(this.player, this.firewallCore, this.handleReachFirewall, null, this);

    // 13. Camera Setup (Follows Player across the 2400px level)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 14. Keyboard Inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keysWASD = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      fire: Phaser.Input.Keyboard.KeyCodes.F,
      mute: Phaser.Input.Keyboard.KeyCodes.M
    });

    // 15. Heads-Up Display (HUD - Fixed to Camera)
    this.hudBg = this.add.graphics().setScrollFactor(0);
    this.hudBg.fillStyle(0x060d1f, 0.82);
    this.hudBg.fillRect(0, 0, 900, 62);
    this.hudBg.lineStyle(1, 0x0ea5e9, 0.7);
    this.hudBg.lineBetween(0, 62, 900, 62);

    this.healthText = this.add.text(18, 12, 'SYSTEM INTEGRITY: 100%', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#34d399'
    }).setScrollFactor(0);

    this.scoreText = this.add.text(18, 35, 'SCORE: 0', {
      fontSize: '14px',
      color: '#38bdf8'
    }).setScrollFactor(0);

    this.missionText = this.add.text(275, 11, '', {
      fontSize: '13px',
      color: '#f8fafc',
      lineSpacing: 4
    }).setScrollFactor(0);

    this.muteText = this.add.text(882, 14, cyberAudio.muted ? '[M] AUDIO: OFF' : '[M] AUDIO: ON', {
      fontSize: '13px',
      color: '#fbbf24'
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.muteText.on('pointerdown', () => this.toggleSound());

    this.statusBanner = this.add.text(450, 84, 'Mission Active: Neutralize Phishing Nodes & Collect Encryption Keys!', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#7dd3fc',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.updateHUD();
  }

  toggleSound() {
    const isMuted = cyberAudio.toggleMute();
    this.muteText.setText(isMuted ? '[M] AUDIO: OFF' : '[M] AUDIO: ON');
  }

  updateHUD() {
    this.healthText.setText(`SYSTEM INTEGRITY: ${this.health}%`);
    this.healthText.setColor(this.health > 50 ? '#34d399' : this.health > 25 ? '#fbbf24' : '#f87171');
    this.scoreText.setText(`SCORE: ${this.score}`);

    const m1 = this.phishingFixed >= this.totalPhishing ? 'DONE' : `${this.phishingFixed}/${this.totalPhishing}`;
    const m2 = this.keysCollected >= this.totalKeys ? 'DONE' : `${this.keysCollected}/${this.totalKeys}`;
    const m3 = (this.phishingFixed >= this.totalPhishing && this.keysCollected >= this.totalKeys)
      ? 'READY - GO TO FIREWALL!'
      : 'LOCKED';

    this.missionText.setText([
      `Task 1 (Phishing Nodes): [${m1}]   |   Task 2 (Encryption Keys): [${m2}]`,
      `Task 3 (Activate Main Firewall): [${m3}]`
    ].join('
'));
  }

  showBanner(msg, color = '#7dd3fc') {
    this.statusBanner.setText(msg);
    this.statusBanner.setColor(color);
  }

  fireScanPulse() {
    cyberAudio.playPulse();
    const pulse = this.pulses.create(
      this.player.x + this.facing * 26,
      this.player.y - 2,
      'pulse_beam'
    );
    pulse.setVelocityX(this.facing * 520);
    this.time.delayedCall(650, () => {
      if (pulse && pulse.active) pulse.destroy();
    });
  }

  handleFixPhishing(pulse, node) {
    pulse.destroy();
    if (node.getData('fixed')) return;

    node.setData('fixed', true);
    node.setTexture('safe_node');
    this.phishingFixed += 1;
    this.score += 150;
    cyberAudio.playTaskComplete();
    this.showBanner('Phishing Attack Neutralized! (+150 pts)', '#34d399');
    this.updateHUD();
  }

  handleCollectKey(player, key) {
    key.destroy();
    this.keysCollected += 1;
    this.score += 100;
    cyberAudio.playCollect();
    this.showBanner(`Encryption Key Secured (${this.keysCollected}/${this.totalKeys})! (+100 pts)`, '#facc15');
    this.updateHUD();
  }

  handlePulseVirus(pulse, virus) {
    pulse.destroy();
    // Knock back virus temporarily
    virus.setTint(0x38bdf8);
    virus.setVelocityX(this.facing * 180);
    this.time.delayedCall(500, () => {
      if (virus && virus.active) {
        virus.clearTint();
        virus.setVelocityX(this.facing * 110);
      }
    });
  }

  handlePlayerHit(player, virus) {
    if (this.invulnerable) return;

    this.invulnerable = true;
    this.health = Math.max(0, this.health - 25);
    cyberAudio.playHit();
    this.cameras.main.shake(180, 0.01);
    this.player.setTint(0xf87171);
    this.showBanner('WARNING: Malware Breach Detected! (-25% Integrity)', '#f87171');
    this.updateHUD();

    if (this.health <= 0) {
      cyberAudio.stopBGM();
      cyberAudio.playLose();
      this.scene.start('EndScene', {
        won: false,
        score: this.score,
        phishingFixed: this.phishingFixed,
        keysCollected: this.keysCollected
      });
      return;
    }

    this.time.delayedCall(1000, () => {
      this.invulnerable = false;
      if (this.player && this.player.active) this.player.clearTint();
    });
  }

  handleReachFirewall() {
    if (this.phishingFixed >= this.totalPhishing && this.keysCollected >= this.totalKeys) {
      this.score += 300;
      cyberAudio.stopBGM();
      cyberAudio.playWin();
      this.scene.start('EndScene', {
        won: true,
        score: this.score,
        phishingFixed: this.phishingFixed,
        keysCollected: this.keysCollected
      });
    } else {
      this.showBanner('Firewall Locked! Finish Task 1 (Phishing) & Task 2 (Keys) first.', '#fbbf24');
    }
  }

  update() {
    // Mute toggle key
    if (Phaser.Input.Keyboard.JustDown(this.keysWASD.mute)) {
      this.toggleSound();
    }

    // Horizontal Movement
    const moveLeft = this.cursors.left.isDown || this.keysWASD.left.isDown;
    const moveRight = this.cursors.right.isDown || this.keysWASD.right.isDown;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    if (moveLeft) {
      this.player.setVelocityX(-230);
      this.player.setFlipX(true);
      this.facing = -1;
      if (onGround) this.player.anims.play('guardian_run', true);
    } else if (moveRight) {
      this.player.setVelocityX(230);
      this.player.setFlipX(false);
      this.facing = 1;
      if (onGround) this.player.anims.play('guardian_run', true);
    } else {
      this.player.setVelocityX(0);
      if (onGround) this.player.anims.play('guardian_idle', true);
    }

    // Jump
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keysWASD.up);

    if (jumpPressed && onGround) {
      this.player.setVelocityY(-460);
      cyberAudio.playJump();
    }

    if (!onGround) {
      this.player.anims.play('guardian_jump', true);
    }

    // Fire Scan Pulse
    if (Phaser.Input.Keyboard.JustDown(this.keysWASD.fire)) {
      this.fireScanPulse();
    }

    // Patrol logic for Malware Viruses
    this.viruses.children.iterate((v) => {
      if (!v) return;
      const minX = v.getData('minX');
      const maxX = v.getData('maxX');
      if (v.x <= minX) {
        v.setVelocityX(Math.abs(v.body.velocity.x) || 100);
      } else if (v.x >= maxX) {
        v.setVelocityX(-Math.abs(v.body.velocity.x) || -100);
      }
    });
  }
}

// ============================================================================
// SCENE 3: EndScene (Victory / Breach Screen & Replay Button)
// ============================================================================
class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  init(data) {
    this.won = data.won || false;
    this.finalScore = data.score || 0;
    this.phishingFixed = data.phishingFixed || 0;
    this.keysCollected = data.keysCollected || 0;
  }

  create() {
    this.add.image(450, 270, 'cyber_bg');

    const card = this.add.graphics();
    card.fillStyle(0x091326, 0.9);
    card.lineStyle(3, this.won ? 0x34d399 : 0xf87171, 1);
    card.fillRoundedRect(160, 75, 580, 380, 16);
    card.strokeRoundedRect(160, 75, 580, 380, 16);

    this.add.text(
      450,
      135,
      this.won ? 'NETWORK SECURED!' : 'SYSTEM BREACHED!',
      {
        fontSize: '36px',
        fontStyle: 'bold',
        color: this.won ? '#34d399' : '#f87171'
      }
    ).setOrigin(0.5);

    this.add.text(
      450,
      180,
      this.won
        ? 'All cyber threats neutralized & Main Firewall activated!'
        : 'Malware overwhelmed system integrity. Try again!',
      {
        fontSize: '16px',
        color: '#cbd5e1'
      }
    ).setOrigin(0.5);

    this.add.text(
      450,
      265,
      [
        `Final Score: ${this.finalScore}`,
        `Phishing Nodes Neutralized: ${this.phishingFixed} / 2`,
        `Encryption Keys Collected: ${this.keysCollected} / 3`
      ].join('
'),
      {
        fontSize: '18px',
        color: '#f8fafc',
        align: 'center',
        lineSpacing: 10
      }
    ).setOrigin(0.5);

    const replayBtn = this.add.rectangle(450, 385, 230, 50, 0x0284c7)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x7dd3fc);

    this.add.text(450, 385, 'PLAY AGAIN', {
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    replayBtn.on('pointerover', () => replayBtn.setFillStyle(0x0ea5e9));
    replayBtn.on('pointerout', () => replayBtn.setFillStyle(0x0284c7));
    replayBtn.on('pointerdown', () => {
      cyberAudio.startBGM();
      this.scene.start('GameScene');
    });
  }
}

// ============================================================================
// Phaser Game Configuration
// ============================================================================
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 540,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: [MainMenuScene, GameScene, EndScene]
};

new Phaser.Game(config);
