import Phaser from 'phaser';
import arenaFloorUrl from '../../assets/arena/compact-arena-floor-p6.png';
import { HIT_EFFECT_SPRITES, SUPPORT_EFFECT_SPRITES } from '../../assets/effectSprites';
import { FIGHTER_SHEETS, fighterSheetAnimKey } from '../../assets/fighterSheets';
import { WAVE_SHEETS, waveSheetAnimKey } from '../../assets/waveSheets';
import { ARENA_UNIT_DEFINITIONS } from '../data/arenaUnits';

export class ArenaBootScene extends Phaser.Scene {
  constructor() {
    super('ArenaBoot');
  }

  preload(): void {
    this.load.image('compact-arena-floor-p1', arenaFloorUrl);
    for (const definition of ARENA_UNIT_DEFINITIONS) {
      if (definition.assetKind === 'fighter') {
        const sheet = FIGHTER_SHEETS[definition.assetId];
        this.load.spritesheet(sheet.key, sheet.url, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight
        });
      } else {
        const sheet = WAVE_SHEETS[definition.assetId];
        this.load.spritesheet(sheet.key, sheet.url, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight
        });
      }
    }
    for (const effect of Object.values(HIT_EFFECT_SPRITES)) this.load.image(effect.key, effect.url);
    for (const effect of Object.values(SUPPORT_EFFECT_SPRITES)) this.load.image(effect.key, effect.url);
  }

  create(): void {
    for (const definition of ARENA_UNIT_DEFINITIONS) {
      if (definition.assetKind === 'fighter') {
        const sheet = FIGHTER_SHEETS[definition.assetId];
        if (!sheet.anims) continue;
        for (const [name, config] of Object.entries(sheet.anims)) {
          const animName = name as keyof typeof sheet.anims;
          const key = fighterSheetAnimKey(sheet, animName);
          if (this.anims.exists(key)) continue;
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(sheet.key, { start: config.start, end: config.end }),
            frameRate: config.frameRate,
            repeat: config.repeat
          });
        }
      } else {
        const sheet = WAVE_SHEETS[definition.assetId];
        for (const [name, config] of Object.entries(sheet.anims)) {
          const animName = name as keyof typeof sheet.anims;
          const key = waveSheetAnimKey(sheet, animName);
          if (this.anims.exists(key)) continue;
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(sheet.key, { start: config.start, end: config.end }),
            frameRate: config.frameRate,
            repeat: config.repeat
          });
        }
      }
    }
    this.scene.start('CompactArena');
  }
}
