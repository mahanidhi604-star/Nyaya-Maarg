import Phaser from 'phaser';
import {
  Direction,
  PLAYER_SPEED,
  PLAYER_BODY_W,
  PLAYER_BODY_H,
  PLAYER_BODY_OFFSET_X,
  PLAYER_BODY_OFFSET_Y,
} from '../constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private currentDirection: Direction = Direction.DOWN;
  private isMoving: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set arcade physics collision body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_BODY_W, PLAYER_BODY_H);
    body.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);
    body.setCollideWorldBounds(true);

    this.initAnimations(scene);
    this.initInput(scene);
  }

  private initAnimations(scene: Phaser.Scene): void {
    const anims = scene.anims;

    // 4 frames per row: frame 0 = idle, 1..3 = walk cycle
    const directions = [
      { key: 'down', startFrame: 0, dir: Direction.DOWN },
      { key: 'left', startFrame: 4, dir: Direction.LEFT },
      { key: 'right', startFrame: 8, dir: Direction.RIGHT },
      { key: 'up', startFrame: 12, dir: Direction.UP },
    ];

    directions.forEach(({ key, startFrame }) => {
      // Walk animation: 4 frames looped at 8 fps (PRD Section 5.5 / DESIGN.md 2.2)
      if (!anims.exists(`player-walk-${key}`)) {
        anims.create({
          key: `player-walk-${key}`,
          frames: anims.generateFrameNumbers('player', {
            start: startFrame,
            end: startFrame + 3,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }

      // Idle animation: 2 frames slow breathing at 2 fps
      if (!anims.exists(`player-idle-${key}`)) {
        anims.create({
          key: `player-idle-${key}`,
          frames: [
            { key: 'player', frame: startFrame },
            { key: 'player', frame: startFrame + 1 },
          ],
          frameRate: 2,
          repeat: -1,
        });
      }
    });

    this.play('player-idle-down');
  }

  private initInput(scene: Phaser.Scene): void {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    let vx = 0;
    let vy = 0;

    const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    // Normalize diagonal velocity
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    // Direction and animation state handling
    if (vx < 0) {
      this.currentDirection = Direction.LEFT;
    } else if (vx > 0) {
      this.currentDirection = Direction.RIGHT;
    } else if (vy < 0) {
      this.currentDirection = Direction.UP;
    } else if (vy > 0) {
      this.currentDirection = Direction.DOWN;
    }

    const dirKeys = ['down', 'left', 'right', 'up'];
    const activeDirKey = dirKeys[this.currentDirection];

    const movingNow = vx !== 0 || vy !== 0;
    if (movingNow) {
      this.play(`player-walk-${activeDirKey}`, true);
      this.isMoving = true;
    } else {
      this.play(`player-idle-${activeDirKey}`, true);
      this.isMoving = false;
    }
  }

  getDirection(): Direction {
    return this.currentDirection;
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }
}
