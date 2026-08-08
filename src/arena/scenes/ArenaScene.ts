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

const TOUCH_INPUT = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;
const SHORT_EDGE = Math.min(window.innerWidth, window.innerHeight);
const LONG_EDGE = Math.max(window.innerWidth, window.innerHeight);
const GAME_HEIGHT = TOUCH_INPUT
  ? Math.max(593, Math.min(720, Math.round(1280 * SHORT_EDGE / LONG_EDGE)))
  : 720;
const ART_X = TOUCH_INPUT ? -233 : -80;
const ART_W = TOUCH_INPUT ? 1680 : 1440;
const ART_H = TOUCH_INPUT ? 946 : 810;
const ART_Y = TOUCH_INPUT ? Math.round((GAME_HEIGHT - ART_H) / 2) : -45;
const TOP_BAR_Y = 8;
const BOARD_X = TOUCH_INPUT ? 48 : 180;
const BOARD_Y = TOUCH_INPUT ? 54 : 120;
const CELL_W = TOUCH_INPUT ? 160 : 132;
const CELL_H = TOUCH_INPUT ? 68 : 72;
const BOARD_W = ARENA_COLS * CELL_W;
const BOARD_H = ARENA_ROWS * CELL_H;
const DOCK_Y = TOUCH_INPUT ? GAME_HEIGHT - 104 : 598;
const DRAWER_X = TOUCH_INPUT ? 28 : 850;
const DRAWER_Y = TOUCH_INPUT ? GAME_HEIGHT - 250 : 92;
const DRAWER_W = TOUCH_INPUT ? 1124 : 410;
const DRAWER_H = TOUCH_INPUT ? 238 : 386;
const DRAWER_SCALE = 1;
const ROSTER_LABEL_Y = TOUCH_INPUT ? DOCK_Y + 12 : 612;
const BENCH_LABEL_Y = TOUCH_INPUT ? DOCK_Y + 13 : 631;
const RESERVE_Y = TOUCH_INPUT ? DOCK_Y + 55 : 662;
const ACTION_Y = TOUCH_INPUT ? DOCK_Y + 57 : 681;
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

    this.input.keyboard?.on('keydown-SPACE', () => this.beginBattle());
    this.input.keyboard?.on('keydown-ONE', () => this.setSpeed(1));
    this.input.keyboard?.on('keydown-TWO', () => this.setSpeed(2));

    if (this.autoStart) this.time.delayedCall(80, () => this.beginBattle());
  }

  private drawBackdrop(): void {
    this.cameras.main.setBackgroundColor(ARENA_COLORS.bg);
    const graphics = this.add.graphics().setDepth(-3);
    graphics.fillGradientStyle(0x183940, 0x244d52, 0x102a31, 0x1b3f44, 1);
    graphics.fillRect(0, 0, 1280, GAME_HEIGHT);
  }

  private drawTopBar(): void {
    const top = TOP_BAR_Y;
    const panelX = TOUCH_INPUT ? 16 : 8;
    const panelW = TOUCH_INPUT ? 1128 : 1264;
    const panelH = TOUCH_INPUT ? 52 : 58;
    const titleX = TOUCH_INPUT ? 94 : 101;
    const phaseX = TOUCH_INPUT ? 286 : 350;
    const rivalX = TOUCH_INPUT ? 458 : 560;
    const goldIconX = TOUCH_INPUT ? 774 : 918;
    const goldTextX = TOUCH_INPUT ? 798 : 942;
    const teamIconX = TOUCH_INPUT ? 888 : 1035;
    const teamTextX = TOUCH_INPUT ? 912 : 1059;
    arenaPanel(this, panelX, top, panelW, panelH, ARENA_COLORS.brassLight, 0.96).setDepth(90);
    const menu = arenaButton(this, TOUCH_INPUT ? 52 : 52, top + panelH / 2, TOUCH_INPUT ? 64 : 76, TOUCH_INPUT ? 34 : 36, 'MENU', () => {
      window.location.assign('./index.html');
    }, ARENA_COLORS.player);
    menu.root.setDepth(92);
    arenaTitle(this, titleX, top + (TOUCH_INPUT ? 8 : 7), 'LANE LEGION', TOUCH_INPUT ? 17 : 20, ARENA_COLORS.text).setDepth(92);
    arenaText(this, titleX + 2, top + (TOUCH_INPUT ? 31 : 35), 'COMPACT ARENA', 8, ARENA_COLORS.muted)
      .setFontStyle('bold')
      .setLetterSpacing(1.7)
      .setDepth(92);

    this.phaseLabel = arenaTitle(this, phaseX, top + 8, `FIGHT ${this.run.fightIndex + 1} / 4`, TOUCH_INPUT ? 16 : 18, ARENA_COLORS.text).setDepth(92);
    this.timerLabel = arenaText(this, phaseX + 2, top + (TOUCH_INPUT ? 31 : 35), 'BUILD YOUR FORMATION', 9, ARENA_COLORS.muted)
      .setFontStyle('bold')
      .setLetterSpacing(0.8)
      .setDepth(92);

    const encounter = arenaEncounter(this.run.fightIndex);
    arenaText(this, rivalX, top + 8, encounter.boss ? 'FINAL · BOSS' : 'NEXT RIVAL', 8, encounter.boss ? ARENA_COLORS.danger : ARENA_COLORS.muted)
      .setFontStyle('bold')
      .setLetterSpacing(1)
      .setDepth(92);
    arenaTitle(this, rivalX, top + 24, encounter.name, TOUCH_INPUT ? 13 : 15, encounter.boss ? ARENA_COLORS.danger : ARENA_COLORS.text).setDepth(92);

    this.add.circle(goldIconX, top + panelH / 2, 14, ARENA_COLORS.goldFill, 1).setStrokeStyle(2, 0x8e672e, 0.9).setDepth(92);
    arenaText(this, goldIconX, top + panelH / 2 - 1, 'G', 10, '#173039').setOrigin(0.5).setFontStyle('bold').setDepth(93);
    arenaText(this, goldTextX, top + 8, 'GOLD', 8, ARENA_COLORS.muted).setFontStyle('bold').setDepth(92);
    this.goldLabel = arenaTitle(this, goldTextX, top + 22, `${this.run.gold}`, 18, ARENA_COLORS.gold).setDepth(92);

    this.add.circle(teamIconX, top + panelH / 2, 14, ARENA_COLORS.player, 1).setStrokeStyle(2, 0x236b76, 0.9).setDepth(92);
    arenaText(this, teamIconX, top + panelH / 2 - 1, 'T', 10, '#173039').setOrigin(0.5).setFontStyle('bold').setDepth(93);
    arenaText(this, teamTextX, top + 8, 'TEAM', 8, ARENA_COLORS.muted).setFontStyle('bold').setDepth(92);
    arenaTitle(
      this,
      teamTextX,
      top + 22,
      `${deployedFighters(this.run).length} / ${fieldLimitForFight(this.run.fightIndex)}`,
      TOUCH_INPUT ? 16 : 18,
      ARENA_COLORS.text
    ).setDepth(92);

    this.speedButton = arenaButton(this, TOUCH_INPUT ? 1066 : 1190, top + panelH / 2, TOUCH_INPUT ? 132 : 132, TOUCH_INPUT ? 36 : 38, 'SPEED 1x', () => {
      this.setSpeed(this.state.speed === 1 ? 2 : 1);
    }, ARENA_COLORS.player);
    this.speedButton.root.setDepth(92);
  }

  private drawLeftPanel(): void {
    const resetFormation = (): void => {
      if (this.state.phase === 'planning') {
        const run = cloneArenaRun(this.run);
        resetArenaFormation(run);
        this.scene.restart({ run });
      }
    };
    if (!TOUCH_INPUT) {
      arenaPanel(this, 20, 92, 142, 70, ARENA_COLORS.enemy, 0.9).setDepth(80);
      arenaText(this, 34, 106, 'OBJECTIVE', 9, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(1.2).setDepth(81);
      arenaTitle(this, 34, 127, 'CLEAR ALL RIVALS', 13, ARENA_COLORS.text).setDepth(81);
    }
    const reset = arenaButton(
      this,
      TOUCH_INPUT ? 124 : 90,
      TOUCH_INPUT ? ACTION_Y : 184,
      TOUCH_INPUT ? 176 : 112,
      TOUCH_INPUT ? 42 : 34,
      TOUCH_INPUT ? 'RESET' : 'RESET LINE',
      resetFormation,
      ARENA_COLORS.player
    );
    reset.root.setDepth(82);
    if (!TOUCH_INPUT) {
      arenaText(this, BOARD_X, 570, 'SELECT OR DRAG A FIGHTER', 10, ARENA_COLORS.text)
        .setFontStyle('bold')
        .setLetterSpacing(1)
        .setStroke('#10272d', 3)
        .setDepth(82);
    }
  }

  private drawBoard(): void {
    this.add.image(ART_X + ART_W / 2, ART_Y + ART_H / 2, 'compact-arena-floor-p1')
      .setDisplaySize(ART_W, ART_H)
      .setDepth(-2);
    this.add.rectangle(640, GAME_HEIGHT / 2, 1280, GAME_HEIGHT, 0x0b2b32, TOUCH_INPUT ? 0.12 : 0.1).setDepth(-1);

    const zones = this.add.graphics().setDepth(7);
    zones.fillStyle(ARENA_COLORS.enemy, 0.035)
      .fillRoundedRect(BOARD_X, BOARD_Y, BOARD_W, PLAYER_FIRST_ROW * CELL_H, 24);
    zones.fillStyle(ARENA_COLORS.player, 0.05)
      .fillRoundedRect(BOARD_X, BOARD_Y + PLAYER_FIRST_ROW * CELL_H, BOARD_W, (ARENA_ROWS - PLAYER_FIRST_ROW) * CELL_H, 24);
    zones.lineStyle(2, ARENA_COLORS.brassLight, 0.54)
      .lineBetween(BOARD_X + 18, BOARD_Y + PLAYER_FIRST_ROW * CELL_H, BOARD_X + BOARD_W - 18, BOARD_Y + PLAYER_FIRST_ROW * CELL_H);

    for (let row = PLAYER_FIRST_ROW; row < ARENA_ROWS; row++) {
      for (let col = 0; col < ARENA_COLS; col++) {
        const x = BOARD_X + col * CELL_W;
        const y = BOARD_Y + row * CELL_H;
        const hit = this.add
          .rectangle(x + CELL_W / 2, y + CELL_H / 2, CELL_W - 14, CELL_H - 10, ARENA_COLORS.player, 0.012)
          .setDepth(8)
          .setInteractive({ useHandCursor: true });
        hit.setData('cell', { col, row } satisfies ArenaCell);
        hit.on('pointerover', () => {
          if (this.state.phase === 'planning') {
            hit.setFillStyle(ARENA_COLORS.player, 0.18).setStrokeStyle(2, ARENA_COLORS.player, 0.9);
          }
        });
        hit.on('pointerout', () => this.paintPlacementCell(hit));
        hit.on('pointerdown', () => this.placeSelectedAt({ col, row }));
        this.cellHits.push(hit);
      }
    }

    const enemyTag = this.add.rectangle(BOARD_X + 54, BOARD_Y + 18, 92, 25, 0x17343d, 0.86)
      .setStrokeStyle(1, ARENA_COLORS.enemy, 0.62)
      .setDepth(10);
    const playerTag = this.add.rectangle(BOARD_X + 64, BOARD_Y + PLAYER_FIRST_ROW * CELL_H + 18, 112, 25, 0x17343d, 0.86)
      .setStrokeStyle(1, ARENA_COLORS.player, 0.62)
      .setDepth(10);
    arenaText(this, enemyTag.x, enemyTag.y - 1, 'RIVAL SIDE', 9, '#ffc0ba').setOrigin(0.5).setFontStyle('bold').setLetterSpacing(1).setDepth(11);
    arenaText(this, playerTag.x, playerTag.y - 1, 'FORMATION', 9, '#bceff4').setOrigin(0.5).setFontStyle('bold').setLetterSpacing(1).setDepth(11);
    this.refreshPlacementCells();
  }

  private paintPlacementCell(hit: Phaser.GameObjects.Rectangle): void {
    const active = this.state.phase === 'planning' && this.selectedFighterId !== null;
    hit.setFillStyle(ARENA_COLORS.player, active ? 0.055 : 0.008);
    if (active) hit.setStrokeStyle(1, ARENA_COLORS.player, 0.22);
    else hit.setStrokeStyle();
  }

  private refreshPlacementCells(): void {
    for (const hit of this.cellHits) this.paintPlacementCell(hit);
  }

  private drawRightPanel(): void {
    const encounter = arenaEncounter(this.run.fightIndex);
    if (!TOUCH_INPUT) {
      arenaPanel(this, 830, 76, 430, 42, encounter.boss ? 0xe27664 : 0xf0c45d, 0.94);
      arenaText(this, 846, 88, 'RIVAL PLAN', 9, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(1);
      encounter.summary.forEach((entry, index) => {
        const chipX = 930 + index * 106;
        this.add.rectangle(chipX, 84, 98, 26, ARENA_COLORS.panelLight, 0.98)
          .setOrigin(0)
          .setStrokeStyle(1, entry.warning ? ARENA_COLORS.brassLight : ARENA_COLORS.line, 0.8);
        arenaText(this, chipX + 49, 97, entry.label, 8, entry.warning ? ARENA_COLORS.gold : ARENA_COLORS.muted)
          .setOrigin(0.5)
          .setFontStyle('bold');
      });
    }

    this.shopButton = arenaButton(this, TOUCH_INPUT ? 790 : 974, ACTION_Y, TOUCH_INPUT ? 154 : 174, TOUCH_INPUT ? 46 : 48, TOUCH_INPUT ? 'SHOP' : 'OPEN SHOP', () => {
      if (this.state.phase !== 'planning') return;
      this.sidebarMode = 'shop';
      this.drawerOpen = !this.drawerOpen || !this.detailPanel?.visible;
      this.refreshSidebar();
    }, ARENA_COLORS.player);
    this.shopButton.root.setDepth(40);

    const firstRecruitNeeded = this.run.fightIndex === 0
      && deployedFighters(this.run).length < fieldLimitForFight(this.run.fightIndex);
    this.startButton = arenaButton(
      this,
      TOUCH_INPUT ? 1006 : 1167,
      ACTION_Y,
      TOUCH_INPUT ? 218 : 194,
      TOUCH_INPUT ? 50 : 48,
      firstRecruitNeeded ? (TOUCH_INPUT ? 'RECRUIT FIGHTER' : 'RECRUIT 1 MORE') : (TOUCH_INPUT ? 'START FIGHT' : 'START BATTLE'),
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
    this.startButton.root.setDepth(40);

    this.detailPanel = this.add.container(DRAWER_X, DRAWER_Y).setScale(DRAWER_SCALE).setDepth(1000).setVisible(false);
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
    const reserves = reserveFighters(this.run);
    const fieldCount = deployedFighters(this.run).length;
    const fieldCap = fieldLimitForFight(this.run.fightIndex);
    const slotXs = TOUCH_INPUT ? [430, 510, 590] : [510, 610, 710];
    const dock = TOUCH_INPUT
      ? arenaPanel(this, 16, DOCK_Y, 1128, 92, ARENA_COLORS.player, 0.96)
      : arenaPanel(this, 352, 598, 516, 110, ARENA_COLORS.player, 0.94);
    dock.setDepth(12);
    if (TOUCH_INPUT) {
      arenaTitle(this, 34, ROSTER_LABEL_Y, `FORMATION  ${fieldCount}/${fieldCap}`, 13, ARENA_COLORS.text).setDepth(14);
      arenaText(this, 36, DOCK_Y + 34, this.selectedFighterId === null ? 'SELECT A FIGHTER' : 'TAP A BLUE SLOT TO PLACE', 9, ARENA_COLORS.muted)
        .setFontStyle('bold')
        .setLetterSpacing(0.6)
        .setDepth(14);
      arenaText(this, 510, BENCH_LABEL_Y, `RESERVE  ${reserves.length}/${MAX_RESERVE_FIGHTERS}`, 9, ARENA_COLORS.muted)
        .setOrigin(0.5)
        .setFontStyle('bold')
        .setLetterSpacing(1.2)
        .setDepth(14);
    } else {
      arenaTitle(this, 610, ROSTER_LABEL_Y, `FORMATION ${fieldCount}/${fieldCap}`, 13, ARENA_COLORS.text).setOrigin(0.5).setDepth(14);
      arenaText(this, 610, BENCH_LABEL_Y, `RESERVE  ${reserves.length}/${MAX_RESERVE_FIGHTERS}`, 9, ARENA_COLORS.muted)
        .setOrigin(0.5)
        .setFontStyle('bold')
        .setLetterSpacing(1.2)
        .setDepth(14);
    }
    slotXs.forEach((x, index) => {
      const fighter = reserves[index];
      const selected = fighter?.id === this.selectedFighterId;
      const radius = TOUCH_INPUT ? 29 : 30;
      this.add.circle(x, RESERVE_Y, radius + 3, 0x081b20, 0.72).setDepth(14);
      this.add.circle(x, RESERVE_Y, radius, selected ? ARENA_COLORS.goldFill : ARENA_COLORS.panelLight, fighter ? 0.96 : 0.7)
        .setStrokeStyle(selected ? 3 : 1.5, selected ? ARENA_COLORS.goldFill : ARENA_COLORS.line, selected ? 1 : 0.7)
        .setDepth(14);
      if (!fighter) {
        arenaText(this, x, RESERVE_Y - 1, '+', 18, ARENA_COLORS.muted).setOrigin(0.5).setDepth(15);
        return;
      }
      const definition = arenaUnitById(fighter.definitionId);
      const portrait = this.addUnitPortrait(fighter.definitionId, x, RESERVE_Y - 3, TOUCH_INPUT ? 62 : 64).setDepth(15);
      portrait.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectFighter(fighter.id));
      if (!TOUCH_INPUT) {
        arenaText(this, x, RESERVE_Y + 30, definition.name.toUpperCase(), 8, ARENA_COLORS.text)
          .setOrigin(0.5)
          .setFontStyle('bold')
          .setStroke('#10272d', 2)
          .setDepth(16);
      }
      if (fighter.tier === 1) {
        arenaText(this, x - 24, RESERVE_Y - 25, '★', 14, ARENA_COLORS.gold)
          .setFontStyle('bold')
          .setStroke('#10272d', 2)
          .setDepth(16);
      }
    });
  }

  private refreshSidebar(): void {
    if (!this.detailPanel) return;
    this.detailPanel.removeAll(true);
    for (const view of this.views.values()) {
      const coveredByDrawer = !TOUCH_INPUT && this.drawerOpen && view.root.x >= DRAWER_X - 46;
      view.root.setVisible(!view.deathStarted && !coveredByDrawer);
    }
    if (this.state.phase !== 'planning' || !this.drawerOpen) {
      this.detailPanel.setVisible(false);
      this.sidebarContent = undefined;
      return;
    }
    this.detailPanel.setVisible(true);
    if (TOUCH_INPUT) {
      const scrim = this.add.rectangle(-DRAWER_X, -DRAWER_Y, 1280, GAME_HEIGHT, 0x07191d, 0.3).setOrigin(0).setInteractive();
      scrim.on('pointerdown', () => {
        this.drawerOpen = false;
        this.refreshSidebar();
      });
      this.detailPanel.add(scrim);
    }
    const blocker = this.add.rectangle(DRAWER_W / 2, DRAWER_H / 2, DRAWER_W, DRAWER_H, 0xffffff, 0.001).setInteractive();
    const frame = arenaPanel(this, 0, 0, DRAWER_W, DRAWER_H, this.sidebarMode === 'shop' ? ARENA_COLORS.goldFill : ARENA_COLORS.player, 0.985);
    const heading = arenaTitle(this, TOUCH_INPUT ? 24 : 22, TOUCH_INPUT ? 14 : 18, this.sidebarMode === 'shop' ? 'RECRUIT YOUR NEXT FIGHTER' : 'FIGHTER DETAILS', TOUCH_INPUT ? 16 : 18, ARENA_COLORS.text);
    const close = arenaButton(this, DRAWER_W - (TOUCH_INPUT ? 54 : 34), TOUCH_INPUT ? 28 : 27, TOUCH_INPUT ? 82 : 46, 34, TOUCH_INPUT ? 'CLOSE' : 'X', () => {
      this.drawerOpen = false;
      this.refreshSidebar();
    }, ARENA_COLORS.enemy);
    const body = this.add.container(TOUCH_INPUT ? 24 : 34, TOUCH_INPUT ? 52 : 64);
    this.detailPanel.add([blocker, frame, heading, close.root, body]);
    this.sidebarContent = body;
    if (this.sidebarMode === 'shop') this.renderShopSidebar();
    else this.renderFighterSidebar();
  }

  private renderShopSidebar(): void {
    if (!this.sidebarContent) return;
    if (TOUCH_INPUT) {
      this.renderMobileShopSidebar();
      return;
    }
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

  private renderMobileShopSidebar(): void {
    if (!this.sidebarContent) return;
    const nodes: Phaser.GameObjects.GameObject[] = [];
    const fieldSlotsOpen = Math.max(0, fieldLimitForFight(this.run.fightIndex) - deployedFighters(this.run).length);
    nodes.push(arenaText(
      this,
      0,
      -4,
      fieldSlotsOpen > 0 ? `${fieldSlotsOpen} FIELD SLOT${fieldSlotsOpen === 1 ? '' : 'S'} OPEN` : 'TEAM FULL · RECRUITS MOVE TO RESERVE',
      9,
      fieldSlotsOpen > 0 ? '#bceff4' : ARENA_COLORS.muted
    ).setFontStyle('bold').setLetterSpacing(0.9));

    this.run.shopOffers.forEach((offer, index) => {
      const definition = arenaUnitById(offer.definitionId);
      const x = index * 356;
      const accent = definition.role === 'support' ? 0x65d3a0 : definition.role === 'aoe' ? 0xff9b66 : ARENA_COLORS.player;
      const frame = arenaPanel(this, x, 16, 340, 114, accent, 0.98);
      const portrait = this.addUnitPortrait(offer.definitionId, x + 52, 73, 90);
      const title = arenaTitle(this, x + 104, 28, definition.name.toUpperCase(), 14, ARENA_COLORS.text).setWordWrapWidth(132);
      const meta = arenaText(this, x + 104, 58, definition.role.toUpperCase(), 9, ARENA_COLORS.muted).setFontStyle('bold').setLetterSpacing(0.8);
      const cost = arenaTitle(this, x + 104, 82, `${offer.cost} GOLD`, 14, ARENA_COLORS.gold);
      const buy = arenaButton(this, x + 278, 74, 106, 42, 'RECRUIT', () => {
        const run = cloneArenaRun(this.run);
        if (buyArenaOffer(run, offer.id)) this.scene.restart({ run });
      }, 0x65d3a0);
      buy.setEnabled(canBuyArenaOffer(this.run, offer.id));
      nodes.push(frame, portrait, title, meta, cost, buy.root);
    });

    if (this.run.shopOffers.length === 0) {
      nodes.push(arenaTitle(this, 530, 62, 'MARKET SOLD OUT', 18, ARENA_COLORS.muted).setOrigin(0.5));
    }

    const reroll = arenaButton(this, 162, 164, 310, 38, `REROLL · ${REROLL_COST} GOLD`, () => {
      const run = cloneArenaRun(this.run);
      if (rerollArenaShop(run)) this.scene.restart({ run });
    }, ARENA_COLORS.player);
    reroll.setEnabled(this.run.rerollsLeft > 0 && this.run.gold >= REROLL_COST);
    nodes.push(reroll.root);
    const nextCap = fieldLimitForFight(this.run.fightIndex + 1);
    nodes.push(arenaText(
      this,
      350,
      151,
      arenaEncounter(this.run.fightIndex).boss
        ? 'FINAL FIGHT · BUILD THE STRONGEST FIVE-FIGHTER TEAM'
        : `${this.run.rerollsLeft > 0 ? '1 REROLL AVAILABLE' : 'REROLL USED'}  ·  WIN TO UNLOCK TEAM CAP ${nextCap}`,
      9,
      ARENA_COLORS.muted
    ).setFontStyle('bold').setLetterSpacing(0.7));
    this.sidebarContent.add(nodes);
  }

  private renderFighterSidebar(): void {
    if (!this.sidebarContent) return;
    if (TOUCH_INPUT) {
      this.renderMobileFighterSidebar();
      return;
    }
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
      const box = this.add.rectangle(x, 130, 104, 34, ARENA_COLORS.panelLight, 0.96).setOrigin(0).setStrokeStyle(1, ARENA_COLORS.line, 0.7);
      nodes.push(box);
      nodes.push(arenaText(this, x + 8, 137, stat.label, 8, ARENA_COLORS.muted).setFontStyle('bold'));
      nodes.push(arenaTitle(this, x + 96, 134, `${stat.value}`, 13, ARENA_COLORS.text).setOrigin(1, 0));
    });
    if (upgrade) {
      const box = this.add.rectangle(0, 174, 328, 66, ARENA_COLORS.panelLight, 0.98).setOrigin(0).setStrokeStyle(1, fighter.tier === 1 ? ARENA_COLORS.goldFill : ARENA_COLORS.brass, 0.85);
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

  private renderMobileFighterSidebar(): void {
    if (!this.sidebarContent) return;
    const fighter = this.run.fighters.find((candidate) => candidate.id === this.selectedFighterId) ?? this.run.fighters[0];
    if (!fighter) return;
    const definition = arenaUnitById(fighter.definitionId);
    const upgrade = definition.upgradePaths?.[0];
    const unit = this.state.units.find((candidate) => candidate.rosterId === fighter.id);
    const hp = unit?.maxHp ?? definition.hp * (fighter.tier === 1 ? upgrade?.hpMultiplier ?? 1 : 1);
    const damage = unit?.combat.damage ?? definition.damage * (fighter.tier === 1 ? upgrade?.damageMultiplier ?? 1 : 1);
    const nodes: Phaser.GameObjects.GameObject[] = [];

    nodes.push(arenaPanel(this, 0, 12, 104, 104, fighter.tier === 1 ? ARENA_COLORS.goldFill : ARENA_COLORS.player, 0.98));
    nodes.push(this.addUnitPortrait(fighter.definitionId, 52, 64, 94));
    nodes.push(arenaTitle(this, 124, 14, definition.name.toUpperCase(), 18, ARENA_COLORS.text));
    nodes.push(arenaText(this, 124, 44, `${definition.role.toUpperCase()} · ${fighter.tier === 1 ? 'TIER II' : 'TIER I'}`, 10, fighter.tier === 1 ? ARENA_COLORS.gold : '#bceff4')
      .setFontStyle('bold')
      .setLetterSpacing(0.8));
    nodes.push(arenaText(this, 124, 69, definition.blurb, 11, ARENA_COLORS.muted).setWordWrapWidth(248));

    [
      { label: 'HP', value: Math.round(hp) },
      { label: 'DMG', value: Math.round(damage) },
      { label: 'RANGE', value: definition.range.toFixed(1) }
    ].forEach((stat, index) => {
      const x = 400 + index * 104;
      const box = this.add.rectangle(x, 18, 94, 72, ARENA_COLORS.panelLight, 0.96).setOrigin(0).setStrokeStyle(1, ARENA_COLORS.line, 0.7);
      nodes.push(box);
      nodes.push(arenaText(this, x + 10, 29, stat.label, 9, ARENA_COLORS.muted).setFontStyle('bold'));
      nodes.push(arenaTitle(this, x + 84, 50, `${stat.value}`, 18, ARENA_COLORS.text).setOrigin(1, 0));
    });

    if (upgrade) {
      const upgradeBox = this.add.rectangle(724, 18, 338, 100, ARENA_COLORS.panelLight, 0.96)
        .setOrigin(0)
        .setStrokeStyle(1.5, fighter.tier === 1 ? ARENA_COLORS.goldFill : ARENA_COLORS.brass, 0.85);
      nodes.push(upgradeBox);
      nodes.push(arenaTitle(this, 740, 31, fighter.tier === 1 ? `${upgrade.name.toUpperCase()} · OWNED` : upgrade.name.toUpperCase(), 13, fighter.tier === 1 ? ARENA_COLORS.gold : ARENA_COLORS.text));
      nodes.push(arenaText(this, 740, 60, upgrade.blurb, 10, ARENA_COLORS.muted).setWordWrapWidth(300));
    }

    nodes.push(arenaText(this, 0, 148, this.unitAdvice(definition.id), 9, ARENA_COLORS.muted).setWordWrapWidth(440));
    if (upgrade && fighter.tier === 0) {
      const upgradeButton = arenaButton(this, 620, 166, 204, 40, `UPGRADE · ${upgrade.cost} GOLD`, () => {
        const run = cloneArenaRun(this.run);
        if (upgradeArenaFighter(run, fighter.id)) this.scene.restart({ run });
      }, ARENA_COLORS.goldFill);
      upgradeButton.setEnabled(this.run.gold >= upgrade.cost);
      nodes.push(upgradeButton.root);
    }
    if (fighter.cell) {
      const bench = arenaButton(this, 864, 166, 204, 40, 'MOVE TO RESERVE', () => {
        const run = cloneArenaRun(this.run);
        if (benchArenaFighter(run, fighter.id)) this.scene.restart({ run });
      }, ARENA_COLORS.player);
      bench.setEnabled(reserveFighters(this.run).length < MAX_RESERVE_FIGHTERS && deployedFighters(this.run).length > 1);
      nodes.push(bench.root);
    } else {
      nodes.push(arenaText(this, 510, 151, 'RESERVE SELECTED · TAP AN EMPTY BLUE SLOT', 10, '#bceff4').setFontStyle('bold'));
    }
    this.sidebarContent.add(nodes);
  }

  private createUnitView(unit: ArenaUnitState): void {
    const definition = arenaUnitById(unit.definitionId);
    const teamColor = unit.team === 'player' ? ARENA_COLORS.player : ARENA_COLORS.enemy;
    const tank = definition.role === 'tank';
    const shadowW = TOUCH_INPUT ? (tank ? 86 : 74) : (tank ? 72 : 62);
    const ringW = TOUCH_INPUT ? (tank ? 92 : 80) : (tank ? 78 : 68);
    const groundY = TOUCH_INPUT ? 25 : 19;
    const shadow = this.add.ellipse(0, groundY, shadowW, TOUCH_INPUT ? 22 : 17, 0x092127, 0.34);
    const selection = this.add.ellipse(0, groundY - 1, ringW + 10, TOUCH_INPUT ? 34 : 28, ARENA_COLORS.goldFill, 0.12)
      .setStrokeStyle(3, ARENA_COLORS.goldFill, 0.95)
      .setVisible(false);
    const ring = this.add.ellipse(0, groundY - 1, ringW, TOUCH_INPUT ? 29 : 24, teamColor, 0.13)
      .setStrokeStyle(2, teamColor, 0.9);

    const sheet = definition.assetKind === 'fighter'
      ? FIGHTER_SHEETS[definition.assetId]
      : WAVE_SHEETS[definition.assetId];
    const sprite = this.add.sprite(0, TOUCH_INPUT ? -10 : -7, sheet.key, 0);
    const size = TOUCH_INPUT
      ? (tank ? 116 : definition.role === 'fast' ? 100 : 108)
      : (tank ? 100 : definition.role === 'fast' ? 86 : 92);
    sprite.setDisplaySize(size, size);
    if (definition.assetKind === 'fighter') {
      sprite.setFrame(fighterSheetFrame(FIGHTER_SHEETS[definition.assetId], 'idle'));
    }
    const hpBar = this.add.graphics();
    const nameY = TOUCH_INPUT ? 48 : 40;
    const nameWidth = Phaser.Math.Clamp(definition.name.length * (TOUCH_INPUT ? 7 : 6) + 22, 68, TOUCH_INPUT ? 126 : 112);
    const namePlate = this.add.rectangle(0, nameY + 1, nameWidth, TOUCH_INPUT ? 20 : 18, 0x10272d, 0.88)
      .setStrokeStyle(1, teamColor, 0.78);
    const name = arenaText(this, 0, nameY, definition.name, TOUCH_INPUT ? 9 : 9, unit.team === 'player' ? '#c8f5f8' : '#ffd1cc')
      .setOrigin(0.5)
      .setFontStyle('bold')
      .setLetterSpacing(0.2);
    const root = this.add.container(0, 0, [shadow, selection, ring, sprite, hpBar, namePlate, name]);
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
    const wasSelected = this.selectedFighterId === fighterId;
    this.selectedFighterId = fighterId;
    for (const [id, view] of this.views) {
      const unit = this.state.units.find((candidate) => candidate.id === id);
      view.selection.setVisible(unit?.rosterId === fighterId);
    }
    if (showSidebar) {
      if (TOUCH_INPUT) {
        this.sidebarMode = 'fighter';
        this.drawerOpen = wasSelected;
      } else {
        this.sidebarMode = 'fighter';
        this.drawerOpen = true;
      }
    }
    this.refreshPlacementCells();
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
    this.refreshPlacementCells();
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
    const width = TOUCH_INPUT ? 64 : 56;
    const y = TOUCH_INPUT ? 35 : 28;
    view.hpBar.clear();
    view.hpBar.fillStyle(0x05070b, 0.95).fillRoundedRect(-width / 2, y, width, 8, 3);
    const color = ratio > 0.55 ? 0x62d497 : ratio > 0.25 ? 0xe0b85c : 0xe85e66;
    view.hpBar.fillStyle(color, 1).fillRoundedRect(-width / 2 + 2, y + 2, (width - 4) * ratio, 4, 2);
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

    const shade = this.add.rectangle(0, 0, 1280, GAME_HEIGHT, 0x24434c, 0.46).setOrigin(0).setInteractive();
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
    this.resultOverlay = this.add.container(
      640,
      GAME_HEIGHT / 2,
      [shade.setPosition(-640, -GAME_HEIGHT / 2), panel, crestGlow, crest, title, body]
    ).setDepth(500);

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
