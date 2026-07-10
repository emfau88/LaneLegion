import Phaser from 'phaser';
import { HIT_EFFECT_SPRITES, SUPPORT_EFFECT_SPRITES } from '../assets/effectSprites';
import { FACTION_PREVIEWS } from '../assets/factionPreviews';
import { FIGHTER_SHEETS, fighterSheetAnimKey } from '../assets/fighterSheets';
import { HUD_ASSETS } from '../assets/hudAssets';
import { KING_SHEET, KING_SPRITE } from '../assets/kingSprites';
import laneArenaBoardUrl from '../assets/lane-arena-board.png';
import buttonFrameUrl from '../assets/menu/button-frame.png';
import mainMenuBgUrl from '../assets/menu/main-menu-bg.png';
import mainMenuBgV2Url from '../assets/menu/main-menu-bg-v2.png';
import titlePlateUrl from '../assets/menu/title-plate.png';
import { FIGHTER_SPRITES } from '../assets/unitSprites';
import { WAVE_SHEETS, waveSheetAnimKey } from '../assets/waveSheets';
import { WAVE_SPRITES } from '../assets/waveSprites';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('lane-arena-board', laneArenaBoardUrl);
    this.load.image('button-frame', buttonFrameUrl);
    this.load.image('main-menu-bg', mainMenuBgUrl);
    this.load.image('main-menu-bg-v2', mainMenuBgV2Url);
    this.load.image('title-plate', titlePlateUrl);
    for (const sprite of Object.values(HUD_ASSETS)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(FIGHTER_SPRITES)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(FACTION_PREVIEWS)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(FIGHTER_SHEETS)) {
      this.load.spritesheet(sprite.key, sprite.url, {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight
      });
    }
    this.load.spritesheet(KING_SHEET.key, KING_SHEET.url, {
      frameWidth: KING_SHEET.frameWidth,
      frameHeight: KING_SHEET.frameHeight
    });
    this.load.image(KING_SPRITE.key, KING_SPRITE.url);
    for (const sprite of Object.values(WAVE_SPRITES)) {
      this.load.image(sprite.key, sprite.url);
    }
    for (const sprite of Object.values(WAVE_SHEETS)) {
      this.load.spritesheet(sprite.key, sprite.url, {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight
      });
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
    for (const sheet of Object.values(WAVE_SHEETS)) {
      for (const [anim, config] of Object.entries(sheet.anims)) {
        const key = waveSheetAnimKey(sheet, anim as keyof typeof sheet.anims);
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet.key, { start: config.start, end: config.end }),
          frameRate: config.frameRate,
          repeat: config.repeat
        });
      }
    }
    for (const sheet of Object.values(FIGHTER_SHEETS)) {
      if (!sheet.anims) continue;
      for (const [anim, config] of Object.entries(sheet.anims)) {
        const key = fighterSheetAnimKey(sheet, anim as keyof typeof sheet.anims);
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet.key, { start: config.start, end: config.end }),
          frameRate: config.frameRate,
          repeat: config.repeat
        });
      }
    }
    this.scene.start('MainMenu');
  }
}
