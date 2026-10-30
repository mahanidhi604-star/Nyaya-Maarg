import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  COLLISION_TILES,
  CAMERA_DEADZONE_W,
  CAMERA_DEADZONE_H,
  PALETTE,
  PALETTE_CSS,
} from '../constants';
import {
  GROUND_LAYER,
  DETAIL_LAYER,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_START_X,
  PLAYER_START_Y,
} from '../data/testMap';
import { Player } from '../entities/Player';

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private detailLayer!: Phaser.Tilemaps.TilemapLayer;
  private hudText!: Phaser.GameObjects.Text;
  private lanternStage: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 1. Create Tilemap from 2D numerical arrays
    const map = this.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });

    const tileset = map.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) {
      throw new Error('Failed to load tileset in GameScene');
    }

    // 2. Build Ground layer
    const groundLayer = map.createBlankLayer('Ground', tileset, 0, 0);
    if (groundLayer) {
      this.groundLayer = groundLayer;
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tileIndex = GROUND_LAYER[y][x];
          if (tileIndex >= 0) {
            this.groundLayer.putTileAt(tileIndex, x, y);
          }
        }
      }
    }

    // 3. Build Detail layer (walls, roofs, fences, props)
    const detailLayer = map.createBlankLayer('Detail', tileset, 0, 0);
    if (detailLayer) {
      this.detailLayer = detailLayer;
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tileIndex = DETAIL_LAYER[y][x];
          if (tileIndex >= 0) {
            this.detailLayer.putTileAt(tileIndex, x, y);
          }
        }
      }
    }

    // 4. Configure collisions
    this.groundLayer.setCollision(COLLISION_TILES);
    this.detailLayer.setCollision(COLLISION_TILES);

    // Set world physics bounds to map dimensions
    const mapPixelW = MAP_WIDTH * TILE_SIZE;
    const mapPixelH = MAP_HEIGHT * TILE_SIZE;
    this.physics.world.setBounds(0, 0, mapPixelW, mapPixelH);

    // 5. Instantiate Player
    const startPixelX = PLAYER_START_X * TILE_SIZE + TILE_SIZE / 2;
    const startPixelY = PLAYER_START_Y * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, startPixelX, startPixelY);

    // Set depth so player walks behind roofs / canopies if needed
    this.player.setDepth(10);
    this.groundLayer.setDepth(0);
    this.detailLayer.setDepth(5);

    // Collide player with tilemap layers
    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.detailLayer);

    // 6. Camera setup: follow player, integer pixel snapping, deadzone (PRD 5.5 / DESIGN.md 2.1)
    const camera = this.cameras.main;
    camera.setBounds(0, 0, mapPixelW, mapPixelH);
    camera.startFollow(this.player, true, 0.1, 0.1);
    camera.setDeadzone(CAMERA_DEADZONE_W, CAMERA_DEADZONE_H);
    camera.roundPixels = true;

    // 7. Ambient Dusk Overlay (simulating Dusklight Hollow early evening)
    const ambientOverlay = this.add.graphics();
    ambientOverlay.fillStyle(PALETTE.DUSK_INDIGO, 0.25);
    ambientOverlay.fillRect(0, 0, mapPixelW, mapPixelH);
    ambientOverlay.setDepth(20);

    // 8. Basic HUD (anchored to camera viewport)
    this.createHud();

    // Scene transition fade in
    this.cameras.main.fadeIn(300, 20, 23, 43);
  }

  private createHud(): void {
    // Top-left: Coins & Day
    const hudBg = this.add.graphics();
    hudBg.setScrollFactor(0);
    hudBg.setDepth(100);
    hudBg.fillStyle(PALETTE.DUSK_INDIGO, 0.85);
    hudBg.fillRoundedRect(4, 4, 110, 22, 2);
    hudBg.lineStyle(1, PALETTE.TWILIGHT_BLUE, 0.8);
    hudBg.strokeRoundedRect(4, 4, 110, 22, 2);

    this.add.text(8, 7, 'Coins: 150', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: PALETTE_CSS.AMBER,
    }).setScrollFactor(0).setDepth(101);

    this.add.text(64, 7, 'Day 1 Spring', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: PALETTE_CSS.SNOW,
    }).setScrollFactor(0).setDepth(101);

    this.add.text(8, 16, 'Energy: 100/100', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: PALETTE_CSS.MOSS,
    }).setScrollFactor(0).setDepth(101);

    // Bottom-center controls hint
    this.hudText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 8, 'WASD / Arrow Keys to walk | Dusklight Hollow M0', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: PALETTE_CSS.FOG,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
  }

  update(): void {
    this.player.update();
  }
}
