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
  fieldLimitForFight,
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

const ART_X = -80;
const ART_Y = -45;
const ART_W = 1440;
const ART_H = 810;
const BOARD_X = 180;
const BOARD_Y = 120;
const CELL_W = 132;
const CELL_H = 72;
const BOARD_W = ARENA_COLS * CELL_W;
const BOARD_H = ARENA_ROWS * CELL_H;
const DRAWER_X = 850;
const DRAWER_Y = 92;
const DRAWER_W = 410;
const DRAWER_H = 508;
const RESERVE_Y = 650;
const FIXED_STEP = 1 / 30;
const TOUCH_INPUT = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;

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
  private shopButton!: ArenaButton;
  private phaseLabel!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;
  private goldLabel!: Phaser.GameObjects.Text;
  private detailPanel?: Phaser.GameObjects.Container;
  private sidebarContent?: Phaser.GameObjects.Container;
  private sidebarMode: 'shop' | 'fighter' = 'shop';
  private drawerOpen = false;
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
    this.drawerOpen = deployedFighters(this.run).length < fieldLimitForFight(this.run.fightIndex)
      && reserveFighters(this.run).length === 0;

    this.drawBackdrop();
    this.drawTopBar();
    this.drawBoard();
    this.drawLeftPanel();
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
    const graphics = this.add.graphics().setDepth(-3);
    graphics.fillGradientStyle(0xe4f3ea, 0xfff1cf, 0xd6ece7, 0xf7e7c7, 1);
    graphics.fillRect(0, 0, 1280, 720);
  }

  private drawTopBar(): void {
    arenaPanel(this, 8, 8, 1264, 58, ARENA_COLORS.brassLight, 0.98);
    arenaButton(this, 52, 36, 76, 32, 'MENU', () => {
      window.location.assign('./index.html');
    }, 0x4b9bc1);
    arenaTitle(this, 101, 16, 'LANE LEGION', 21);
    arenaText(this, 103, 43, 'SUNLIT ARENA', 9, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(2);

    this.phaseLabel = arenaTitle(this, 350, 15, `FIGHT ${this.run.fightIndex + 1} / 4`, 18, ARENA_COLORS.text);
    this.timerLabel = arenaText(this, 352, 42, 'PLAN YOUR FORMATION', 10, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(1);

    const encounter = arenaEncounter(this.run.fightIndex);
    arenaText(this, 560, 16, encounter.boss ? 'FINAL · BOSS' : 'NEXT RIVAL', 9, encounter.boss ? ARENA_COLORS.danger : ARENA_COLORS.muted)
      .setFontStyle('bold')
      .setLetterSpacing(1);
    arenaTitle(this, 560, 29, encounter.name, 15, encounter.boss ? ARENA_COLORS.danger : ARENA_COLORS.text);

    this.add.circle(918, 35, 14, 0xf5c55b, 1).setStrokeStyle(2, 0xb37619, 0.9);
    arenaText(this, 918, 34, 'G', 11, '#70480d').setOrigin(0.5).setFontStyle('bold');
    arenaText(this, 942, 16, 'GOLD', 9, ARENA_COLORS.muted).setFontStyle('bold');
    this.goldLabel = arenaTitle(this, 942, 28, `${this.run.gold}`, 21);

    this.add.circle(1035, 35, 14, 0x8ed5e8, 1).setStrokeStyle(2, 0x3087ad, 0.9);
    arenaText(this, 1035, 34, 'T', 11, '#1f607d').setOrigin(0.5).setFontStyle('bold');
    arenaText(this, 1059, 16, 'TEAM CAP', 9, ARENA_COLORS.muted).setFontStyle('bold');
    arenaTitle(
      this,
      1059,
      28,
      `${deployedFighters(this.run).length} / ${fieldLimitForFight(this.run.fightIndex)}`,
      18,
      ARENA_COLORS.text
    );

    this.speedButton = arenaButton(this, 1190, 36, 132, 34, 'SPEED 1x', () => {
      this.setSpeed(this.state.speed === 1 ? 2 : 1);
    }, 0x4b9bc1);
  }

  private drawLeftPanel(): void {
    arenaPanel(this, 18, 94, 144, 108, 0xe2a642, 0.96).setDepth(80);
    arenaText(this, 90, 109, 'YOUR GOAL', 10, ARENA_COLORS.muted).setOrigin(0.5).setFontStyle('bold').setLetterSpacing(1).setDepth(81);
    arenaTitle(this, 90, 130, 'CLEAR THE\nRIVAL TEAM', 14, ARENA_COLORS.text).setOrigin(0.5, 0).setAlign('center').setDepth(81);
    arenaText(
      this,
      90,
      169,
      `CAP ${fieldLimitForFight(this.run.fightIndex)}  |  +${arenaEncounter(this.run.fightIndex).reward} GOLD`,
      9,
      ARENA_COLORS.gold
    ).setOrigin(0.5).setFontStyle('bold').setDepth(81);
    const reset = arenaButton(this, 90, 219, 112, 32, 'RESET LINE', () => {
      if (this.state.phase === 'planning') {
        const run = cloneArenaRun(this.run);
        resetArenaFormation(run);
        this.scene.restart({ run });
      }
    }, 0x4b9bc1);
    reset.root.setDepth(82);

    const hint = arenaText(this, BOARD_X, 570, TOUCH_INPUT ? 'TAP A FIGHTER, THEN A BLUE TILE' : 'SELECT OR DRAG A FIGHTER', 10, ARENA_COLORS.text)
      .setFontStyle('bold')
      .setLetterSpacing(1)
      .setShadow(0, 1, '#ffffff', 2)
      .setDepth(82);
    hint.setAlpha(0.88);
  }

  private drawBoard(): void {
    this.add.image(ART_X + ART_W / 2, ART_Y + ART_H / 2, 'compact-arena-floor-p1')
      .setDisplaySize(ART_W, ART_H)
      .setDepth(-2);

    const grid = this.add.graphics().setDepth(7);
    grid.fillStyle(0xe97868, 0.055).fillRoundedRect(BOARD_X, BOARD_Y, BOARD_W, PLAYER_FIRST_ROW * CELL_H, 18);
    grid.fillStyle(0x38a9d6, 0.065).fillRoundedRect(BOARD_X, BOARD_Y + PLAYER_FIRST_ROW * CELL_H, BOARD_W, (ARENA_ROWS - PLAYER_FIRST_ROW) * CELL_H, 18);
    grid.lineStyle(1, 0xb88550, 0.34);
    for (let col = 1; col < ARENA_COLS; col++) grid.lineBetween(BOARD_X + col * CELL_W, BOARD_Y, BOARD_X + col * CELL_W, BOARD_Y + BOARD_H);
    for (let row = 1; row < ARENA_ROWS; row++) grid.lineBetween(BOARD_X, BOARD_Y + row * CELL_H, BOARD_X + BOARD_W, BOARD_Y + row * CELL_H);
    grid.lineStyle(2, 0x9c7447, 0.45).strokeRoundedRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 18);

    for (let row = 0; row < ARENA_ROWS; row++) {
      for (let col = 0; col < ARENA_COLS; col++) {
        const isPlayerSide = row >= PLAYER_FIRST_ROW;
        const x = BOARD_X + col * CELL_W;
        const y = BOARD_Y + row * CELL_H;
        const hit = this.add
          .rectangle(x + CELL_W / 2, y + CELL_H / 2, CELL_W - 10, CELL_H - 8, isPlayerSide ? 0x38a9d6 : 0xe27664, 0.008)
          .setDepth(8)
          .setInteractive({ useHandCursor: isPlayerSide });
        hit.setData('cell', { col, row } satisfies ArenaCell);
        hit.on('pointerover', () => {
          if (isPlayerSide && this.state.phase === 'planning') {
            hit.setFillStyle(0x6fc9e8, 0.24).setStrokeStyle(3, 0x258fbd, 0.9);
          }
        });
        hit.on('pointerout', () => hit.setFillStyle(isPlayerSide ? 0x38a9d6 : 0xe27664, 0.008).setStrokeStyle());
        hit.on('pointerdown', () => {
          if (isPlayerSide) this.placeSelectedAt({ col, row });
        });
        this.cellHits.push(hit);
      }
    }

    this.add.rectangle(BOARD_X, BOARD_Y + PLAYER_FIRST_ROW * CELL_H - 2, BOARD_W, 4, 0xd9a441, 0.72).setOrigin(0).setDepth(9);
    arenaText(this, BOARD_X + 12, BOARD_Y + 8, 'RIVAL SIDE', 10, '#9c493e').setFontStyle('bold').setLetterSpacing(1).setShadow(0, 1, '#ffffff', 2).setDepth(10);
    arenaText(this, BOARD_X + 12, BOARD_Y + PLAYER_FIRST_ROW * CELL_H + 8, 'YOUR FORMATION', 10, '#267ca4').setFontStyle('bold').setLetterSpacing(1).setShadow(0, 1, '#ffffff', 2).setDepth(10);
  }

  private drawRightPanel(): void {
    const encounter = arenaEncounter(this.run.fightIndex);
    arenaPanel(this, 830, 76, 430, 42, encounter.boss ? 0xe27664 : 0xf0c45d, 0.94);
    arenaText(this, 846, 88, 'RIVAL PLAN', 9, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(1);
    encounter.summary.forEach((entry, index) => {
      const chipX = 930 + index * 106;
      this.add.rectangle(chipX, 84, 98, 26, entry.warning ? 0xffe2b5 : 0xfff4e4, 0.96)
        .setOrigin(0)
        .setStrokeStyle(1, entry.warning ? 0xd49132 : 0xd6a092, 0.8);
      arenaText(this, chipX + 49, 97, entry.label, 8, entry.warning ? '#8a5510' : '#884d45')
        .setOrigin(0.5)
        .setFontStyle('bold');
    });

    this.shopButton = arenaButton(this, 974, 681, 174, 48, 'OPEN SHOP', () => {
      if (this.state.phase !== 'planning') return;
      this.sidebarMode = 'shop';
      this.drawerOpen = !this.drawerOpen || !this.detailPanel?.visible;
      this.refreshSidebar();
    }, 0x4b9bc1);

    const firstRecruitNeeded = this.run.fightIndex === 0
      && deployedFighters(this.run).length < fieldLimitForFight(this.run.fightIndex);
    this.startButton = arenaButton(
      this,
      1167,
      681,
      194,
      48,
      firstRecruitNeeded ? 'RECRUIT 1 MORE' : 'START BATTLE',
      () => {
        if (firstRecruitNeeded) {
          this.sidebarMode = 'shop';
          this.drawerOpen = true;
          this.refreshSidebar();
          return;
        }
        this.beginBattle();
      },
      0xe0a83c
    );
    this.startButton.setEnabled(deployedFighters(this.run).length > 0);

    this.detailPanel = this.add.container(DRAWER_X, DRAWER_Y).setDepth(1000).setVisible(false);
    this.refreshSidebar();
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
    arenaText(this, 640, 594, `${deployedFighters(this.run).length}/${fieldLimitForFight(this.run.fightIndex)} FIELD  •  ${reserveFighters(this.run).length}/${MAX_RESERVE_FIGHTERS} RESERVE`, 10, ARENA_COLORS.text)
      .setOrigin(0.5)
      .setFontStyle('bold')
      .setLetterSpacing(1)
      .setShadow(0, 1, '#ffffff', 2);
    arenaText(this, 640, 613, 'RESERVE BENCH', 9, ARENA_COLORS.muted).setOrigin(0.5).setFontStyle('bold').setLetterSpacing(2);

    const reserves = reserveFighters(this.run);
    const slotXs = [512, 640, 768];
    slotXs.forEach((x, index) => {
      const fighter = reserves[index];
      const selected = fighter?.id === this.selectedFighterId;
      this.add.circle(x, RESERVE_Y, 37, selected ? 0xfff0b5 : 0xffffff, fighter ? 0.86 : 0.28)
        .setStrokeStyle(selected ? 4 : 2, selected ? 0xd79b2e : 0x7fb9c9, selected ? 1 : 0.64)
        .setDepth(14);
      if (!fighter) {
        arenaText(this, x, RESERVE_Y, `${index + 1}`, 12, '#78909b').setOrigin(0.5).setDepth(15);
        return;
      }
      const definition = arenaUnitById(fighter.definitionId);
      const portrait = this.addUnitPortrait(fighter.definitionId, x, RESERVE_Y - 4, 72).setDepth(15);
      portrait.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectFighter(fighter.id));
      arenaText(this, x, RESERVE_Y + 35, definition.name.toUpperCase(), 8, ARENA_COLORS.text).setOrigin(0.5).setFontStyle('bold').setDepth(16);
      if (fighter.tier === 1) {
        arenaText(this, x - 28, RESERVE_Y - 30, '★', 14, ARENA_COLORS.gold).setFontStyle('bold').setDepth(16);
      }
    });
  }

  private refreshSidebar(): void {
    if (!this.detailPanel) return;
    this.detailPanel.removeAll(true);
    for (const view of this.views.values()) {
      const coveredByDrawer = this.drawerOpen && view.root.x >= DRAWER_X - 46;
      view.root.setVisible(!view.deathStarted && !coveredByDrawer);
    }
    if (this.state.phase !== 'planning' || !this.drawerOpen) {
      this.detailPanel.setVisible(false);
      this.sidebarContent = undefined;
      return;
    }
    this.detailPanel.setVisible(true);
    const blocker = this.add.rectangle(DRAWER_W / 2, DRAWER_H / 2, DRAWER_W, DRAWER_H, 0xffffff, 0.001).setInteractive();
    const frame = arenaPanel(this, 0, 0, DRAWER_W, DRAWER_H, this.sidebarMode === 'shop' ? 0xe0a83c : 0x4b9bc1, 0.985);
    const heading = arenaTitle(this, 22, 18, this.sidebarMode === 'shop' ? 'RECRUIT FIGHTERS' : 'FIGHTER DETAILS', 18, ARENA_COLORS.text);
    const close = arenaButton(this, DRAWER_W - 34, 27, 46, 34, '×', () => {
      this.drawerOpen = false;
      this.refreshSidebar();
    }, 0xe27664);
    const body = this.add.container(34, 64);
    this.detailPanel.add([blocker, frame, heading, close.root, body]);
    this.sidebarContent = body;
    if (this.sidebarMode === 'shop') this.renderShopSidebar();
    else this.renderFighterSidebar();
  }

  private renderShopSidebar(): void {
    if (!this.sidebarContent) return;
    const nodes: Phaser.GameObjects.GameObject[] = [];
    const fieldSlotsOpen = Math.max(0, fieldLimitForFight(this.run.fightIndex) - deployedFighters(this.run).length);
    nodes.push(arenaText(
      this,
      0,
      0,
      fieldSlotsOpen > 0
        ? `CHOOSE A REINFORCEMENT  |  ${fieldSlotsOpen} FIELD SLOT${fieldSlotsOpen === 1 ? '' : 'S'} OPEN`
        : 'TEAM CAP REACHED  |  BUILD YOUR BENCH',
      10,
      ARENA_COLORS.muted
    ).setFontStyle('bold').setLetterSpacing(1));
    this.run.shopOffers.forEach((offer, index) => {
      const definition = arenaUnitById(offer.definitionId);
      const x = index * 110;
      const frame = arenaPanel(this, x, 23, 104, 184, definition.role === 'support' ? 0x55a879 : definition.role === 'aoe' ? 0xe28a52 : 0x4b9bc1, 0.98);
      const portrait = this.addUnitPortrait(offer.definitionId, x + 52, 68, 76);
      const title = arenaText(this, x + 52, 108, definition.name.toUpperCase(), 10, ARENA_COLORS.text)
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(94)
        .setFontStyle('bold');
      const meta = arenaText(this, x + 52, 137, definition.role.toUpperCase(), 8, '#54717d').setOrigin(0.5).setFontStyle('bold');
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
    }, 0x4b9bc1);
    reroll.setEnabled(this.run.rerollsLeft > 0 && this.run.gold >= REROLL_COST);
    nodes.push(reroll.root);
    const nextCap = fieldLimitForFight(this.run.fightIndex + 1);
    nodes.push(arenaText(
      this,
      0,
      254,
      arenaEncounter(this.run.fightIndex).boss
        ? 'Final fight: shape the strongest five-fighter team.'
        : `${this.run.rerollsLeft > 0 ? 'One reroll remains.' : 'Reroll used.'} Win to unlock team cap ${nextCap}.`,
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
    const portraitFrame = arenaPanel(this, 0, 20, 98, 98, fighter.tier === 1 ? ARENA_COLORS.brassLight : 0x4b9bc1, 0.98);
    const portrait = this.addUnitPortrait(fighter.definitionId, 49, 69, 88);
    const nodes: Phaser.GameObjects.GameObject[] = [portraitFrame, portrait];
    nodes.push(arenaTitle(this, 112, 22, definition.name.toUpperCase(), 18, ARENA_COLORS.text).setWordWrapWidth(210));
    nodes.push(arenaText(this, 112, 49, `${definition.role.toUpperCase()}  •  ${fighter.tier === 1 ? 'TIER II' : 'TIER I'}`, 10, fighter.tier === 1 ? ARENA_COLORS.gold : '#267ca4').setFontStyle('bold'));
    nodes.push(arenaText(this, 112, 73, definition.blurb, 11, ARENA_COLORS.muted).setFontStyle('italic').setWordWrapWidth(214));
    [
      { label: 'HP', value: Math.round(hp) },
      { label: 'DMG', value: Math.round(damage) },
      { label: 'RANGE', value: definition.range.toFixed(1) }
    ].forEach((stat, index) => {
      const x = index * 112;
      const box = this.add.rectangle(x, 130, 104, 34, 0xf2f8f3, 0.96).setOrigin(0).setStrokeStyle(1, 0x91b2b4, 0.7);
      nodes.push(box);
      nodes.push(arenaText(this, x + 8, 137, stat.label, 8, ARENA_COLORS.muted).setFontStyle('bold'));
      nodes.push(arenaTitle(this, x + 96, 134, `${stat.value}`, 13, ARENA_COLORS.text).setOrigin(1, 0));
    });
    if (upgrade) {
      const box = this.add.rectangle(0, 174, 328, 66, 0xfff3d4, 0.98).setOrigin(0).setStrokeStyle(1, fighter.tier === 1 ? 0xd3a23b : 0xc7a66c, 0.85);
      nodes.push(box);
      nodes.push(arenaTitle(this, 12, 182, fighter.tier === 1 ? `${upgrade.name} • OWNED` : upgrade.name, 13, fighter.tier === 1 ? ARENA_COLORS.gold : ARENA_COLORS.text));
      nodes.push(arenaText(this, 12, 207, upgrade.blurb, 10, ARENA_COLORS.muted));
      if (fighter.tier === 0) {
        const upgradeButton = arenaButton(this, 80, 263, 152, 34, `UPGRADE • ${upgrade.cost}`, () => {
          const run = cloneArenaRun(this.run);
          if (upgradeArenaFighter(run, fighter.id)) this.scene.restart({ run });
        }, 0xe0a83c);
        upgradeButton.setEnabled(this.run.gold >= upgrade.cost);
        nodes.push(upgradeButton.root);
      }
    }
    if (fighter.cell) {
      const bench = arenaButton(this, 248, 263, 152, 34, 'TO RESERVE', () => {
        const run = cloneArenaRun(this.run);
        if (benchArenaFighter(run, fighter.id)) this.scene.restart({ run });
      }, 0x6e9dc2);
      bench.setEnabled(reserveFighters(this.run).length < MAX_RESERVE_FIGHTERS && deployedFighters(this.run).length > 1);
      nodes.push(bench.root);
    } else {
      nodes.push(arenaText(this, 168, 250, `SELECTED RESERVE\n${TOUCH_INPUT ? 'Tap' : 'Click'} an empty blue cell.`, 10, '#267ca4').setAlign('center'));
    }
    nodes.push(arenaText(this, 0, 292, this.unitAdvice(definition.id), 10, ARENA_COLORS.muted).setWordWrapWidth(328));
    this.sidebarContent.add(nodes);
  }

  private createUnitView(unit: ArenaUnitState): void {
    const definition = arenaUnitById(unit.definitionId);
    const teamColor = unit.team === 'player' ? ARENA_COLORS.player : ARENA_COLORS.enemy;
    const shadow = this.add.ellipse(0, 19, definition.role === 'tank' ? 62 : 52, 17, 0x405b55, 0.24);
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
    const name = arenaText(this, 0, 35, definition.name, 10, unit.team === 'player' ? '#174f70' : '#7e3835')
      .setOrigin(0.5)
      .setFontStyle('bold')
      .setShadow(0, 1, '#ffffff', 2);
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
    if (showSidebar) {
      this.sidebarMode = 'fighter';
      this.drawerOpen = true;
    }
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
    if (this.run.fightIndex === 0 && deployedFighters(this.run).length < fieldLimitForFight(this.run.fightIndex)) {
      this.sidebarMode = 'shop';
      this.drawerOpen = true;
      this.refreshSidebar();
      return;
    }
    startArenaBattle(this.state);
    this.startButton.setEnabled(false);
    this.shopButton.setEnabled(false);
    this.startButton.setLabel('BATTLE IN PROGRESS');
    this.phaseLabel.setText('LIVE COMBAT');
    for (const [id, view] of this.views) {
      view.selection.setVisible(false);
      const unit = this.state.units.find((candidate) => candidate.id === id);
      if (unit?.team === 'player') this.input.setDraggable(view.root, false);
    }
    this.drawerOpen = false;
    this.refreshSidebar();
    const toastFrame = arenaPanel(this, 494, 76, 292, 48, 0x4b9bc1, 0.96).setDepth(290);
    const toast = arenaText(
      this,
      640,
      100,
      TOUCH_INPUT ? 'FORMATION LOCKED  •  TAP SPEED TO ACCELERATE' : 'FORMATION LOCKED  •  1 / 2 CHANGE SPEED',
      11,
      ARENA_COLORS.text
    ).setOrigin(0.5).setFontStyle('bold').setDepth(291);
    this.tweens.add({ targets: [toastFrame, toast], alpha: 0, delay: 1500, duration: 500, onComplete: () => { toastFrame.destroy(); toast.destroy(); } });
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

  private showResult(outcome: 'victory' | 'defeat'): void {
    if (this.resultOverlay) return;
    const won = outcome === 'victory';
    const encounter = arenaEncounter(this.run.fightIndex);
    const runComplete = won && encounter.boss;
    const nextTeamCap = fieldLimitForFight(this.run.fightIndex + 1);
    this.phaseLabel.setText(runComplete ? 'RUN COMPLETE' : won ? 'FIGHT CLEARED' : 'TEAM DEFEATED');
    this.startButton.setLabel(runComplete ? 'BOSS DEFEATED' : won ? 'VICTORY' : 'DEFEAT');
    sfx.play(won ? 'victory' : 'defeat');

    const shade = this.add.rectangle(0, 0, 1280, 720, 0x24434c, 0.46).setOrigin(0).setInteractive();
    const panel = arenaPanel(this, -270, -155, 540, 310, won ? 0x67b98f : 0xc75950, 1);
    const crestGlow = this.add.circle(0, -116, 30, won ? 0x2d8065 : 0x8c302e, 0.22).setStrokeStyle(2, won ? 0x7dd7ae : 0xe27a70, 0.75);
    const crest = arenaTitle(this, 0, -116, won ? '★' : '◆', 24, won ? '#a6f2cf' : '#ffaaa2').setOrigin(0.5);
    const title = arenaTitle(this, 0, -78, runComplete ? 'THE TYRANT FELL' : won ? 'THE RIVALS FELL' : 'YOUR TEAM FELL', 29, won ? ARENA_COLORS.ok : ARENA_COLORS.danger)
      .setOrigin(0.5)
      .setFontStyle('bold');
    const body = arenaText(
      this,
      0,
      -22,
      runComplete
        ? `Four fights cleared. ${this.run.fighters.length} fighters made the final roster.`
        : won
          ? `Fight ${this.run.fightIndex + 1} cleared in ${this.state.time.toFixed(1)}s. Gain ${encounter.reward} gold and unlock team cap ${nextTeamCap}.`
          : 'Your team was eliminated. Reposition the formation and try again.',
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
      const next = arenaButton(this, 0, 76, 340, 56, `CONTINUE  +${encounter.reward}G  |  CAP ${nextTeamCap}`, () => {
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
