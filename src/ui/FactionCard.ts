import Phaser from 'phaser';
import type { FactionDefinition } from '../model/FactionDefinition';
import { fighterById } from '../data/fighters';
import { COLORS, ROLE_LETTER, txt } from './theme';

export const FCARD_W = 254;
export const FCARD_H = 320;

/** Faction selection card: name, difficulty, playstyle, passive and fighter icons. */
export class FactionCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly strokeColor: number;
  readonly factionId: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    faction: FactionDefinition,
    onSelect: (id: string) => void
  ) {
    this.factionId = faction.id;
    this.strokeColor = faction.colorDark;
    this.bg = scene.add
      .rectangle(0, 0, FCARD_W, FCARD_H, COLORS.panelLight)
      .setOrigin(0)
      .setStrokeStyle(2, faction.colorDark)
      .setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => onSelect(faction.id));

    const items: Phaser.GameObjects.GameObject[] = [this.bg];
    items.push(scene.add.rectangle(0, 0, FCARD_W, 34, faction.colorDark).setOrigin(0));
    items.push(txt(scene, 8, 8, faction.name, 14).setFontStyle('bold'));
    items.push(
      txt(scene, FCARD_W - 8, 40, '★'.repeat(faction.difficultyStars) + '☆'.repeat(3 - faction.difficultyStars), 12, '#f0d080').setOrigin(1, 0)
    );
    items.push(txt(scene, 8, 40, 'Difficulty', 11, COLORS.textDim));
    items.push(txt(scene, 8, 62, faction.style, 11, '#c8d2e8', { wordWrap: { width: FCARD_W - 16 } }));
    items.push(txt(scene, 8, 100, `✓ ${faction.strengths}`, 11, COLORS.ok, { wordWrap: { width: FCARD_W - 16 } }));
    items.push(txt(scene, 8, 136, `✗ ${faction.weaknesses}`, 11, COLORS.danger, { wordWrap: { width: FCARD_W - 16 } }));
    items.push(txt(scene, 8, 172, `Passive: ${faction.passiveDesc}`, 11, '#b8c4de', { wordWrap: { width: FCARD_W - 16 } }));

    faction.fighterIds.forEach((fid, i) => {
      const def = fighterById(fid);
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = 42 + col * 86;
      const cy = 236 + row * 42;
      items.push(scene.add.circle(cx, cy, 13, faction.color).setStrokeStyle(1, 0xffffff, 0.5));
      items.push(txt(scene, cx, cy, ROLE_LETTER[def.role], 12, '#101319').setOrigin(0.5).setFontStyle('bold'));
      items.push(txt(scene, cx, cy + 16, `${def.tiers[0].cost}g`, 9, COLORS.textDim).setOrigin(0.5, 0));
    });

    this.container = scene.add.container(x, y, items);
  }

  setSelected(on: boolean): void {
    this.bg.setStrokeStyle(on ? 4 : 2, on ? 0xffffff : this.strokeColor);
  }
}
