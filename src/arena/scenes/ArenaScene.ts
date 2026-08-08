import Phaser from 'phaser';
import { sfx } from '../../audio/sfx';
import { HIT_EFFECT_SPRITES, SUPPORT_EFFECT_SPRITES } from '../../assets/effectSprites';
import {
  FIGHTER_SHEETS,
  fighterSheetAnimKey,
  fighterSheetFrame
} from '../../assets/fighterSheets';
import { WAVE_SHEETS, waveSheetAnimKey } from '../../assets/waveSheets';
import { arenaEncounter } from '../data/arenaEncounters';
import { arenaUnitById } from '../data/arenaUnits';
import {
  createArenaBattle
} from '../model/createArenaBattle';
import {
  advanceArenaRun,
  arenaRunPlacements,
  benchArenaFighter,
  buyArenaOffer,
  canBuyArenaOffer,
  cloneArenaRun,
  createArenaRun,
  deployArenaFighter,
  deployedFighters,
  MAX_DEPLOYED_FIGHTERS,
  MAX_RESERVE_FIGHTERS,
  REROLL_COST,
  rerollArenaShop,
  reserveFighters,
  resetArenaFormation,
  upgradeArenaFighter
} from '../model/ArenaRunSystem';
import {
  ARENA_COLS,
  ARENA_ROWS,
  PLAYER_FIRST_ROW,
  type ArenaBattleEvent,
  type ArenaBattleState,
  type ArenaCell,
  type ArenaPoint,
  type ArenaRunState,
  type ArenaUnitState
} from '../model/ArenaTypes';
import { drainArenaEvents, startArenaBattle, tickArenaBattle } from '../systems/ArenaBattleSystem';
import {
  ARENA_COLORS,
  arenaButton,
  arenaPanel,
  arenaText,
  arenaTitle,
  type ArenaButton
} from '../ui/ArenaTheme';

const ART_X = 8;
const ART_Y = 72;
const ART_W = 884;
const ART_H = 530;
const BOARD_X = 126;
const BOARD_Y = 110;
const CELL_W = 93;
const CELL_H = 68;
const BOARD_W = ARENA_COLS * CELL_W;
const BOARD_H = ARENA_ROWS * CELL_H;
const SIDEBAR_X = 904;
const SIDEBAR_W = 364;
const ROSTER_Y = 600;
const FIXED_STEP = 1 / 30;

interface UnitView {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  selection: Phaser.GameObjects.Ellipse;
  activity: ArenaUnitState['activity'];
  animationLockUntil: number;
  deathStarted: boolean;
}

interface ArenaSceneData {
  run?: ArenaRunState;
  autoStart?: boolean;
}

export class ArenaScene extends Phaser.Scene {
  private state!: ArenaBattleState;
  private run = createArenaRun();
  private autoStart = false;
  private views = new Map<number, UnitView>();
  private selectedFighterId: number | null = null;
  private draggingUnitId: number | null = null;
  private accumulator = 0;
  private startButton!: ArenaButton;
  private speedButton!: ArenaButton;
  private phaseLabel!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;
  private coreLabel!: Phaser.GameObjects.Text;
  private goldLabel!: Phaser.GameObjects.Text;
  private coreFill!: Phaser.GameObjects.Rectangle;
  private coreGlow!: Phaser.GameObjects.Ellipse;
  private detailPanel?: Phaser.GameObjects.Container;
  private sidebarContent?: Phaser.GameObjects.Container;
  private sidebarMode: 'shop' | 'fighter' = 'shop';
  private resultOverlay?: Phaser.GameObjects.Container;
  private cellHits: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('CompactArena');
  }

  init(data: ArenaSceneData): void {
    this.run = data.run ? cloneArenaRun(data.run) : createArenaRun();
    this.autoStart = data.autoStart ?? false;
  }

  create(): void {
    this.input.topOnly = true;
    this.state = createArenaBattle(arenaRunPlacements(this.run), this.run.fightIndex);
    this.views.clear();
    this.cellHits = [];
    this.accumulator = 0;
    this.selectedFighterId = null;
    this.draggingUnitId = null;
    this.resultOverlay = undefined;
    this.sidebarMode = 'shop';

    this.drawBackdrop();
    this.drawTopBar();
    this.drawBoard();
    this.drawLeftPanel();
    this.drawCore();
    this.drawRightPanel();
    this.drawRoster();
    for (const unit of this.state.units) this.createUnitView(unit);

    const firstFighter = this.run.fighters[0];
    if (firstFighter) this.selectFighter(firstFighter.id, false);

    this.input.keyboard?.on('keydown-SPACE', () => this.beginBattle());
    this.input.keyboard?.on('keydown-ONE', () => this.setSpeed(1));
    this.input.keyboard?.on('keydown-TWO', () => this.setSpeed(2));

    if (this.autoStart) this.time.delayedCall(80, () => this.beginBattle());
  }

  private drawBackdrop(): void {
    this.cameras.main.setBackgroundColor(ARENA_COLORS.bg);
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x15120f, 0x101319, 0x07090c, 0x07090c, 1);
    graphics.fillRect(0, 0, 1280, 720);
    graphics.fillStyle(0xd9b35e, 0.045);
    for (let i = 0; i < 30; i++) {
      const x = (i * 83 + 47) % 1280;
      const y = (i * 137 + 31) % 720;
      graphics.fillCircle(x, y, i % 4 === 0 ? 1.5 : 1);
    }
    graphics.fillStyle(0x000000, 0.32).fillRect(0, 690, 1280, 30);
  }

  private drawTopBar(): void {
    arenaPanel(this, 8, 8, 1260, 56, ARENA_COLORS.brassLight);
    arenaButton(this, 52, 36, 76, 32, 'MENU', () => {
      window.location.assign('./index.html');
    }, 0x7184a6);
    arenaTitle(this, 101, 16, 'LANE LEGION', 22);
    arenaText(this, 103, 43, 'COMPACT ARENA', 9, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(2);

    this.phaseLabel = arenaTitle(this, 420, 15, `FIGHT ${this.run.fightIndex + 1} / 4`, 18, ARENA_COLORS.text);
    this.timerLabel = arenaText(this, 422, 42, 'PLAN YOUR FORMATION', 10, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(1);

    this.add.circle(741, 35, 13, 0x5d3d13, 1).setStrokeStyle(2, ARENA_COLORS.brassLight, 0.9);
    arenaText(this, 741, 34, 'G', 11, ARENA_COLORS.gold).setOrigin(0.5).setFontStyle('bold');
    arenaText(this, 764, 16, 'GOLD', 9, ARENA_COLORS.muted).setFontStyle('bold');
    this.goldLabel = arenaTitle(this, 764, 28, `${this.run.gold}`, 21);

    this.coreLabel = arenaText(this, 848, 14, 'CORE 100 / 100', 10, '#b9dff5').setFontStyle('bold');
    this.add.rectangle(848, 43, 188, 12, 0x050709, 1).setOrigin(0, 0.5).setStrokeStyle(2, 0x6e5531, 0.9);
    this.coreFill = this.add.rectangle(851, 43, 182, 6, 0x51b9d8, 1).setOrigin(0, 0.5);

    this.speedButton = arenaButton(this, 1190, 36, 132, 34, 'SPEED 1x', () => {
      this.setSpeed(this.state.speed === 1 ? 2 : 1);
    }, 0x79a8e8);
  }

  private drawLeftPanel(): void {
    arenaPanel(this, 18, 104, 108, 190, 0xb8883c, 0.94).setDepth(80);
    arenaTitle(this, 72, 120, 'OATHS', 14).setOrigin(0.5).setDepth(81);
    this.add.line(72, 145, -38, 0, 38, 0, 0x8e6a34, 0.8).setDepth(81);
    this.add.star(36, 169, 5, 5, 10, 0xe0bd6a, 1).setDepth(81);
    arenaText(this, 52, 155, 'WIN THE\nFIGHT', 11, ARENA_COLORS.text).setFontStyle('bold').setDepth(81);
    arenaText(this, 52, 184, `+${arenaEncounter(this.run.fightIndex).reward} GOLD`, 9, ARENA_COLORS.gold).setDepth(81);
    this.add.star(36, 219, 5, 5, 10, 0x6fbbe8, 1).setDepth(81);
    arenaText(this, 52, 205, 'PROTECT\nTHE CORE', 11, '#d7ecf7').setFontStyle('bold').setDepth(81);
    const reset = arenaButton(this, 72, 269, 82, 30, 'RESET', () => {
      if (this.state.phase === 'planning') {
        const run = cloneArenaRun(this.run);
        resetArenaFormation(run);
        this.scene.restart({ run });
      }
    }, 0x7184a6);
    reset.root.setDepth(82);

    const hint = arenaText(this, 22, 540, 'SELECT OR DRAG A FIGHTER', 9, '#bdcbd3')
      .setFontStyle('bold')
      .setLetterSpacing(1)
      .setShadow(0, 2, '#000000', 3)
      .setDepth(82);
    hint.setAlpha(0.88);
  }

  private drawBoard(): void {
    this.add.image(ART_X + ART_W / 2, ART_Y + ART_H / 2, 'compact-arena-floor-p1')
      .setDisplaySize(ART_W, ART_H)
      .setDepth(1);

    for (let row = 0; row < ARENA_ROWS; row++) {
      for (let col = 0; col < ARENA_COLS; col++) {
        const isPlayerSide = row >= PLAYER_FIRST_ROW;
        const x = BOARD_X + col * CELL_W;
        const y = BOARD_Y + row * CELL_H;
        const hit = this.add
          .rectangle(x + CELL_W / 2, y + CELL_H / 2, CELL_W - 7, CELL_H - 5, isPlayerSide ? 0x4aa7ed : 0xcf574c, 0.015)
          .setDepth(8)
          .setInteractive({ useHandCursor: isPlayerSide });
        hit.setData('cell', { col, row } satisfies ArenaCell);
        hit.on('pointerover', () => {
          if (isPlayerSide && this.state.phase === 'planning') {
            hit.setFillStyle(0x59baf7, 0.14).setStrokeStyle(2, 0x9ddcff, 0.92);
          }
        });
        hit.on('pointerout', () => hit.setFillStyle(isPlayerSide ? 0x4aa7ed : 0xcf574c, 0.015).setStrokeStyle());
        hit.on('pointerdown', () => {
          if (isPlayerSide) this.placeSelectedAt({ col, row });
        });
        this.cellHits.push(hit);
      }
    }

    this.add.rectangle(BOARD_X, BOARD_Y + PLAYER_FIRST_ROW * CELL_H - 2, BOARD_W, 3, 0xd4ad5b, 0.78).setOrigin(0).setDepth(9);
    arenaText(this, BOARD_X + 10, BOARD_Y + 6, 'ENEMY GROUND', 9, '#d9988f').setFontStyle('bold').setLetterSpacing(1).setShadow(0, 2, '#000000', 3).setDepth(10);
    arenaText(this, BOARD_X + 10, BOARD_Y + PLAYER_FIRST_ROW * CELL_H + 6, 'YOUR FORMATION', 9, '#8fcff4').setFontStyle('bold').setLetterSpacing(1).setShadow(0, 2, '#000000', 3).setDepth(10);
  }

  private drawCore(): void {
    const x = ART_X + ART_W / 2;
    const y = 548;
    this.coreGlow = this.add.ellipse(x, y - 5, 178, 52, 0x42bfff, 0.2).setDepth(12);
    const graphics = this.add.graphics().setDepth(8);
    graphics.fillStyle(0x080b0e, 0.96).fillCircle(x, y, 50);
    graphics.lineStyle(8, 0x302619, 1).strokeCircle(x, y, 46);
    graphics.lineStyle(3, 0xb98638, 0.95).strokeCircle(x, y, 42);
    graphics.lineStyle(1, 0xecd17e, 0.65).strokeCircle(x, y, 34);
    graphics.fillStyle(0x112b3c, 1);
    graphics.beginPath().moveTo(x, y - 74).lineTo(x + 28, y - 34).lineTo(x + 13, y + 4).lineTo(x - 13, y + 4).lineTo(x - 28, y - 34).closePath().fillPath();
    graphics.lineStyle(2, 0xbbeeff, 0.95);
    graphics.beginPath().moveTo(x, y - 74).lineTo(x + 28, y - 34).lineTo(x + 13, y + 4).lineTo(x - 13, y + 4).lineTo(x - 28, y - 34).closePath().strokePath();
    graphics.fillStyle(0x45c9ff, 0.9).fillTriangle(x, y - 70, x, y - 2, x - 24, y - 34);
    graphics.fillStyle(0x166ca9, 0.94).fillTriangle(x, y - 70, x + 25, y - 34, x, y - 2);
    graphics.fillStyle(0xb8f2ff, 0.75).fillTriangle(x - 3, y - 63, x - 3, y - 12, x - 16, y - 35);
    arenaTitle(this, x, y + 20, 'CORE', 12, '#d8f4ff').setOrigin(0.5).setDepth(14);
    this.tweens.add({ targets: this.coreGlow, alpha: 0.36, scaleX: 1.08, scaleY: 1.12, duration: 1250, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private drawRightPanel(): void {
    const x = SIDEBAR_X;
    const encounter = arenaEncounter(this.run.fightIndex);
    arenaPanel(this, x, ART_Y, SIDEBAR_W, 638, ARENA_COLORS.brassLight);
    this.add.rectangle(x + 12, 84, SIDEBAR_W - 24, 48, encounter.boss ? 0x601f1b : 0x4a211c, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0xc16f42, 0.75);
    arenaTitle(this, x + SIDEBAR_W / 2, 91, encounter.boss ? 'BOSS FIGHT' : encounter.name, 19, encounter.boss ? '#ffad86' : ARENA_COLORS.gold).setOrigin(0.5, 0);
    arenaText(this, x + SIDEBAR_W / 2, 116, `${encounter.reward} GOLD REWARD`, 9, '#d9b986').setOrigin(0.5).setFontStyle('bold').setLetterSpacing(1);

    arenaText(this, x + 18, 145, 'ENEMY WARBAND', 10, '#d98f83').setFontStyle('bold').setLetterSpacing(1);
    this.add.rectangle(x + 14, 164, SIDEBAR_W - 28, 67, 0x090b0e, 0.82)
      .setOrigin(0)
      .setStrokeStyle(1, 0x713a30, 0.65);
    const preview = encounter.enemyPlacements.slice(0, 5);
    preview.forEach((placement, index) => {
      const px = x + 42 + index * 68;
      this.add.ellipse(px, 213, 54, 16, 0x000000, 0.55);
      this.addUnitPortrait(placement.definitionId, px, 194, 60);
    });
    encounter.summary.forEach((entry, index) => {
      const chipX = x + 14 + index * 112;
      this.add.rectangle(chipX, 238, 106, 28, entry.warning ? 0x3c2515 : 0x241a18, 0.98)
        .setOrigin(0)
        .setStrokeStyle(1, entry.warning ? 0xb97834 : 0x754238, 0.8);
      arenaText(this, chipX + 53, 252, entry.label, 8, entry.warning ? '#f0bd7b' : '#e9b0a8')
        .setOrigin(0.5)
        .setFontStyle('bold');
    });

    arenaButton(this, x + 94, 289, 160, 34, 'SHOP', () => {
      if (this.state.phase !== 'planning') return;
      this.sidebarMode = 'shop';
      this.refreshSidebar();
    }, 0xe2b861);
    arenaButton(this, x + 270, 289, 160, 34, 'FIGHTER', () => {
      if (this.state.phase !== 'planning') return;
      this.sidebarMode = 'fighter';
      this.refreshSidebar();
    }, 0x79a8e8);
    this.detailPanel = this.add.container(x + 14, 314);
    this.sidebarContent = this.detailPanel;
    this.refreshSidebar();

    this.startButton = arenaButton(this, x + SIDEBAR_W / 2, 678, SIDEBAR_W - 30, 50, 'START BATTLE', () => this.beginBattle(), 0xe2b861);
    this.startButton.setEnabled(deployedFighters(this.run).length > 0);
  }

  private addUnitPortrait(definitionId: string, x: number, y: number, size: number): Phaser.GameObjects.Sprite {
    const definition = arenaUnitById(definitionId);
    const sheet = definition.assetKind === 'fighter'
      ? FIGHTER_SHEETS[definition.assetId]
      : WAVE_SHEETS[definition.assetId];
    const sprite = this.add.sprite(x, y, sheet.key, 0).setDisplaySize(size, size);
    if (definition.assetKind === 'fighter') {
      sprite.setFrame(fighterSheetFrame(FIGHTER_SHEETS[definition.assetId], 'idle'));
    }
    return sprite;
  }

  private drawRoster(): void {
    arenaPanel(this, 8, ROSTER_Y, ART_W, 112, 0x9d783d);
    arenaTitle(this, 22, ROSTER_Y + 7, 'ROSTER', 13);
    arenaText(
      this,
      126,
      ROSTER_Y + 10,
      `${deployedFighters(this.run).length}/${MAX_DEPLOYED_FIGHTERS} FIELD  •  ${reserveFighters(this.run).length}/${MAX_RESERVE_FIGHTERS} RESERVE`,
      9,
      '#b7c9cf'
    ).setFontStyle('bold').setLetterSpacing(1);
    this.run.fighters.forEach((fighter, index) => {
      const definition = arenaUnitById(fighter.definitionId);
      const x = 20 + index * 108;
      const y = ROSTER_Y + 30;
      const reserve = fighter.cell === null;
      const selected = fighter.id === this.selectedFighterId;
      const card = this.add.rectangle(x, y, 100, 72, reserve ? 0x211922 : 0x111c22, 1).setOrigin(0)
        .setStrokeStyle(selected ? 3 : 1, selected ? 0xf1cc76 : reserve ? 0x8d638d : 0x477a9c, selected ? 1 : 0.9);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        this.selectFighter(fighter.id);
      });
      this.add.rectangle(x + 2, y + 51, 96, 19, 0x07090b, 0.9).setOrigin(0);
      const portrait = this.addUnitPortrait(fighter.definitionId, x + 50, y + 31, 64);
      portrait.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectFighter(fighter.id));
      arenaText(this, x + 50, y + 55, definition.name.toUpperCase(), 8, ARENA_COLORS.text).setOrigin(0.5).setFontStyle('bold');
      this.add.rectangle(x + 76, y + 5, 20, 14, reserve ? 0x633a68 : 0x235a4b, 0.95).setOrigin(0);
      arenaText(this, x + 86, y + 12, reserve ? 'R' : 'F', 8, reserve ? '#e0b4e4' : '#9ff0c9').setOrigin(0.5).setFontStyle('bold');
      if (fighter.tier === 1) {
        arenaText(this, x + 6, y + 4, '★', 13, ARENA_COLORS.gold).setFontStyle('bold');
      }
    });
  }

  private refreshSidebar(): void {
    if (!this.sidebarContent) return;
    this.sidebarContent.removeAll(true);
    if (this.state.phase !== 'planning') return;
    if (this.sidebarMode === 'shop') this.renderShopSidebar();
    else this.renderFighterSidebar();
  }

  private renderShopSidebar(): void {
    if (!this.sidebarContent) return;
    const nodes: Phaser.GameObjects.GameObject[] = [];
    nodes.push(arenaText(this, 0, 0, 'CHOOSE YOUR REINFORCEMENT', 10, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(1));
    this.run.shopOffers.forEach((offer, index) => {
      const definition = arenaUnitById(offer.definitionId);
      const x = index * 110;
      const frame = arenaPanel(this, x, 23, 104, 184, definition.role === 'support' ? 0x508f69 : definition.role === 'aoe' ? 0xa36335 : 0x637da0, 0.98);
      const portrait = this.addUnitPortrait(offer.definitionId, x + 52, 68, 76);
      const title = arenaText(this, x + 52, 108, definition.name.toUpperCase(), 10, ARENA_COLORS.text)
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(94)
        .setFontStyle('bold');
      const meta = arenaText(this, x + 52, 137, definition.role.toUpperCase(), 8, '#9ab6c1').setOrigin(0.5).setFontStyle('bold');
      const cost = arenaTitle(this, x + 52, 147, `${offer.cost} GOLD`, 12, ARENA_COLORS.gold).setOrigin(0.5, 0);
      const buy = arenaButton(this, x + 52, 187, 84, 28, 'RECRUIT', () => {
        const run = cloneArenaRun(this.run);
        if (buyArenaOffer(run, offer.id)) this.scene.restart({ run });
      }, 0x7bd9a7);
      buy.setEnabled(canBuyArenaOffer(this.run, offer.id));
      nodes.push(frame, portrait, title, meta, cost, buy.root);
    });
    if (this.run.shopOffers.length === 0) {
      nodes.push(arenaTitle(this, 168, 92, 'THE MARKET IS EMPTY', 15, ARENA_COLORS.muted).setOrigin(0.5));
    }
    const reroll = arenaButton(this, 168, 231, 330, 34, `REROLL  •  ${REROLL_COST} GOLD`, () => {
      const run = cloneArenaRun(this.run);
      if (rerollArenaShop(run)) this.scene.restart({ run });
    }, 0x79a8e8);
    reroll.setEnabled(this.run.rerollsLeft > 0 && this.run.gold >= REROLL_COST);
    nodes.push(reroll.root);
    nodes.push(arenaText(
      this,
      0,
      254,
      this.run.rerollsLeft > 0 ? 'One reroll remains this fight.' : 'Reroll used for this fight.',
      10,
      ARENA_COLORS.muted
    ));
    this.sidebarContent.add(nodes);
  }

  private renderFighterSidebar(): void {
    if (!this.sidebarContent) return;
    const fighter = this.run.fighters.find((candidate) => candidate.id === this.selectedFighterId) ?? this.run.fighters[0];
    if (!fighter) return;
    const definition = arenaUnitById(fighter.definitionId);
    const upgrade = definition.upgradePaths?.[0];
    const unit = this.state.units.find((candidate) => candidate.rosterId === fighter.id);
    const hp = unit?.maxHp ?? definition.hp * (fighter.tier === 1 ? upgrade?.hpMultiplier ?? 1 : 1);
    const damage = unit?.combat.damage ?? definition.damage * (fighter.tier === 1 ? upgrade?.damageMultiplier ?? 1 : 1);
    const portraitFrame = arenaPanel(this, 0, 20, 98, 98, fighter.tier === 1 ? ARENA_COLORS.brassLight : 0x52799a, 0.98);
    const portrait = this.addUnitPortrait(fighter.definitionId, 49, 69, 88);
    const nodes: Phaser.GameObjects.GameObject[] = [portraitFrame, portrait];
    nodes.push(arenaTitle(this, 112, 22, definition.name.toUpperCase(), 18, ARENA_COLORS.text).setWordWrapWidth(210));
    nodes.push(arenaText(this, 112, 49, `${definition.role.toUpperCase()}  •  ${fighter.tier === 1 ? 'TIER II' : 'TIER I'}`, 10, fighter.tier === 1 ? ARENA_COLORS.gold : '#86c9ff').setFontStyle('bold'));
    nodes.push(arenaText(this, 112, 73, definition.blurb, 11, '#d7c49e').setFontStyle('italic').setWordWrapWidth(214));
    [
      { label: 'HP', value: Math.round(hp) },
      { label: 'DMG', value: Math.round(damage) },
      { label: 'RANGE', value: definition.range.toFixed(1) }
    ].forEach((stat, index) => {
      const x = index * 112;
      const box = this.add.rectangle(x, 130, 104, 34, 0x0b1014, 0.94).setOrigin(0).setStrokeStyle(1, 0x4d6572, 0.7);
      nodes.push(box);
      nodes.push(arenaText(this, x + 8, 137, stat.label, 8, ARENA_COLORS.muted).setFontStyle('bold'));
      nodes.push(arenaTitle(this, x + 96, 134, `${stat.value}`, 13, '#d7ebf4').setOrigin(1, 0));
    });
    if (upgrade) {
      const box = this.add.rectangle(0, 174, 328, 66, 0x17130f, 0.98).setOrigin(0).setStrokeStyle(1, fighter.tier === 1 ? 0xd3b85f : 0x76613d, 0.85);
      nodes.push(box);
      nodes.push(arenaTitle(this, 12, 182, fighter.tier === 1 ? `${upgrade.name} • OWNED` : upgrade.name, 13, fighter.tier === 1 ? ARENA_COLORS.gold : ARENA_COLORS.text));
      nodes.push(arenaText(this, 12, 207, upgrade.blurb, 10, ARENA_COLORS.muted));
      if (fighter.tier === 0) {
        const upgradeButton = arenaButton(this, 80, 263, 152, 34, `UPGRADE • ${upgrade.cost}`, () => {
          const run = cloneArenaRun(this.run);
          if (upgradeArenaFighter(run, fighter.id)) this.scene.restart({ run });
        }, 0xe2b861);
        upgradeButton.setEnabled(this.run.gold >= upgrade.cost);
        nodes.push(upgradeButton.root);
      }
    }
    if (fighter.cell) {
      const bench = arenaButton(this, 248, 263, 152, 34, 'TO RESERVE', () => {
        const run = cloneArenaRun(this.run);
        if (benchArenaFighter(run, fighter.id)) this.scene.restart({ run });
      }, 0xa479c1);
      bench.setEnabled(reserveFighters(this.run).length < MAX_RESERVE_FIGHTERS && deployedFighters(this.run).length > 1);
      nodes.push(bench.root);
    } else {
      nodes.push(arenaText(this, 168, 250, 'SELECTED RESERVE\nClick an empty blue cell.', 10, '#d6a9d6').setAlign('center'));
    }
    nodes.push(arenaText(this, 0, 292, this.unitAdvice(definition.id), 10, ARENA_COLORS.muted).setWordWrapWidth(328));
    this.sidebarContent.add(nodes);
  }

  private createUnitView(unit: ArenaUnitState): void {
    const definition = arenaUnitById(unit.definitionId);
    const teamColor = unit.team === 'player' ? ARENA_COLORS.player : ARENA_COLORS.enemy;
    const shadow = this.add.ellipse(0, 19, definition.role === 'tank' ? 62 : 52, 17, 0x000000, 0.48);
    const selection = this.add.ellipse(0, 17, definition.role === 'tank' ? 68 : 58, 25, 0xffdc78, 0.1)
      .setStrokeStyle(2, 0xffdc78, 0.9)
      .setVisible(false);
    const ring = this.add.ellipse(0, 17, definition.role === 'tank' ? 62 : 54, 22, teamColor, 0.13)
      .setStrokeStyle(2, teamColor, 0.75);

    const sheet = definition.assetKind === 'fighter'
      ? FIGHTER_SHEETS[definition.assetId]
      : WAVE_SHEETS[definition.assetId];
    const sprite = this.add.sprite(0, -6, sheet.key, 0);
    const size = definition.role === 'tank' ? 88 : definition.role === 'fast' ? 76 : 82;
    sprite.setDisplaySize(size, size);
    if (definition.assetKind === 'fighter') {
      sprite.setFrame(fighterSheetFrame(FIGHTER_SHEETS[definition.assetId], 'idle'));
    }
    const hpBar = this.add.graphics();
    const name = arenaText(this, 0, 35, definition.name, 9, unit.team === 'player' ? '#d9efff' : '#ffd9dc')
      .setOrigin(0.5)
      .setFontStyle('bold')
      .setShadow(0, 1, '#000000', 2);
    const root = this.add.container(0, 0, [shadow, selection, ring, sprite, hpBar, name]);
    root.setSize(CELL_W * 0.78, CELL_H * 1.05);
    const screen = this.logicalToScreen(unit.pos);
    root.setPosition(screen.x, screen.y).setDepth(20 + screen.y);
    root.setInteractive({ useHandCursor: unit.team === 'player' });

    const view: UnitView = {
      root,
      sprite,
      hpBar,
      selection,
      activity: 'idle',
      animationLockUntil: 0,
      deathStarted: false
    };
    this.views.set(unit.id, view);

    root.on('pointerdown', () => {
      if (unit.team === 'player' && unit.rosterId !== null) this.selectFighter(unit.rosterId);
    });
    if (unit.team === 'player') {
      this.input.setDraggable(root);
      root.on('dragstart', () => {
        if (this.state.phase !== 'planning') return;
        this.draggingUnitId = unit.id;
        if (unit.rosterId !== null) this.selectFighter(unit.rosterId);
        root.setAlpha(0.82).setDepth(250);
      });
      root.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.state.phase !== 'planning' || this.draggingUnitId !== unit.id) return;
        root.setPosition(
          Phaser.Math.Clamp(dragX, BOARD_X + CELL_W / 2, BOARD_X + BOARD_W - CELL_W / 2),
          Phaser.Math.Clamp(dragY, BOARD_Y + PLAYER_FIRST_ROW * CELL_H + CELL_H / 2, BOARD_Y + BOARD_H - CELL_H / 2)
        );
      });
      root.on('dragend', () => {
        if (this.draggingUnitId !== unit.id) return;
        const cell = this.screenToCell(root.x, root.y);
        this.draggingUnitId = null;
        root.setAlpha(1);
        if (!cell || !this.tryMoveUnit(unit, cell)) this.snapViewToUnit(unit);
      });
    }
    this.drawUnitHp(unit, view);
  }

  private logicalToScreen(point: ArenaPoint): ArenaPoint {
    return { x: BOARD_X + point.x * CELL_W, y: BOARD_Y + point.y * CELL_H };
  }

  private screenToCell(x: number, y: number): ArenaCell | null {
    const col = Math.floor((x - BOARD_X) / CELL_W);
    const row = Math.floor((y - BOARD_Y) / CELL_H);
    if (col < 0 || col >= ARENA_COLS || row < PLAYER_FIRST_ROW || row >= ARENA_ROWS) return null;
    return { col, row };
  }

  private placeSelectedAt(cell: ArenaCell): void {
    if (this.state.phase !== 'planning' || this.draggingUnitId !== null || this.selectedFighterId === null) return;
    const fighter = this.run.fighters.find((candidate) => candidate.id === this.selectedFighterId);
    if (!fighter) return;
    if (fighter.cell === null) {
      const run = cloneArenaRun(this.run);
      if (deployArenaFighter(run, fighter.id, cell)) {
        sfx.play('place');
        this.scene.restart({ run });
      } else {
        this.flashCell(cell, 0xff6d75);
      }
      return;
    }
    const unit = this.state.units.find((candidate) => candidate.rosterId === fighter.id);
    if (unit) this.tryMoveUnit(unit, cell);
  }

  private tryMoveUnit(unit: ArenaUnitState, cell: ArenaCell): boolean {
    if (unit.team !== 'player' || this.state.phase !== 'planning' || cell.row < PLAYER_FIRST_ROW) return false;
    const occupied = this.state.units.some(
      (candidate) => candidate.id !== unit.id && candidate.team === 'player' && candidate.cell.col === cell.col && candidate.cell.row === cell.row
    );
    if (occupied) {
      this.flashCell(cell, 0xff6d75);
      return false;
    }
    unit.cell = { ...cell };
    unit.pos = { x: cell.col + 0.5, y: cell.row + 0.5 };
    const fighter = this.run.fighters.find((candidate) => candidate.id === unit.rosterId);
    if (fighter) fighter.cell = { ...cell };
    this.snapViewToUnit(unit);
    this.flashCell(cell, 0x6dbbff);
    sfx.play('place');
    return true;
  }

  private snapViewToUnit(unit: ArenaUnitState): void {
    const view = this.views.get(unit.id);
    if (!view) return;
    const screen = this.logicalToScreen(unit.pos);
    view.root.setPosition(screen.x, screen.y).setDepth(20 + screen.y);
  }

  private flashCell(cell: ArenaCell, color: number): void {
    const flash = this.add
      .rectangle(
        BOARD_X + (cell.col + 0.5) * CELL_W,
        BOARD_Y + (cell.row + 0.5) * CELL_H,
        CELL_W - 9,
        CELL_H - 9,
        color,
        0.26
      )
      .setDepth(12)
      .setStrokeStyle(2, color, 0.9);
    this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
  }

  private selectFighter(fighterId: number, showSidebar = true): void {
    const fighter = this.run.fighters.find((candidate) => candidate.id === fighterId);
    if (!fighter || this.state.phase !== 'planning') return;
    this.selectedFighterId = fighterId;
    for (const [id, view] of this.views) {
      const unit = this.state.units.find((candidate) => candidate.id === id);
      view.selection.setVisible(unit?.rosterId === fighterId);
    }
    if (showSidebar) this.sidebarMode = 'fighter';
    this.refreshSidebar();
  }

  private unitAdvice(definitionId: string): string {
    switch (definitionId) {
      case 'shield_guard': return 'Nearby enemies prefer this target. Put him where contact should happen.';
      case 'ranger': return 'Long range buys damage time, provided nobody reaches her.';
      case 'fire_mage': return 'Splash punishes enemies that converge on the same frontline.';
      case 'healer': return 'Heals the most wounded ally in range. Distance is a policy decision.';
      default: return '';
    }
  }

  private beginBattle(): void {
    if (this.state.phase !== 'planning') return;
    startArenaBattle(this.state);
    this.startButton.setEnabled(false);
    this.startButton.setLabel('BATTLE IN PROGRESS');
    this.phaseLabel.setText('LIVE COMBAT');
    for (const [id, view] of this.views) {
      view.selection.setVisible(false);
      const unit = this.state.units.find((candidate) => candidate.id === id);
      if (unit?.team === 'player') this.input.setDraggable(view.root, false);
    }
    this.detailPanel?.removeAll(true);
    if (this.detailPanel) {
      const battlePanel = arenaPanel(this, 0, 16, 336, 226, 0x8a6736, 0.95);
      const title = arenaTitle(this, 168, 42, 'FORMATION LOCKED', 18).setOrigin(0.5);
      const body = arenaText(this, 168, 82, 'Your fighters now act on their own.', 12, ARENA_COLORS.muted).setOrigin(0.5).setAlign('center');
      const pulse = this.add.circle(168, 144, 34, 0x2477a7, 0.25).setStrokeStyle(2, 0x72cfff, 0.8);
      const icon = arenaTitle(this, 168, 143, '⚔', 26, '#d8efff').setOrigin(0.5);
      const hint = arenaText(this, 168, 198, 'WATCH THE CORE • 1 / 2 CHANGE SPEED', 9, '#b7c9cf').setOrigin(0.5).setFontStyle('bold');
      this.detailPanel.add([battlePanel, title, body, pulse, icon, hint]);
      this.tweens.add({ targets: pulse, scale: 1.16, alpha: 0.1, duration: 850, yoyo: true, repeat: -1 });
    }
    sfx.play('waveStart');
  }

  private setSpeed(speed: 1 | 2): void {
    this.state.speed = speed;
    this.speedButton.setLabel(`SPEED ${speed}x`);
  }

  private drawUnitHp(unit: ArenaUnitState, view: UnitView): void {
    const ratio = Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1);
    view.hpBar.clear();
    view.hpBar.fillStyle(0x05070b, 0.95).fillRoundedRect(-27, 25, 54, 7, 2);
    const color = ratio > 0.55 ? 0x62d497 : ratio > 0.25 ? 0xe0b85c : 0xe85e66;
    view.hpBar.fillStyle(color, 1).fillRoundedRect(-25, 27, 50 * ratio, 3, 1);
  }

  private syncUnitViews(): void {
    for (const unit of this.state.units) {
      const view = this.views.get(unit.id);
      if (!view || view.deathStarted || this.draggingUnitId === unit.id) continue;
      const screen = this.logicalToScreen(unit.pos);
      view.root.setPosition(screen.x, screen.y).setDepth(20 + screen.y);
      this.drawUnitHp(unit, view);
      this.refreshMovementAnimation(unit, view);
    }
  }

  private refreshMovementAnimation(unit: ArenaUnitState, view: UnitView): void {
    if (this.time.now < view.animationLockUntil || view.activity === unit.activity) return;
    view.activity = unit.activity;
    const definition = arenaUnitById(unit.definitionId);
    if (definition.assetKind === 'enemy') {
      const sheet = WAVE_SHEETS[definition.assetId];
      if (unit.activity === 'moving') view.sprite.play(waveSheetAnimKey(sheet, 'walk'), true);
      else if (unit.activity === 'idle') view.sprite.stop().setFrame(0);
      return;
    }
    const sheet = FIGHTER_SHEETS[definition.assetId];
    if (unit.activity === 'moving' && sheet.anims?.walk) {
      view.sprite.play(fighterSheetAnimKey(sheet, 'walk'), true);
    } else if (unit.activity === 'idle') {
      view.sprite.stop().setFrame(fighterSheetFrame(sheet, 'idle'));
    }
  }

  private playAttackAnimation(unitId: number): void {
    const unit = this.state.units.find((candidate) => candidate.id === unitId);
    const view = this.views.get(unitId);
    if (!unit || !view) return;
    const definition = arenaUnitById(unit.definitionId);
    view.animationLockUntil = this.time.now + 330;
    if (definition.assetKind === 'enemy') {
      view.sprite.play(waveSheetAnimKey(WAVE_SHEETS[definition.assetId], 'attack'));
    } else {
      const sheet = FIGHTER_SHEETS[definition.assetId];
      if (sheet.anims?.attack) view.sprite.play(fighterSheetAnimKey(sheet, 'attack'));
      else view.sprite.stop().setFrame(fighterSheetFrame(sheet, 'attack'));
    }
    this.tweens.add({ targets: view.root, scale: 1.1, duration: 70, yoyo: true });
  }

  private playDeath(unitId: number): void {
    const unit = this.state.units.find((candidate) => candidate.id === unitId);
    const view = this.views.get(unitId);
    if (!unit || !view || view.deathStarted) return;
    view.deathStarted = true;
    const definition = arenaUnitById(unit.definitionId);
    if (definition.assetKind === 'enemy') {
      view.sprite.play(waveSheetAnimKey(WAVE_SHEETS[definition.assetId], 'death'));
    } else {
      const sheet = FIGHTER_SHEETS[definition.assetId];
      if (sheet.anims?.death) view.sprite.play(fighterSheetAnimKey(sheet, 'death'));
      else view.sprite.stop().setFrame(fighterSheetFrame(sheet, 'death'));
    }
    this.tweens.add({
      targets: view.root,
      alpha: 0,
      y: view.root.y + 10,
      duration: 520,
      onComplete: () => view.root.setVisible(false)
    });
    sfx.play('death');
  }

  private handleEvents(events: ArenaBattleEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'attack':
          this.playAttackAnimation(event.attackerId);
          this.playAttackEffect(event);
          break;
        case 'heal':
          this.playAttackAnimation(event.healerId);
          this.playHealEffect(event);
          break;
        case 'death':
          this.playDeath(event.unitId);
          break;
        case 'core-hit':
          this.playCoreHit(event.at, event.damage);
          break;
        case 'battle-ended':
          this.showResult(event.outcome);
          break;
      }
    }
  }

  private playAttackEffect(event: Extract<ArenaBattleEvent, { type: 'attack' }>): void {
    const from = this.logicalToScreen(event.from);
    const to = this.logicalToScreen(event.to);
    const color = event.style === 'magic' ? 0xff784e : event.style === 'pierce' ? 0xd7edff : 0xe2c27d;
    const hit = (): void => {
      const key = HIT_EFFECT_SPRITES[event.style].key;
      const effect = this.add.image(to.x, to.y, key).setDisplaySize(42, 42).setDepth(260).setAlpha(0.95);
      this.tweens.add({ targets: effect, scale: 1.45, alpha: 0, duration: 220, onComplete: () => effect.destroy() });
      if (event.splashRadius) {
        const ring = this.add.circle(to.x, to.y, event.splashRadius * CELL_W, 0xff6a43, 0.14)
          .setStrokeStyle(2, 0xffa16d, 0.75)
          .setDepth(255);
        this.tweens.add({ targets: ring, scale: 1.12, alpha: 0, duration: 310, onComplete: () => ring.destroy() });
      }
      sfx.play('hit');
    };

    if (event.ranged) {
      const projectile = event.style === 'pierce'
        ? this.add.rectangle(from.x, from.y, 24, 5, color, 1)
        : this.add.circle(from.x, from.y, event.style === 'magic' ? 9 : 6, color, 1);
      projectile.setDepth(270).setRotation(Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y));
      this.tweens.add({
        targets: projectile,
        x: to.x,
        y: to.y,
        duration: this.state.speed === 2 ? 90 : 150,
        onComplete: () => {
          projectile.destroy();
          hit();
        }
      });
    } else {
      const slash = this.add.line((from.x + to.x) / 2, (from.y + to.y) / 2, -14, 8, 14, -8, color, 0.9).setDepth(265);
      this.tweens.add({ targets: slash, alpha: 0, scale: 1.4, duration: 130, onComplete: () => slash.destroy() });
      hit();
    }
  }

  private playHealEffect(event: Extract<ArenaBattleEvent, { type: 'heal' }>): void {
    const healer = this.state.units.find((unit) => unit.id === event.healerId);
    if (!healer) return;
    const from = this.logicalToScreen(healer.pos);
    const at = this.logicalToScreen(event.at);
    const beam = this.add.line((from.x + at.x) / 2, (from.y + at.y) / 2, from.x - at.x, from.y - at.y, 0, 0, 0x77e5ad, 0.55)
      .setLineWidth(3)
      .setDepth(260);
    const effect = this.add.image(at.x, at.y, SUPPORT_EFFECT_SPRITES.heal.key).setDisplaySize(58, 58).setDepth(265);
    const text = arenaText(this, at.x, at.y - 34, `+${Math.round(event.amount)}`, 15, ARENA_COLORS.ok)
      .setOrigin(0.5)
      .setDepth(270)
      .setFontStyle('bold');
    this.tweens.add({ targets: [beam, effect], alpha: 0, duration: 360, onComplete: () => { beam.destroy(); effect.destroy(); } });
    this.tweens.add({ targets: text, y: text.y - 18, alpha: 0, duration: 620, onComplete: () => text.destroy() });
    sfx.play('heal');
  }

  private playCoreHit(at: ArenaPoint, damage: number): void {
    const screen = this.logicalToScreen(at);
    const flash = this.add.circle(screen.x, screen.y, 36, 0xff626b, 0.48).setDepth(280);
    const text = arenaText(this, screen.x, screen.y - 26, `-${damage} CORE`, 15, ARENA_COLORS.danger)
      .setOrigin(0.5)
      .setDepth(282)
      .setFontStyle('bold');
    this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 280, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: text, y: text.y - 22, alpha: 0, duration: 650, onComplete: () => text.destroy() });
    this.tweens.add({ targets: this.coreGlow, alpha: 0.65, duration: 70, yoyo: true });
    sfx.play('leak');
  }

  private showResult(outcome: 'victory' | 'defeat'): void {
    if (this.resultOverlay) return;
    const won = outcome === 'victory';
    const encounter = arenaEncounter(this.run.fightIndex);
    const runComplete = won && encounter.boss;
    this.phaseLabel.setText(runComplete ? 'RUN COMPLETE' : won ? 'FIGHT CLEARED' : 'CORE LOST');
    this.startButton.setLabel(runComplete ? 'BOSS DEFEATED' : won ? 'VICTORY' : 'DEFEAT');
    sfx.play(won ? 'victory' : 'defeat');

    const shade = this.add.rectangle(0, 0, 1280, 720, 0x03050a, 0.66).setOrigin(0).setInteractive();
    const panel = arenaPanel(this, -270, -155, 540, 310, won ? 0x67b98f : 0xc75950, 1);
    const crestGlow = this.add.circle(0, -116, 30, won ? 0x2d8065 : 0x8c302e, 0.22).setStrokeStyle(2, won ? 0x7dd7ae : 0xe27a70, 0.75);
    const crest = arenaTitle(this, 0, -116, won ? '★' : '◆', 24, won ? '#a6f2cf' : '#ffaaa2').setOrigin(0.5);
    const title = arenaTitle(this, 0, -78, runComplete ? 'THE TYRANT FELL' : won ? 'THE LINE HELD' : 'THE CORE FELL', 29, won ? ARENA_COLORS.ok : ARENA_COLORS.danger)
      .setOrigin(0.5)
      .setFontStyle('bold');
    const body = arenaText(
      this,
      0,
      -22,
      runComplete
        ? `Four fights cleared. ${this.run.fighters.length} fighters made the final roster.`
        : won
          ? `Fight ${this.run.fightIndex + 1} cleared in ${this.state.time.toFixed(1)}s. Claim ${encounter.reward} gold and prepare the next formation.`
          : 'Same roster, same shop state. Reposition the formation and try again.',
      16,
      ARENA_COLORS.text
    ).setOrigin(0.5).setAlign('center').setWordWrapWidth(450);
    this.resultOverlay = this.add.container(640, 360, [shade.setPosition(-640, -360), panel, crestGlow, crest, title, body]).setDepth(500);

    if (runComplete) {
      const restart = arenaButton(this, 0, 76, 260, 56, 'START NEW RUN', () => {
        this.scene.restart({ run: createArenaRun() });
      }, 0xe0b65d);
      this.resultOverlay.add(restart.root);
    } else if (won) {
      const next = arenaButton(this, 0, 76, 300, 56, `CONTINUE  +${encounter.reward} GOLD`, () => {
        const run = cloneArenaRun(this.run);
        if (advanceArenaRun(run)) this.scene.restart({ run });
      }, 0xe0b65d);
      this.resultOverlay.add(next.root);
    } else {
      const adjust = arenaButton(this, -126, 76, 230, 56, 'ADJUST FORMATION', () => {
        this.scene.restart({ run: cloneArenaRun(this.run) });
      }, 0x77b9ee);
      const retry = arenaButton(this, 126, 76, 210, 56, 'RETRY SAME', () => {
        this.scene.restart({ run: cloneArenaRun(this.run), autoStart: true });
      }, 0xe0b65d);
      this.resultOverlay.add([adjust.root, retry.root]);
    }
  }

  private updateHud(): void {
    const hpRatio = Phaser.Math.Clamp(this.state.coreHp / this.state.coreMaxHp, 0, 1);
    this.coreLabel.setText(`CORE ${Math.ceil(this.state.coreHp)} / ${this.state.coreMaxHp}`);
    this.coreFill.displayWidth = 182 * hpRatio;
    this.coreFill.setFillStyle(hpRatio > 0.5 ? 0x51b9d8 : hpRatio > 0.25 ? 0xe0b85c : 0xe35e68);
    this.goldLabel.setText(`${this.run.gold}`);
    if (this.state.phase === 'planning') {
      this.timerLabel.setText('PLAN YOUR FORMATION');
    } else {
      this.timerLabel.setText(`${this.state.time.toFixed(1)}s  •  ${this.state.speed}× SPEED`);
    }
  }

  update(_time: number, delta: number): void {
    if (this.state.phase === 'battle') {
      this.accumulator += Math.min(delta, 80) / 1000 * this.state.speed;
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < 8) {
        tickArenaBattle(this.state, FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps++;
      }
    }
    this.handleEvents(drainArenaEvents(this.state));
    this.syncUnitViews();
    this.updateHud();
  }
}
