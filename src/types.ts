export type Point = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export type GameStatus = 'SPLASH' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY' | 'STAGE_TRANSITION';

export interface Entity {
  position: Point;
  targetPosition: Point;
  direction: Direction;
  nextDirection: Direction;
  speed: number;
}

export interface Ghost extends Entity {
  color: string;
  isScared: boolean;
  spawnPoint: Point;
}

export interface GameState {
  pacman: Entity;
  ghosts: Ghost[];
  maze: number[][];
  score: number;
  lives: number;
  stage: number;
  status: GameStatus;
  powerTimeout: number | null;
}
