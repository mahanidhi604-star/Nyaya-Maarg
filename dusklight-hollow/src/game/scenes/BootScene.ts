/**
 * BootScene - generates all placeholder pixel art textures at runtime.
 *
 * Every texture is drawn with the Hollow-16 palette so it matches the
 * DESIGN.md look even before real licensed sprites are dropped in.
 * When real assets are ready, swap this scene for one that loads PNGs.
 */
import Phaser from 'phaser';
import {
  TILE_SIZE,
  PALETTE,
  PLAYER_SPRITE_W,
  PLAYER_SPRITE_H,
} from '../constants';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Nothing to load from disk in M0 - everything is generated below.
  }

  create(): void {
    this.generateTileset();
    this.generatePlayerSheet();
    this.scene.start('TitleScene');
  }

  /* ------------------------------------------------------------------ */
  /*  Tileset generator (16 tiles, each 16 x 16)                       */
  /* ------------------------------------------------------------------ */

  private generateTileset(): void {
    const cols = 16;
    const canvas = this.textures.createCanvas('tileset', cols * TILE_SIZE, TILE_SIZE)!;
    const ctx = canvas.context;

    const draw = (index: number, fn: (x: number, y: number) => void) => {
      fn(index * TILE_SIZE, 0);
    };

    const fillTile = (x: number, y: number, colour: string) => {
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    };

    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

    // 0  Grass
    draw(0, (x, y) => {
      fillTile(x, y, hex(PALETTE.MOSS));
      ctx.fillStyle = hex(PALETTE.PINE);
      // Grass tufts
      ctx.fillRect(x + 3, y + 5, 1, 2);
      ctx.fillRect(x + 10, y + 9, 1, 2);
      ctx.fillRect(x + 7, y + 13, 1, 2);
    });

    // 1  Grass alt
    draw(1, (x, y) => {
      fillTile(x, y, hex(PALETTE.MOSS));
      ctx.fillStyle = hex(PALETTE.PINE);
      ctx.fillRect(x + 6, y + 3, 1, 2);
      ctx.fillRect(x + 12, y + 11, 1, 2);
    });

    // 2  Path (dirt)
    draw(2, (x, y) => {
      fillTile(x, y, hex(PALETTE.DRIFTWOOD));
      ctx.fillStyle = hex(PALETTE.BRICK);
      ctx.fillRect(x + 4, y + 6, 2, 1);
      ctx.fillRect(x + 10, y + 12, 2, 1);
    });

    // 3  Stone floor
    draw(3, (x, y) => {
      fillTile(x, y, hex(PALETTE.PEBBLE));
      ctx.fillStyle = hex(PALETTE.FOG);
      ctx.fillRect(x, y, TILE_SIZE, 1);
      ctx.fillRect(x, y, 1, TILE_SIZE);
      ctx.fillStyle = hex(PALETTE.TWILIGHT_BLUE);
      ctx.fillRect(x + 8, y, 1, TILE_SIZE);
      ctx.fillRect(x, y + 8, TILE_SIZE, 1);
    });

    // 4  Water (shallow)
    draw(4, (x, y) => {
      fillTile(x, y, hex(PALETTE.MIST_BLUE));
      ctx.fillStyle = hex(PALETTE.LAKE_TEAL);
      ctx.fillRect(x + 2, y + 4, 5, 1);
      ctx.fillRect(x + 9, y + 10, 4, 1);
    });

    // 5  Water (deep)
    draw(5, (x, y) => {
      fillTile(x, y, hex(PALETTE.LAKE_TEAL));
      ctx.fillStyle = hex(PALETTE.DUSK_INDIGO);
      ctx.fillRect(x + 3, y + 5, 4, 1);
      ctx.fillRect(x + 8, y + 11, 5, 1);
    });

    // 6  Sand
    draw(6, (x, y) => {
      fillTile(x, y, hex(PALETTE.AMBER));
      ctx.fillStyle = hex(PALETTE.CORAL);
      ctx.fillRect(x + 5, y + 7, 1, 1);
      ctx.fillRect(x + 11, y + 3, 1, 1);
    });

    // 7  Wall
    draw(7, (x, y) => {
      fillTile(x, y, hex(PALETTE.TWILIGHT_BLUE));
      ctx.fillStyle = hex(PALETTE.DUSK_INDIGO);
      ctx.fillRect(x, y, TILE_SIZE, 1);
      ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
      ctx.fillRect(x, y, 1, TILE_SIZE);
      ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE);
    });

    // 8  Wall top
    draw(8, (x, y) => {
      fillTile(x, y, hex(PALETTE.DUSK_INDIGO));
      ctx.fillStyle = hex(PALETTE.TWILIGHT_BLUE);
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    });

    // 9  Roof
    draw(9, (x, y) => {
      fillTile(x, y, hex(PALETTE.BRICK));
      ctx.fillStyle = hex(PALETTE.CORAL);
      ctx.fillRect(x + 2, y + 4, TILE_SIZE - 4, 1);
      ctx.fillRect(x + 2, y + 10, TILE_SIZE - 4, 1);
    });

    // 10 Door
    draw(10, (x, y) => {
      fillTile(x, y, hex(PALETTE.DRIFTWOOD));
      ctx.fillStyle = hex(PALETTE.AMBER);
      ctx.fillRect(x + 6, y + 4, 4, 8);
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(x + 6, y + 4, 4, 1);
      ctx.fillRect(x + 6, y + 4, 1, 8);
      ctx.fillRect(x + 9, y + 4, 1, 8);
    });

    // 11 Tree trunk
    draw(11, (x, y) => {
      fillTile(x, y, hex(PALETTE.MOSS));
      ctx.fillStyle = hex(PALETTE.DRIFTWOOD);
      ctx.fillRect(x + 5, y, 6, TILE_SIZE);
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(x + 5, y, 1, TILE_SIZE);
      ctx.fillRect(x + 10, y, 1, TILE_SIZE);
    });

    // 12 Tree canopy
    draw(12, (x, y) => {
      fillTile(x, y, hex(PALETTE.PINE));
      ctx.fillStyle = hex(PALETTE.MOSS);
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      // Outline
      ctx.fillRect(x + 1, y, TILE_SIZE - 2, 1);
      ctx.fillRect(x + 1, y + TILE_SIZE - 1, TILE_SIZE - 2, 1);
      ctx.fillRect(x, y + 1, 1, TILE_SIZE - 2);
      ctx.fillRect(x + TILE_SIZE - 1, y + 1, 1, TILE_SIZE - 2);
    });

    // 13 Flowers
    draw(13, (x, y) => {
      fillTile(x, y, hex(PALETTE.MOSS));
      const cols = [PALETTE.CORAL, PALETTE.AMBER, PALETTE.HEATHER];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = hex(cols[i % cols.length]);
        const fx = x + 2 + Math.floor(Math.sin(i * 2.5) * 5 + 5);
        const fy = y + 2 + Math.floor(Math.cos(i * 3.1) * 5 + 5);
        ctx.fillRect(fx, fy, 2, 2);
      }
    });

    // 14 Fence
    draw(14, (x, y) => {
      fillTile(x, y, hex(PALETTE.MOSS));
      ctx.fillStyle = hex(PALETTE.DRIFTWOOD);
      ctx.fillRect(x + 3, y + 6, 10, 2);  // rail
      ctx.fillRect(x + 4, y + 3, 2, 10);  // post left
      ctx.fillRect(x + 10, y + 3, 2, 10); // post right
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(x + 4, y + 3, 2, 1);
      ctx.fillRect(x + 10, y + 3, 2, 1);
    });

    // 15 Lamp post
    draw(15, (x, y) => {
      fillTile(x, y, hex(PALETTE.MOSS));
      ctx.fillStyle = hex(PALETTE.PEBBLE);
      ctx.fillRect(x + 7, y + 4, 2, 12); // pole
      ctx.fillStyle = hex(PALETTE.AMBER);
      ctx.fillRect(x + 5, y + 1, 6, 4);  // lamp head
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(x + 5, y + 1, 6, 1);
      ctx.fillRect(x + 5, y + 1, 1, 4);
      ctx.fillRect(x + 10, y + 1, 1, 4);
    });

    canvas.refresh();

    // Add frame data so Phaser can address each tile by index
    const tex = this.textures.get('tileset');
    for (let i = 0; i < cols; i++) {
      tex.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Player spritesheet generator                                      */
  /*  Layout: 4 columns (walk frames) x 4 rows (down, left, right, up) */
  /*  Each frame is 16 x 24                                             */
  /* ------------------------------------------------------------------ */

  private generatePlayerSheet(): void {
    const fw = PLAYER_SPRITE_W;
    const fh = PLAYER_SPRITE_H;
    const cols = 4;
    const rows = 4;
    const canvas = this.textures.createCanvas('player', fw * cols, fh * rows)!;
    const ctx = canvas.context;

    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        const ox = frame * fw;
        const oy = dir * fh;
        this.drawPlayerFrame(ctx, ox, oy, dir, frame, hex);
      }
    }

    canvas.refresh();

    // Register as a spritesheet
    const tex = this.textures.get('player');
    let frameIndex = 0;
    for (let dir = 0; dir < rows; dir++) {
      for (let frame = 0; frame < cols; frame++) {
        tex.add(frameIndex, 0, frame * fw, dir * fh, fw, fh);
        frameIndex++;
      }
    }
  }

  private drawPlayerFrame(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    dir: number,
    frame: number,
    hex: (c: number) => string,
  ): void {
    // Leg offset for walk cycle
    const legSwing = [0, -1, 0, 1][frame];

    // 1. Outline (1px Midnight Ink around body shape)
    ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
    // Head outline
    ctx.fillRect(ox + 4, oy + 0, 8, 1);
    ctx.fillRect(ox + 3, oy + 1, 1, 7);
    ctx.fillRect(ox + 12, oy + 1, 1, 7);
    ctx.fillRect(ox + 4, oy + 8, 8, 1);
    // Body outline
    ctx.fillRect(ox + 3, oy + 8, 1, 8);
    ctx.fillRect(ox + 12, oy + 8, 1, 8);
    // Legs outline
    ctx.fillRect(ox + 4, oy + 16, 3, 1);
    ctx.fillRect(ox + 9, oy + 16, 3, 1);

    // 2. Hair (top of head)
    ctx.fillStyle = hex(PALETTE.DRIFTWOOD);
    ctx.fillRect(ox + 4, oy + 1, 8, 3);

    // 3. Skin (face)
    ctx.fillStyle = hex(PALETTE.FOG);
    ctx.fillRect(ox + 4, oy + 4, 8, 4);

    // 4. Eyes (only on front-facing / side)
    if (dir === 0) {
      // Facing down - two eyes
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(ox + 5, oy + 5, 2, 2);
      ctx.fillRect(ox + 9, oy + 5, 2, 2);
    } else if (dir === 1) {
      // Facing left - one eye on left
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(ox + 5, oy + 5, 2, 2);
    } else if (dir === 2) {
      // Facing right - one eye on right
      ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
      ctx.fillRect(ox + 9, oy + 5, 2, 2);
    }
    // Facing up (dir 3) - no eyes visible

    // 5. Shirt
    ctx.fillStyle = hex(PALETTE.MIST_BLUE);
    ctx.fillRect(ox + 4, oy + 8, 8, 8);

    // 6. Legs
    const leftLegY = oy + 16 + legSwing;
    const rightLegY = oy + 16 - legSwing;
    ctx.fillStyle = hex(PALETTE.TWILIGHT_BLUE);
    ctx.fillRect(ox + 4, Math.max(oy + 15, leftLegY), 3, 24 - Math.max(15, 16 + legSwing));
    ctx.fillRect(ox + 9, Math.max(oy + 15, rightLegY), 3, 24 - Math.max(15, 16 - legSwing));

    // Simplified: just draw fixed legs with slight offset
    ctx.fillStyle = hex(PALETTE.TWILIGHT_BLUE);
    ctx.fillRect(ox + 4, oy + 16, 3, 5 + legSwing);
    ctx.fillRect(ox + 9, oy + 16, 3, 5 - legSwing);

    // 7. Shoes
    ctx.fillStyle = hex(PALETTE.MIDNIGHT_INK);
    ctx.fillRect(ox + 4, oy + 21 + legSwing, 3, 2);
    ctx.fillRect(ox + 9, oy + 21 - legSwing, 3, 2);
  }
}

