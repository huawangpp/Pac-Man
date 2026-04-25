import React, { useRef, useEffect } from 'react';
import * as Phaser from 'phaser';

interface GameTheme {
  id: string;
  name: string;
  bg: string;
  wall: number;
  wallStroke: number;
  dot: number;
  powerEmoji: string;
  playerColor: number;
  playerMouth: string;
  accent: string;
}

export const THEMES: Record<string, GameTheme> = {
  teahouse: {
    id: 'teahouse',
    name: 'Tea House',
    bg: '#f4ece1',
    wall: 0xd97706,
    wallStroke: 0x4a3424,
    dot: 0xd97706,
    powerEmoji: '🥟',
    playerColor: 0xfacc15,
    playerMouth: '#f4ece1',
    accent: '#4a3424'
  },
  bamboo: {
    id: 'bamboo',
    name: 'Bamboo Garden',
    bg: '#ecfdf5',
    wall: 0x059669,
    wallStroke: 0x064e3b,
    dot: 0x10b981,
    powerEmoji: '🍑',
    playerColor: 0xffedd5,
    playerMouth: '#ecfdf5',
    accent: '#064e3b'
  },
  market: {
    id: 'market',
    name: 'Market Street',
    bg: '#fff1f2',
    wall: 0xe11d48,
    wallStroke: 0x4c0519,
    dot: 0xf43f5e,
    powerEmoji: '🍞',
    playerColor: 0xfde047,
    playerMouth: '#fff1f2',
    accent: '#4c0519'
  }
};

interface GameCanvasProps {
  stage: number;
  themeId: string;
  onGameOver: (score: number) => void;
  onVictory: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  onLoseLife: () => void;
  lives: number;
  status: 'PLAYING' | 'PAUSED' | 'STAGE_TRANSITION' | 'SPLASH' | 'GAMEOVER' | 'VICTORY';
}

class SoundSynth {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(f: number, type: OscillatorType, d: number, slide?: number) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, this.ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, this.ctx.currentTime + d);
    g.gain.setValueAtTime(0.1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + d);
  }

  munch() { this.play(800, 'triangle', 0.05, 400); }
  power() { [400, 600, 800].forEach((f, i) => setTimeout(() => this.play(f, 'square', 0.1, f * 1.5), i * 100)); }
  catch() { this.play(1200, 'sine', 0.1, 1500); }
  death() { this.play(200, 'sawtooth', 0.5, 50); }
}

class MainScene extends Phaser.Scene {
  score: number = 0;
  isPowerMode: boolean = false;
  sfx: SoundSynth;
  moveSpeed: number = 160;
  ghostSpeed: number = 110;
  gameActive: boolean = true;
  respawnQueue: number[] = [];
  queuedDirection: string | null = null;
  currentDirection: string | null = null;
  maze: number[][] = [];
  walls!: Phaser.Physics.Arcade.StaticGroup;
  dots!: Phaser.Physics.Arcade.Group;
  powers!: Phaser.Physics.Arcade.Group;
  ghosts!: Phaser.Physics.Arcade.Group;
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  pTimer: Phaser.Time.TimerEvent | null = null;
  fTimer: Phaser.Time.TimerEvent | null = null;
  
  // Callbacks
  onGameOverCallback: (score: number) => void;
  onVictoryCallback: (score: number) => void;
  onScoreUpdateCallback: (score: number) => void;
  onLoseLifeCallback: () => void;
  stage: number;
  lives: number;
  theme: GameTheme;
  themeId: string;

  constructor(
    onGameOver: (score: number) => void,
    onVictory: (score: number) => void,
    onScoreUpdate: (score: number) => void,
    onLoseLife: () => void,
    stage: number,
    lives: number,
    themeId: string
  ) {
    super('MainScene');
    this.sfx = new SoundSynth();
    this.onGameOverCallback = onGameOver;
    this.onVictoryCallback = onVictory;
    this.onScoreUpdateCallback = onScoreUpdate;
    this.onLoseLifeCallback = onLoseLife;
    this.stage = stage;
    this.lives = lives;
    this.themeId = themeId;
    this.theme = THEMES[themeId] || THEMES.teahouse;
  }

  preload() {
    // Power - Theme-specific Emoji
    const powerCanvas = this.textures.createCanvas('power', 32, 32);
    if (powerCanvas) {
      const ctx = powerCanvas.getContext();
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.theme.powerEmoji, 16, 16);
      powerCanvas.refresh();
    }

    const g = this.add.graphics();
    
    // Player - Chef theme
    g.lineStyle(2, this.theme.wallStroke);
    g.fillStyle(this.theme.playerColor);
    g.fillCircle(16, 16, 14);
    g.strokeCircle(16, 16, 14);
    
    g.fillStyle(Phaser.Display.Color.HexStringToColor(this.theme.playerMouth).color);
    g.beginPath();
    g.moveTo(16, 16);
    g.lineTo(32, 8);
    g.lineTo(32, 24);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(this.theme.wallStroke);
    g.fillCircle(20, 8, 2);
    
    g.generateTexture('player', 32, 32);
    g.clear();

    // Wall - Theme-specific
    g.fillStyle(this.theme.wall);
    g.fillRoundedRect(2, 2, 28, 28, 6);
    g.lineStyle(3, this.theme.wallStroke);
    g.strokeRoundedRect(2, 2, 28, 28, 6);
    
    // Pattern lines
    g.lineStyle(1, this.theme.wallStroke, 0.3);
    g.moveTo(8, 4); g.lineTo(8, 28);
    g.moveTo(16, 4); g.lineTo(16, 28);
    g.moveTo(24, 4); g.lineTo(24, 28);
    g.strokePath();
    
    g.generateTexture('wall', 32, 32);
    g.clear();

    // Dot - Theme-specific
    g.fillStyle(this.theme.wallStroke);
    g.fillCircle(16, 16, 4);
    g.fillStyle(this.theme.dot);
    g.fillCircle(16, 16, 2.5);
    g.generateTexture('dot', 32, 32);
    g.clear();

    // Ghost - Theme-specific styling
    g.lineStyle(2, this.theme.wallStroke);
    g.fillStyle(0xffffff);
    g.beginPath();
    g.arc(16, 14, 12, Math.PI, 0);
    g.lineTo(28, 28);
    g.lineTo(22, 24);
    g.lineTo(16, 28);
    g.lineTo(10, 24);
    g.lineTo(4, 28);
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    // Eyes
    g.fillStyle(this.theme.wallStroke);
    g.fillCircle(12, 12, 2);
    g.fillCircle(20, 12, 2);
    
    g.generateTexture('ghost', 32, 32);
    g.destroy();
  }

  generateMazeLayout() {
    const width = 25;
    const height = 19;
    const maze = Array.from({ length: height }, () => Array(width).fill(1));

    // Recursive Backtracking Maze Generation
    const walk = (x: number, y: number) => {
      maze[y][x] = 0;
      const dirs = [
        [0, -2], [0, 2], [-2, 0], [2, 0]
      ].sort(() => Math.random() - 0.5);

      dirs.forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) {
          maze[y + dy / 2][x + dx / 2] = 0;
          walk(nx, ny);
        }
      });
    };

    walk(1, 1);

    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);

    // Open Tunnels on sides
    maze[midY][0] = 0;
    maze[midY][1] = 0;
    maze[midY][width - 2] = 0;
    maze[midY][width - 1] = 0;

    // Player spawn area - clarify paths
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        maze[y][x] = 0;
      }
    }

    // Ghost house area bounds
    const ghostArea = {
        minX: midX - 2,
        maxX: midX + 2,
        minY: midY - 1,
        maxY: midY + 1
    };

    // Entrance to ghost house
    maze[midY-2][midX] = 0;

    // Add some random loops (remove random walls)
    for (let i = 0; i < 15; i++) {
        const rx = Math.floor(Math.random() * (width - 2)) + 1;
        const ry = Math.floor(Math.random() * (height - 2)) + 1;
        // Don't break ghost house walls
        if (rx >= ghostArea.minX && rx <= ghostArea.maxX && ry >= ghostArea.minY && ry <= ghostArea.maxY) continue;
        if (maze[ry][rx] === 1) {
            maze[ry][rx] = 0;
        }
    }

    // Post-process: add dots everywhere there is a path EXCEPT in the ghost house, entrance, and player spawn
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (maze[y][x] === 0) {
          const inGhostHouse = x >= ghostArea.minX && x <= ghostArea.maxX && y >= ghostArea.minY && y <= ghostArea.maxY;
          const atEntrance = x === midX && y === midY - 2;
          const isPlayerSpawn = x === 1 && y === 1;
          if (!inGhostHouse && !atEntrance && !isPlayerSpawn) {
            maze[y][x] = 2; // Fill path with dot
          }
        }
      }
    }

    // Power Pellets at corners (excluding player spawn at 1,1)
    const corners = [[width - 2, 1], [1, height - 2], [width - 2, height - 2]];
    corners.forEach(([cx, cy]) => {
      maze[cy][cx] = 4;
    });

    return maze;
  }

  createDotEffect(x: number, y: number, color: number = 0xfacc15) {
    for (let i = 0; i < 6; i++) {
        const p = this.add.circle(x, y, 3, color);
        this.physics.add.existing(p);
        const body = p.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(
            Math.random() * 260 - 130,
            Math.random() * 260 - 130
        );
        this.tweens.add({
            targets: p,
            alpha: 0,
            scale: 0.1,
            duration: 500,
            onComplete: () => p.destroy()
        });
    }

    // Floating text
    const text = this.add.text(x, y - 10, '+10', {
        fontSize: '14px',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#4a3424',
        strokeThickness: 3
    }).setOrigin(0.5);
    this.tweens.add({
        targets: text,
        y: y - 50,
        alpha: 0,
        duration: 800,
        onComplete: () => text.destroy()
    });

    // Player pulse
    this.tweens.add({
      targets: this.player,
      scale: 1.2,
      duration: 50,
      yoyo: true
    });
  }

  create() {
    this.maze = this.generateMazeLayout();

    this.score = 0;
    this.isPowerMode = false;
    this.gameActive = true;
    this.respawnQueue = [];
    this.queuedDirection = null;
    this.currentDirection = null;
    this.ghostSpeed = 110 + (this.stage * 10);
    this.moveSpeed = 160;

    this.walls = this.physics.add.staticGroup();
    this.dots = this.physics.add.group();
    this.powers = this.physics.add.group();
    this.ghosts = this.physics.add.group();

    this.maze.forEach((row, y) => {
      row.forEach((tile, x) => {
        const px = x * 32 + 16, py = y * 32 + 16;
        if (tile === 1) this.walls.create(px, py, 'wall');
        else if (tile === 2) this.dots.create(px, py, 'dot');
        else if (tile === 4) {
          this.powers.create(px, py, 'power');
        }
      });
    });

    this.player = this.physics.add.sprite(32 + 16, 32 + 16, 'player');
    this.player.body.setCircle(10, 6, 6);

    const midX = Math.floor(25 / 2);
    const midY = Math.floor(19 / 2);
    const mx = midX * 32 + 16;
    const my = midY * 32 + 16;

    this.createGhost(mx, my - 64, 0xff4444, 'left', 'chase');
    this.createGhost(mx - 64, my, 0x22c55e, 'right', 'ambush');
    this.createGhost(mx + 64, my, 0xec4899, 'up', 'patrol');

    if (this.stage >= 2) this.createGhost(mx, my, 0x00ffff, 'down', 'shy');

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.overlap(this.player, this.dots, (_, d: any) => {
      const { x, y } = d;
      this.createDotEffect(x, y);
      d.destroy();
      this.score += 10;
      this.onScoreUpdateCallback(this.score);
      this.sfx.munch();
      this.checkVictory();
    });
    this.physics.add.overlap(this.player, this.powers, (_, pw: any) => {
      const { x, y } = pw;
      this.createDotEffect(x, y, 0xffffff);
      pw.destroy();
      this.score += 50;
      this.onScoreUpdateCallback(this.score);
      this.sfx.power();
      this.startPowerMode();
    });
    this.physics.add.overlap(this.player, this.ghosts, this.hitGhost as any, undefined, this);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as any;
    this.sfx.init();
  }

  createGhost(x: number, y: number, color: number, dir: string, role: string) {
    const g = this.ghosts.create(x, y, 'ghost');
    g.setTint(color);
    g.setData('color', color);
    g.setData('dir', dir);
    g.setData('role', role);
    g.body.setCircle(12, 4, 4);
    this.physics.add.collider(g, this.walls);
  }

  checkVictory() {
    if (this.dots.countActive() === 0 && this.powers.countActive() === 0) {
      this.gameActive = false;
      this.physics.pause();
      this.onVictoryCallback(this.score);
    }
  }

  startPowerMode() {
    this.isPowerMode = true;
    this.ghosts.getChildren().forEach((g: any) => {
      g.setTint(0x3b82f6);
      this.tweens.add({
        targets: g,
        scale: 1.3,
        duration: 400,
        yoyo: true,
        repeat: -1
      });
    });

    if (this.pTimer) this.pTimer.remove();
    if (this.fTimer) this.fTimer.remove();

    // Flashing effect for warning
    this.fTimer = this.time.delayedCall(6000, () => {
      if (this.isPowerMode) {
        this.ghosts.getChildren().forEach((g: any) => {
          this.tweens.add({
            targets: g,
            tint: 0xffffff,
            duration: 200,
            yoyo: true,
            repeat: -1
          });
        });
      }
    });

    this.pTimer = this.time.delayedCall(8000, () => {
      this.isPowerMode = false;
      this.ghosts.getChildren().forEach((g: any) => {
        this.tweens.killTweensOf(g);
        g.setTint(g.getData('color'));
        g.setScale(1);
        g.setAlpha(1);
      });

      while (this.respawnQueue.length > 0) {
        const color = this.respawnQueue.shift();
        if (color !== undefined) {
          const midX = Math.floor(25 / 2) * 32 + 16;
          const midY = Math.floor(19 / 2) * 32 + 16;
          const roles = ['chase', 'ambush', 'patrol', 'shy'];
          const role = roles[this.respawnQueue.length % roles.length];
          this.createGhost(midX, midY, color, 'up', role);
        }
      }
    });
  }

  hitGhost(_: any, g: any) {
    if (this.isPowerMode) {
      const color = g.getData('color');
      this.sfx.catch();
      g.destroy();
      this.score += 200;
      this.onScoreUpdateCallback(this.score);
      this.respawnQueue.push(color);
    } else {
      this.sfx.death();
      this.physics.pause();
      this.gameActive = false;
      this.player.setTint(0xff0000);
      this.lives--;
      this.onLoseLifeCallback();

      if (this.lives > 0) {
        this.time.delayedCall(1500, () => {
          this.resetRespawn();
        });
      } else {
        this.time.delayedCall(1500, () => {
          this.onGameOverCallback(this.score);
        });
      }
    }
  }

  resetRespawn() {
    this.player.clearTint();
    this.player.x = 32 + 16;
    this.player.y = 32 + 16;
    this.currentDirection = null;
    this.queuedDirection = null;
    this.player.setVelocity(0);
    this.physics.resume();
    this.gameActive = true;

    // Reset ghosts to start positions
    const midX = Math.floor(25 / 2) * 32 + 16;
    const midY = Math.floor(19 / 2) * 32 + 16;
    
    // We don't want to destroy and recreate as we might lose state or have issues with complexity
    // Let's just snap them back
    const ghostPositions = [
        { x: midX, y: midY - 64 },
        { x: midX - 64, y: midY },
        { x: midX + 64, y: midY },
        { x: midX, y: midY }
    ];
    
    this.ghosts.getChildren().forEach((child: any, i) => {
        const pos = ghostPositions[i] || { x: midX, y: midY };
        child.x = pos.x;
        child.y = pos.y;
        child.setVelocity(0);
    });
  }

  checkWall(x: number, y: number) {
    const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
    if (ty < 0 || ty >= this.maze.length) return false;
    if (tx < 0 || tx >= this.maze[0].length) return false;
    return this.maze[ty][tx] === 1;
  }

  update() {
    if (!this.gameActive) return;

    if (this.cursors.left.isDown || this.wasd.A.isDown) this.queuedDirection = 'left';
    else if (this.cursors.right.isDown || this.wasd.D.isDown) this.queuedDirection = 'right';
    else if (this.cursors.up.isDown || this.wasd.W.isDown) this.queuedDirection = 'up';
    else if (this.cursors.down.isDown || this.wasd.S.isDown) this.queuedDirection = 'down';

    const px = this.player.x;
    const py = this.player.y;
    const threshold = 6;

    if (this.queuedDirection && this.queuedDirection !== this.currentDirection) {
      const centerX = Math.floor(px / 32) * 32 + 16;
      const centerY = Math.floor(py / 32) * 32 + 16;

      // Allow instant reversals
      const isReverse = (
        (this.currentDirection === 'left' && this.queuedDirection === 'right') ||
        (this.currentDirection === 'right' && this.queuedDirection === 'left') ||
        (this.currentDirection === 'up' && this.queuedDirection === 'down') ||
        (this.currentDirection === 'down' && this.queuedDirection === 'up')
      );

      let canTurn = false;
      if (this.queuedDirection === 'left') canTurn = !this.checkWall(centerX - 32, centerY);
      if (this.queuedDirection === 'right') canTurn = !this.checkWall(centerX + 32, centerY);
      if (this.queuedDirection === 'up') canTurn = !this.checkWall(centerX, centerY - 32);
      if (this.queuedDirection === 'down') canTurn = !this.checkWall(centerX, centerY + 32);

      if (canTurn) {
        const nearCenter = Math.abs(px - centerX) < threshold && Math.abs(py - centerY) < threshold;

        if (isReverse || nearCenter || !this.currentDirection) {
          if (!isReverse) {
            this.player.x = centerX;
            this.player.y = centerY;
          }
          this.currentDirection = this.queuedDirection;
          this.queuedDirection = null;
        }
      }
    }

    this.player.setVelocity(0);
    if (this.currentDirection === 'left') {
      if (this.checkWall(px - 18, py)) { this.currentDirection = null; }
      else { this.player.setVelocityX(-this.moveSpeed); this.player.setFlipX(true); this.player.setAngle(0); }
    } else if (this.currentDirection === 'right') {
      if (this.checkWall(px + 18, py)) { this.currentDirection = null; }
      else { this.player.setVelocityX(this.moveSpeed); this.player.setFlipX(false); this.player.setAngle(0); }
    } else if (this.currentDirection === 'up') {
      if (this.checkWall(px, py - 18)) { this.currentDirection = null; }
      else { this.player.setVelocityY(-this.moveSpeed); this.player.setAngle(-90); }
    } else if (this.currentDirection === 'down') {
      if (this.checkWall(px, py + 18)) { this.currentDirection = null; }
      else { this.player.setVelocityY(this.moveSpeed); this.player.setAngle(90); }
    }

    // Tunneling
    const worldWidth = 25 * 32;
    if (this.player.x < -16) this.player.x = worldWidth + 16;
    if (this.player.x > worldWidth + 16) this.player.x = -16;

    this.ghosts.getChildren().forEach((g: any) => {
      const speed = this.isPowerMode ? this.ghostSpeed * 0.5 : this.ghostSpeed;
      let dir = g.getData('dir');
      const role = g.getData('role');
      const gx = g.x, gy = g.y;
      
      const centerX = Math.floor(gx / 32) * 32 + 16;
      const centerY = Math.floor(gy / 32) * 32 + 16;
      const isAtCenter = Math.abs(gx - centerX) < 4 && Math.abs(gy - centerY) < 4;

      let blocked = false;
      if (dir === 'left') blocked = this.checkWall(gx - 20, gy);
      else if (dir === 'right') blocked = this.checkWall(gx + 20, gy);
      else if (dir === 'up') blocked = this.checkWall(gx, gy - 20);
      else if (dir === 'down') blocked = this.checkWall(gx, gy + 20);

      if (blocked || isAtCenter) {
        const canContinue = !blocked;
        const opts = (['left', 'right', 'up', 'down'] as string[]).filter(d => {
          const reverseMap: Record<string, string> = { left: 'right', right: 'left', up: 'down', down: 'up' };
          if (!blocked && d === reverseMap[dir]) return false;
          
          if (d === 'left') return !this.checkWall(gx - 32, gy);
          if (d === 'right') return !this.checkWall(gx + 32, gy);
          if (d === 'up') return !this.checkWall(gx, gy - 32);
          if (d === 'down') return !this.checkWall(gx, gy + 32);
          return false;
        });

        if (opts.length > 0) {
          if (this.isPowerMode) {
             // Frightened: Random movement
             if (blocked || Math.random() < 0.3) {
               dir = Phaser.Utils.Array.GetRandom(opts);
             }
          } else {
             // AI Decisions
             let target = { x: this.player.x, y: this.player.y };
             
             if (role === 'ambush') {
               // Pinky style: target ahead
               const pvx = this.player.body.velocity.x;
               const pvy = this.player.body.velocity.y;
               target.x += (pvx / this.moveSpeed) * 32 * 4;
               target.y += (pvy / this.moveSpeed) * 32 * 4;
             } else if (role === 'patrol') {
               // Patrol top right corner area
               target = { x: (25 - 2) * 32, y: 32 * 2 };
             } else if (role === 'shy') {
               // Clyde style: switch between chasing and fleeing
               const dist = Phaser.Math.Distance.Between(gx, gy, this.player.x, this.player.y);
               if (dist < 32 * 6) {
                 target = { x: 32, y: (19-2) * 32 }; // Flee to bottom left
               }
             }

             // Find best direction
             let bestDir = dir;
             if (blocked || isAtCenter) {
               let minDist = Infinity;
               opts.forEach(o => {
                 let nx = centerX, ny = centerY;
                 if (o === 'left') nx -= 32;
                 if (o === 'right') nx += 32;
                 if (o === 'up') ny -= 32;
                 if (o === 'down') ny += 32;
                 const d = Phaser.Math.Distance.Between(nx, ny, target.x, target.y);
                 if (d < minDist) {
                   minDist = d;
                   bestDir = o;
                 }
               });
               
               // Some randomness to prevent perfect stacking
               if (Math.random() < 0.05 && opts.length > 1) {
                 bestDir = Phaser.Utils.Array.GetRandom(opts);
               }
               dir = bestDir;
             }
          }
          
          if (dir !== g.getData('dir')) {
            g.x = centerX;
            g.y = centerY;
            g.setData('dir', dir);
          }
        }
      }
      if (dir === 'left') g.setVelocity(-speed, 0);
      else if (dir === 'right') g.setVelocity(speed, 0);
      else if (dir === 'up') g.setVelocity(0, -speed);
      else if (dir === 'down') g.setVelocity(0, speed);

      // Ghost Tunneling
      const worldWidth = 25 * 32;
      if (g.x < -16) g.x = worldWidth + 16;
      if (g.x > worldWidth + 16) g.x = -16;
    });
  }
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stage,
  themeId,
  onGameOver,
  onVictory,
  onScoreUpdate,
  onLoseLife,
  lives,
  status
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Store callbacks in refs so we can access current versions without triggering effect re-runs
  const callbacksRef = useRef({ onGameOver, onVictory, onScoreUpdate, onLoseLife });
  useEffect(() => {
    callbacksRef.current = { onGameOver, onVictory, onScoreUpdate, onLoseLife };
  }, [onGameOver, onVictory, onScoreUpdate, onLoseLife]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 25 * 32,
      height: 19 * 32,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
      },
      scene: new MainScene(
        (s) => callbacksRef.current.onGameOver(s),
        (s) => callbacksRef.current.onVictory(s),
        (s) => callbacksRef.current.onScoreUpdate(s),
        () => callbacksRef.current.onLoseLife(),
        stage,
        lives,
        themeId
      ),
      backgroundColor: THEMES[themeId]?.bg || '#f4ece1',
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [stage, themeId]); // Only depends on stage or theme change

  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('MainScene') as MainScene;
      if (scene) {
        if (status === 'PAUSED' || status === 'STAGE_TRANSITION' || status === 'SPLASH') {
          scene.physics.pause();
          scene.gameActive = false;
        } else if (status === 'PLAYING') {
          scene.physics.resume();
          scene.gameActive = true;
        }
      }
    }
  }, [status]);

  return (
    <div
      ref={containerRef}
      className="rounded-[2.5rem] shadow-[12px_12px_0px_#4a3424] border-[6px] border-[#4a3424] overflow-hidden"
      style={{ boxShadow: `12px 12px 0px ${THEMES[themeId]?.accent || '#4a3424'}`, borderColor: THEMES[themeId]?.accent || '#4a3424' }}
    />
  );
};
