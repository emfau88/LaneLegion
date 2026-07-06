import { CFG } from '../data/gameConfig';
import type { GameSetup, GameState } from '../model/GameState';
import type { GameEvent, KingUpgradeType } from '../model/Types';
import { createGame } from './createGame';
import { AISystem } from '../systems/AISystem';
import { tickMythium, tryBuyWorker } from '../systems/EconomySystem';
import { tickPhase, humanReady } from '../systems/PhaseSystem';
import { processSpawns } from '../systems/WaveSystem';
import { tickTargeting } from '../systems/TargetingSystem';
import { tickMovement } from '../systems/MovementSystem';
import { tickCombat } from '../systems/CombatSystem';
import { tickKings, tryBuyKingUpgrade } from '../systems/KingSystem';
import { tryBuyFighter, tryUpgradeFighter, trySellFighter } from '../systems/PlacementSystem';
import { tryQueueSend } from '../systems/SendSystem';

/**
 * Deterministic fixed-tick simulation, independent of rendering.
 * The renderer calls update() with frame delta time and reads state.
 */
export class Simulation {
  readonly state: GameState;
  private readonly ai = new AISystem();
  private acc = 0;
  private readonly dt = 1 / CFG.tickRate;

  constructor(setup: GameSetup) {
    this.state = createGame(setup);
  }

  update(deltaMs: number): void {
    if (this.isEnded()) return;
    this.acc += Math.min(deltaMs / 1000, 0.25);
    while (this.acc >= this.dt) {
      this.acc -= this.dt;
      this.tick();
      if (this.isEnded()) break;
    }
  }

  private isEnded(): boolean {
    return this.state.phase === 'ended';
  }

  private tick(): void {
    const s = this.state;
    s.time += this.dt;
    tickMythium(s, this.dt);

    if (s.phase === 'build') {
      this.ai.tickBuild(s);
      tickKings(s, this.dt);
      tickPhase(s);
      return;
    }
    if (s.phase === 'battle') {
      processSpawns(s);
      tickTargeting(s);
      tickMovement(s, this.dt);
      tickCombat(s, this.dt);
      tickKings(s, this.dt);
      tickPhase(s);
    }
  }

  /** Drain visual events for the renderer. */
  drainEvents(): GameEvent[] {
    const ev = this.state.events;
    this.state.events = [];
    return ev;
  }

  // ---- Human player actions (UI facade) ----
  placeFighter(defId: string, col: number, row: number): boolean {
    return tryBuyFighter(this.state, this.state.humanPlayerId, defId, col, row) !== null;
  }
  upgradeFighter(unitId: number): boolean {
    return tryUpgradeFighter(this.state, this.state.humanPlayerId, unitId);
  }
  sellFighter(unitId: number): boolean {
    return trySellFighter(this.state, this.state.humanPlayerId, unitId);
  }
  buyWorker(): boolean {
    return tryBuyWorker(this.state, this.state.humanPlayerId);
  }
  sendMercenary(mercId: string): boolean {
    return tryQueueSend(this.state, this.state.humanPlayerId, mercId);
  }
  buyKingUpgrade(type: KingUpgradeType): boolean {
    return tryBuyKingUpgrade(this.state, this.state.humanPlayerId, type);
  }
  toggleAutoSend(): boolean {
    const p = this.state.players[this.state.humanPlayerId];
    p.autoSend = !p.autoSend;
    return p.autoSend;
  }
  ready(): void {
    humanReady(this.state);
  }
}
