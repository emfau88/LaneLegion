import Phaser from 'phaser';
import { FACTIONS } from '../data/factions';
import type { GameSetup } from '../model/GameState';
import type { Difficulty, GameMode } from '../model/Types';
import { FactionCard } from '../ui/FactionCard';
import { COLORS, txt, UIButton } from '../ui/theme';
import { L } from '../ui/layout';

interface SelectData {
  mode: GameMode;
  difficulty: Difficulty;
}

export class FactionSelectScene extends Phaser.Scene {
  private mode: GameMode = '1v1';
  private difficulty: Difficulty = 'normal';
  private selected: string | null = null;
  private cards: FactionCard[] = [];
  private startBtn!: UIButton;

  constructor() {
    super('FactionSelect');
  }

  init(data: Partial<SelectData>): void {
    this.mode = data.mode ?? '1v1';
    this.difficulty = data.difficulty ?? 'normal';
    this.selected = null;
    this.cards = [];
  }

  create(): void {
    txt(this, L.width / 2, 28, 'Choose Your Faction', 22).setOrigin(0.5).setFontStyle('bold');
    txt(this, L.width / 2, 56, `${this.mode} • ${this.difficulty} AI`, 12, COLORS.textDim).setOrigin(0.5);

    const positions = [
      { x: 10, y: 80 },
      { x: 276, y: 80 },
      { x: 10, y: 412 },
      { x: 276, y: 412 }
    ];
    FACTIONS.forEach((faction, i) => {
      const card = new FactionCard(this, positions[i].x, positions[i].y, faction, (id) => {
        this.selected = id;
        for (const c of this.cards) c.setSelected(c.factionId === id);
        this.startBtn.setEnabled(true);
      });
      this.cards.push(card);
    });

    new UIButton(this, 80, 900, 130, 44, '◀ Back', 14, () => {
      this.scene.start('MainMenu');
    });
    this.startBtn = new UIButton(this, 360, 900, 260, 52, 'START MATCH', 18, () => {
      if (!this.selected) return;
      const setup: GameSetup = {
        mode: this.mode,
        difficulty: this.difficulty,
        playerFactionId: this.selected,
        seed: (Date.now() % 2147483647) | 0
      };
      this.scene.start('Game', setup);
    }, 0x2f6b3a);
    this.startBtn.setEnabled(false);
  }
}
