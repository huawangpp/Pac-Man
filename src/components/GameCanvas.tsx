import React, { useRef, useEffect } from 'react';
import * as Phaser from 'phaser';

interface GameCanvasProps {
  stage: number;
  onGameOver: (score: number) => void;
  onVictory: (score: number) => void;
  onScoreUpdate: (score: number) => void;
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
  
  // Callbacks
  onGameOverCallback: (score: number) => void;
  onVictoryCallback: (score: number) => void;
  onScoreUpdateCallback: (score: number) => void;
  stage: number;

  constructor(
    onGameOver: (score: number) => void,
    onVictory: (score: number) => void,
    onScoreUpdate: (score: number) => void,
    stage: number
  ) {
    super('MainScene');
    this.sfx = new SoundSynth();
    this.onGameOverCallback = onGameOver;
    this.onVictoryCallback = onVictory;
    this.onScoreUpdateCallback = onScoreUpdate;
    this.stage = stage;
  }

  preload() {
    const g = this.add.graphics();
    
    // Player
    g.fillStyle(0xffff00);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0x020617);
    g.beginPath();
    g.moveTo(16, 16);
    g.lineTo(32, 8);
    g.lineTo(32, 24);
    g.closePath();
    g.fillPath();
    g.generateTexture('player', 32, 32);
    g.clear();

    // Wall
    g.fillStyle(0x1e1b4b);
    g.fillRoundedRect(2, 2, 28, 28, 4);
    g.lineStyle(2, 0x6366f1);
    g.strokeRoundedRect(2, 2, 28, 28, 4);
    g.generateTexture('wall', 32, 32);
    g.clear();

    // Dot
    g.fillStyle(0xfacc15);
    g.fillCircle(16, 16, 3);
    g.generateTexture('dot', 32, 32);
    g.clear();

    // Power
    g.fillStyle(0xffffff);
    g.fillCircle(16, 16, 8);
    g.generateTexture('power', 32, 32);
    g.clear();

    // Ghost
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
    g.generateTexture('ghost', 32, 32);
    g.destroy();
  }

  generateMazeLayout() {
    const width = 19;
    const height = 15;
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
    for (let i = 0; i < 4; i++) {
        const p = this.add.circle(x, y, 2, color);
        this.physics.add.existing(p);
        const body = p.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(
            Math.random() * 200 - 100,
            Math.random() * 200 - 100
        );
        this.tweens.add({
            targets: p,
            alpha: 0,
            scale: 0.1,
            duration: 400,
            onComplete: () => p.destroy()
        });
    }

    // Floating text
    const text = this.add.text(x, y - 10, '+10', {
        fontSize: '12px',
        fontFamily: '"Press Start 2P"',
        color: '#ffffff'
    }).setOrigin(0.5);
    this.tweens.add({
        targets: text,
        y: y - 40,
        alpha: 0,
        duration: 600,
        onComplete: () => text.destroy()
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
        else if (tile === 4) this.powers.create(px, py, 'power');
      });
    });

    this.player = this.physics.add.sprite(32 + 16, 32 + 16, 'player');
    this.player.body.setCircle(10, 6, 6);

    this.createGhost(304, 176, 0xff4444, 'left');
    this.createGhost(240, 240, 0x22c55e, 'right');
    this.createGhost(368, 240, 0xec4899, 'up');

    if (this.stage >= 2) this.createGhost(304, 240, 0x00ffff, 'down');

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

  createGhost(x: number, y: number, color: number, dir: string) {
    const g = this.ghosts.create(x, y, 'ghost');
    g.setTint(color);
    g.setData('color', color);
    g.setData('dir', dir);
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
    this.ghosts.getChildren().forEach((g: any) => g.setTint(0x3b82f6));

    if (this.pTimer) this.pTimer.remove();
    this.pTimer = this.time.delayedCall(8000, () => {
      this.isPowerMode = false;
      this.ghosts.getChildren().forEach((g: any) => g.setTint(g.getData('color')));

      while (this.respawnQueue.length > 0) {
        const color = this.respawnQueue.shift();
        if (color !== undefined) {
          this.createGhost(304, 240, color, 'up');
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
      this.time.delayedCall(1000, () => {
        this.onGameOverCallback(this.score);
      });
    }
  }

  checkWall(x: number, y: number) {
    const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
    return (this.maze[ty] && this.maze[ty][tx] === 1);
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
    if (this.player.x < 0) this.player.x = 608;
    if (this.player.x > 608) this.player.x = 0;

    this.ghosts.getChildren().forEach((g: any) => {
      const speed = this.isPowerMode ? this.ghostSpeed * 0.5 : this.ghostSpeed;
      let dir = g.getData('dir');
      const gx = g.x, gy = g.y;
      
      // Calculate more precise center detection
      const centerX = Math.floor(gx / 32) * 32 + 16;
      const centerY = Math.floor(gy / 32) * 32 + 16;
      const isAtCenter = Math.abs(gx - centerX) < 4 && Math.abs(gy - centerY) < 4;

      let blocked = false;
      if (dir === 'left') blocked = this.checkWall(gx - 20, gy);
      else if (dir === 'right') blocked = this.checkWall(gx + 20, gy);
      else if (dir === 'up') blocked = this.checkWall(gx, gy - 20);
      else if (dir === 'down') blocked = this.checkWall(gx, gy + 20);

      // If hit a wall or at an intersection center, consider turning
      if (blocked || isAtCenter) {
        const canContinue = !blocked;
        const opts = (['left', 'right', 'up', 'down'] as string[]).filter(d => {
          // Avoid immediate reversal unless necessary
          const reverseMap: Record<string, string> = { left: 'right', right: 'left', up: 'down', down: 'up' };
          if (!blocked && d === reverseMap[dir]) return false;
          
          if (d === 'left') return !this.checkWall(gx - 32, gy);
          if (d === 'right') return !this.checkWall(gx + 32, gy);
          if (d === 'up') return !this.checkWall(gx, gy - 32);
          if (d === 'down') return !this.checkWall(gx, gy + 32);
          return false;
        });

        if (opts.length > 0) {
          // If hit wall, pick any option. If at center, random chance to branch.
          if (blocked || Math.random() < 0.3) {
            dir = Phaser.Utils.Array.GetRandom(opts);
            g.setData('dir', dir);
            g.x = centerX; // Snap to center briefly when turning to align with paths
            g.y = centerY;
          }
        }
      }
      if (dir === 'left') g.setVelocity(-speed, 0);
      else if (dir === 'right') g.setVelocity(speed, 0);
      else if (dir === 'up') g.setVelocity(0, -speed);
      else if (dir === 'down') g.setVelocity(0, speed);

      // Ghost Tunneling
      if (g.x < 0) g.x = 608;
      if (g.x > 608) g.x = 0;
    });
  }
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stage,
  onGameOver,
  onVictory,
  onScoreUpdate,
  status
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Store callbacks in refs so we can access current versions without triggering effect re-runs
  const callbacksRef = useRef({ onGameOver, onVictory, onScoreUpdate });
  useEffect(() => {
    callbacksRef.current = { onGameOver, onVictory, onScoreUpdate };
  }, [onGameOver, onVictory, onScoreUpdate]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 608,
      height: 480,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
      },
      scene: new MainScene(
        (s) => callbacksRef.current.onGameOver(s),
        (s) => callbacksRef.current.onVictory(s),
        (s) => callbacksRef.current.onScoreUpdate(s),
        stage
      ),
      backgroundColor: '#020617',
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [stage]); // Only depends on stage

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
      className="rounded-lg shadow-[0_0_50px_rgba(139,92,246,0.3)] border-4 border-blue-900/50 overflow-hidden"
    />
  );
};
