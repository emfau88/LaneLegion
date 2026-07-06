import Phaser from 'phaser';
import { HIT_EFFECT_SPRITES, SUPPORT_EFFECT_SPRITES } from '../assets/effectSprites';
import { FIGHTER_SHEETS } from '../assets/fighterSheets';
import laneArenaBoardUrl from '../assets/lane-arena-board.png';
import { FIGHTER_SPRITES } from '../assets/unitSprites';
import { WAVE_SPRITES } from '../assets/waveSprites';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('lane-arena-board', laneArenaBoardUrl);
    for (const sprite of Object.values(FIGHTER_SPRITES)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(FIGHTER_SHEETS)) {
      this.load.spritesheet(sprite.key, sprite.url, {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight
      });
    }
    for (const sprite of Object.values(WAVE_SPRITES)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(HIT_EFFECT_SPRITES)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(SUPPORT_EFFECT_SPRITES)) {
      this.load.image(sprite.key, sprite.url);
    }
  }

  create(): void {
    this.input.topOnly = true;
    this.scene.start('MainMenu');
  }
}
