import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PALETTE,
  PALETTE_CSS,
} from '../constants';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // Background gradient/fill (Dusk Indigo)
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.DUSK_INDIGO, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Lake reflection / bottom section
    bg.fillStyle(PALETTE.MIDNIGHT_INK, 0.9);
    bg.fillRect(0, GAME_HEIGHT * 0.7, GAME_WIDTH, GAME_HEIGHT * 0.3);

    // Water wave line
    bg.fillStyle(PALETTE.MIST_BLUE, 0.3);
    bg.fillRect(20, GAME_HEIGHT * 0.72, 80, 1);
    bg.fillRect(160, GAME_HEIGHT * 0.76, 110, 1);
    bg.fillRect(80, GAME_HEIGHT * 0.85, 90, 1);

    // Warm Lantern graphic (pulsing amber glow)
    const lanternGlow = this.add.graphics();
    lanternGlow.fillStyle(PALETTE.AMBER, 0.15);
    lanternGlow.fillCircle(cx, 44, 26);
    lanternGlow.fillStyle(PALETTE.AMBER, 0.3);
    lanternGlow.fillCircle(cx, 44, 16);
    lanternGlow.fillStyle(PALETTE.AMBER, 0.8);
    lanternGlow.fillCircle(cx, 44, 7);

    // Slow ambient breathing glow
    this.tweens.add({
      targets: lanternGlow,
      alpha: 0.6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title text: "Dusklight Hollow" (Sentence case per DESIGN.md 3)
    this.add.text(cx, 58, 'Dusklight Hollow', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: PALETTE_CSS.SNOW,
      align: 'center',
    }).setOrigin(0.5);

    // Tagline: "Slow down. Light the lantern."
    this.add.text(cx, 76, 'Slow down. Light the lantern.', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: PALETTE_CSS.FOG,
      align: 'center',
    }).setOrigin(0.5);

    // Primary action button: "Play as guest" (Amber fill, Midnight Ink text per DESIGN.md 5.2)
    const btnW = 120;
    const btnH = 22;
    const btnY = 114;

    const playBtnBg = this.add.graphics();
    playBtnBg.fillStyle(PALETTE.AMBER, 1);
    playBtnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
    // 1px border in Twilight Blue
    playBtnBg.lineStyle(1, PALETTE.TWILIGHT_BLUE, 1);
    playBtnBg.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);

    const playBtnText = this.add.text(cx, btnY, 'Play as guest', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: PALETTE_CSS.MIDNIGHT_INK,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Interactive button zone
    const playZone = this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    
    playZone.on('pointerover', () => {
      playBtnBg.clear();
      playBtnBg.fillStyle(PALETTE.AMBER, 1);
      playBtnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      playBtnBg.lineStyle(2, PALETTE.SNOW, 1);
      playBtnBg.strokeRect(cx - btnW / 2 - 1, btnY - btnH / 2 - 1, btnW + 2, btnH + 2);
    });

    playZone.on('pointerout', () => {
      playBtnBg.clear();
      playBtnBg.fillStyle(PALETTE.AMBER, 1);
      playBtnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      playBtnBg.lineStyle(1, PALETTE.TWILIGHT_BLUE, 1);
      playBtnBg.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
    });

    const startGame = () => {
      this.cameras.main.fade(300, 20, 23, 43, false, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.scene.start('GameScene');
        }
      });
    };

    playZone.on('pointerdown', startGame);

    // Keyboard shortcut to start: SPACE or ENTER
    if (this.input.keyboard) {
      this.input.keyboard.once('keydown-SPACE', startGame);
      this.input.keyboard.once('keydown-ENTER', startGame);
    }

    // Secondary sign in button / subtitle:
    // "Guests save on this device. Sign in to save anywhere."
    this.add.text(cx, 142, 'Press Space or Click to enter the village', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: PALETTE_CSS.PEBBLE,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, 162, 'Guests save on this device. Sign in to save anywhere.', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: PALETTE_CSS.PEBBLE,
      align: 'center',
    }).setOrigin(0.5);

    // Fade in scene from dark
    this.cameras.main.fadeIn(400, 20, 23, 43);
  }
}

