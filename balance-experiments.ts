/** Tuning experiment runner: compares economy/wave presets without changing source balance data. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Simulation } from './src/core/Simulation';
import { FACTIONS } from './src/data/factions';
import { CFG } from './src/data/gameConfig';
import { WAVES, waveByNumber } from './src/data/waves';
import { fightersOfFaction } from './src/data/fighters';
import { validCells } from './src/systems/PlacementSystem';
import { kingOf } from './src/systems/KingSystem';
import { playerFighterValue } from './src/core/util';
import type { FighterDefinition } from './src/model/UnitDefinition';
import type { GameState, WaveReport } from './src/model/GameState';
import type { Role } from './src/model/Types';

type StrategyId =
  | 'no_workers'
  | 'single_worker_after_wave_1'
  | 'single_worker_after_wave_2'
  | 'safe_worker'
  | 'worker_each_wave_after_1'
  | 'greedy_workers';
type ScenarioId = 'isolated_waves' | 'normal_ai_pressure';

interface Strategy {
  id: StrategyId;
  targetFactor: number;
}

interface TuningPreset {
  id: string;
  label: string;
  startGold?: number;
  workerCost?: number;
  mythiumPerWorkerPerSec?: number;
  wave3SwiftStalkerCount?: number;
  wave7IronCarapaceHp?: number;
}

interface WaveRow {
  preset: string;
  scenario: ScenarioId;
  faction: string;
  strategy: StrategyId;
  seed: number;
  wave: number;
  workersBefore: number;
  workersAfterBuild: number;
  workersAfterWave: number;
  incomeAfterWave: number;
  mythiumAfterWave: number;
  valueAfterBuild: number;
  recommendedValue: number;
  leaks: number;
  kingDamage: number;
  ended: boolean;
}

const OUT_DIR = join(process.cwd(), 'diagnostics', 'balance-experiments');
const HUMAN = 'p1';
const SEEDS = Array.from({ length: 12 }, (_, i) => 2003 + i * 7919);
const SCENARIOS: ScenarioId[] = ['isolated_waves', 'normal_ai_pressure'];

const STRATEGIES: Strategy[] = [
  { id: 'no_workers', targetFactor: 1.25 },
  { id: 'single_worker_after_wave_1', targetFactor: 1.08 },
  { id: 'single_worker_after_wave_2', targetFactor: 1.08 },
  { id: 'safe_worker', targetFactor: 1.1 },
  { id: 'worker_each_wave_after_1', targetFactor: 1.05 },
  { id: 'greedy_workers', targetFactor: 0.95 }
];

const PRESETS: TuningPreset[] = [
  {
    id: 'pre_patch_reference',
    label: 'Old reference: start 120, worker 50, mythium 0.10, wave 3 count 10',
    startGold: 120,
    workerCost: 50,
    mythiumPerWorkerPerSec: 0.1,
    wave3SwiftStalkerCount: 10
  },
  { id: 'current_patch', label: 'Current patch from source data' },
  { id: 'worker_35', label: 'Current patch + worker cost 35', workerCost: 35 },
  { id: 'mythium_015', label: 'Current patch + mythium rate 0.15', mythiumPerWorkerPerSec: 0.15 },
  { id: 'start_140', label: 'Current patch + start gold 140', startGold: 140 },
  {
    id: 'wave7_hp220',
    label: 'Current patch + wave 7 Iron Carapace HP 220',
    wave7IronCarapaceHp: 220
  },
  {
    id: 'wave7_hp220_mythium015',
    label: 'Current patch + wave 7 HP 220 + mythium rate 0.15',
    mythiumPerWorkerPerSec: 0.15,
    wave7IronCarapaceHp: 220
  },
  {
    id: 'wave3_back_to_10',
    label: 'Current economy but wave 3 count restored to 10',
    wave3SwiftStalkerCount: 10
  }
];

const ROLE_ROWS: Record<Role, number[]> = {
  tank: [4, 5],
  melee: [5, 6],
  ranged: [7, 8],
  aoe: [7, 8],
  support: [7, 6]
};
const COLS = [2, 3, 1, 4, 0, 5];

const BASE = {
  startGold: CFG.startGold,
  workerCost: CFG.workerCost,
  mythiumPerWorkerPerSec: CFG.mythiumPerWorkerPerSec,
  wave3Count: WAVES[2].groups[0].count,
  wave7Hp: WAVES[6].groups[0].stats.hp
};

const applyPreset = (preset: TuningPreset): void => {
  CFG.startGold = preset.startGold ?? BASE.startGold;
  CFG.workerCost = preset.workerCost ?? BASE.workerCost;
  CFG.mythiumPerWorkerPerSec = preset.mythiumPerWorkerPerSec ?? BASE.mythiumPerWorkerPerSec;
  WAVES[2].groups[0].count = preset.wave3SwiftStalkerCount ?? BASE.wave3Count;
  WAVES[6].groups[0].stats.hp = preset.wave7IronCarapaceHp ?? BASE.wave7Hp;
};

const resetPreset = (): void => {
  CFG.startGold = BASE.startGold;
  CFG.workerCost = BASE.workerCost;
  CFG.mythiumPerWorkerPerSec = BASE.mythiumPerWorkerPerSec;
  WAVES[2].groups[0].count = BASE.wave3Count;
  WAVES[6].groups[0].stats.hp = BASE.wave7Hp;
};

const fmt = (n: number): string => n.toFixed(2);
const mean = (values: number[]): number => values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
const pct = (num: number, den: number): string => (den === 0 ? '0.00' : fmt((num / den) * 100));

const csvEscape = (value: unknown): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n');
};

const disableEnemyPressure = (state: GameState): void => {
  for (const pid of state.playerOrder) {
    if (pid === HUMAN) continue;
    state.players[pid].isHuman = true;
    state.players[pid].autoSend = false;
    state.players[pid].pendingSends = [];
  }
  const enemyKing = kingOf(state, 'T2');
  if (enemyKing) {
    enemyKing.maxHp = 999999;
    enemyKing.hp = 999999;
  }
};

const snapshot = (state: GameState) => {
  const p = state.players[HUMAN];
  return {
    workers: p.workers,
    income: p.income,
    mythium: p.mythium,
    value: playerFighterValue(state, HUMAN)
  };
};

const roleValue = (state: GameState, role: Role): number => {
  let sum = 0;
  for (const unit of state.units.values()) {
    if (unit.kind === 'fighter' && unit.ownerId === HUMAN && unit.role === role) sum += unit.investedGold;
  }
  return sum;
};

const preferredAttacks = (waveNumber: number): Set<string> => {
  const armors = new Set(waveByNumber(waveNumber).groups.map((g) => g.stats.armorType));
  const out = new Set<string>();
  if (armors.has('light')) out.add('pierce');
  if (armors.has('armored')) out.add('impact');
  if (armors.has('massive')) out.add('magic');
  if (out.size === 0) out.add('pure');
  return out;
};

const pickCell = (state: GameState, role: Role): { col: number; row: number } | null => {
  const lane = state.lanes[state.players[HUMAN].laneId];
  for (const row of ROLE_ROWS[role]) {
    for (const col of COLS) {
      if (lane.grid[row][col] === null) return { col, row };
    }
  }
  return validCells(state, HUMAN)[0] ?? null;
};

const chooseFighter = (state: GameState, factionId: string, targetValue: number): FighterDefinition | null => {
  const player = state.players[HUMAN];
  const affordable = fightersOfFaction(factionId).filter((f) => f.tiers[0].cost <= player.gold);
  if (affordable.length === 0) return null;

  const currentValue = playerFighterValue(state, HUMAN);
  const tankValue = roleValue(state, 'tank');
  const needsTank = currentValue === 0 || tankValue < Math.max(45, currentValue * 0.34);
  const attacks = preferredAttacks(state.waveNumber);
  const enemyCount = waveByNumber(state.waveNumber).groups.reduce((sum, group) => sum + group.count, 0);

  return affordable
    .map((def) => {
      let score = def.tiers[0].cost;
      if (needsTank && def.role === 'tank') score += 120;
      if (!needsTank && def.role === 'tank') score -= 35;
      if (attacks.has(def.attackType)) score += 65;
      if (enemyCount >= 10 && def.role === 'aoe') score += 110;
      if (enemyCount <= 5 && def.role === 'aoe') score -= 50;
      if (currentValue > 140 && def.role === 'support') score += 35;
      if (currentValue + def.tiers[0].cost > targetValue + 80) score -= 25;
      return { def, score };
    })
    .sort((a, b) => b.score - a.score || b.def.tiers[0].cost - a.def.tiers[0].cost)[0]?.def ?? null;
};

const buyOneFighter = (sim: Simulation, factionId: string, targetValue: number): boolean => {
  const pick = chooseFighter(sim.state, factionId, targetValue);
  if (!pick) return false;
  const cell = pickCell(sim.state, pick.role);
  return cell ? sim.placeFighter(pick.id, cell.col, cell.row) : false;
};

const buyDefenseTo = (sim: Simulation, factionId: string, targetValue: number): void => {
  let guard = 0;
  while (playerFighterValue(sim.state, HUMAN) < targetValue && guard++ < 30) {
    if (!buyOneFighter(sim, factionId, targetValue)) break;
  }
};

const buyAllUsefulDefense = (sim: Simulation, factionId: string, targetValue: number): void => {
  let guard = 0;
  while (guard++ < 30) {
    if (!buyOneFighter(sim, factionId, targetValue)) break;
  }
};

const buyWorkerBeforeDefense = (sim: Simulation, strategy: Strategy): void => {
  const wave = sim.state.waveNumber;
  const workers = sim.state.players[HUMAN].workers;
  if (strategy.id === 'single_worker_after_wave_1' && wave >= 2 && workers <= CFG.startWorkers) sim.buyWorker();
  if (strategy.id === 'single_worker_after_wave_2' && wave >= 3 && workers <= CFG.startWorkers) sim.buyWorker();
  if (strategy.id === 'worker_each_wave_after_1' && wave >= 2) sim.buyWorker();
  if (strategy.id === 'greedy_workers') sim.buyWorker();
};

const buyWorkerAfterDefense = (sim: Simulation, strategy: Strategy): void => {
  if (strategy.id !== 'safe_worker') return;
  const wave = waveByNumber(sim.state.waveNumber);
  if (playerFighterValue(sim.state, HUMAN) >= wave.recommendedFighterValue) sim.buyWorker();
};

const runBuildPlan = (sim: Simulation, factionId: string, strategy: Strategy): void => {
  const target = waveByNumber(sim.state.waveNumber).recommendedFighterValue * strategy.targetFactor;
  buyWorkerBeforeDefense(sim, strategy);
  buyDefenseTo(sim, factionId, target);
  buyWorkerAfterDefense(sim, strategy);
  if (strategy.id === 'no_workers') buyAllUsefulDefense(sim, factionId, target + 220);
};

const runOne = (preset: string, scenario: ScenarioId, factionId: string, strategy: Strategy, seed: number): WaveRow[] => {
  const sim = new Simulation({ mode: '1v1', difficulty: 'normal', playerFactionId: factionId, seed });
  if (scenario === 'isolated_waves') disableEnemyPressure(sim.state);
  sim.toggleAutoSend();

  const rows: WaveRow[] = [];
  let builtWave = 0;
  let before = snapshot(sim.state);
  let afterBuild = snapshot(sim.state);

  for (let safety = 0; sim.state.phase !== 'ended' && safety < 90000; safety++) {
    if (sim.state.phase === 'build' && builtWave !== sim.state.waveNumber) {
      builtWave = sim.state.waveNumber;
      before = snapshot(sim.state);
      runBuildPlan(sim, factionId, strategy);
      afterBuild = snapshot(sim.state);
    }

    const phaseBefore = sim.state.phase;
    const waveBefore = sim.state.waveNumber;
    sim.update(250);
    sim.drainEvents();

    if (phaseBefore === 'battle' && (sim.state.phase === 'build' || sim.state.phase === 'ended')) {
      const report = sim.state.waveReport as WaveReport | null;
      const after = snapshot(sim.state);
      const team = sim.state.players[HUMAN].teamId;
      rows.push({
        preset,
        scenario,
        faction: factionId,
        strategy: strategy.id,
        seed,
        wave: waveBefore,
        workersBefore: before.workers,
        workersAfterBuild: afterBuild.workers,
        workersAfterWave: after.workers,
        incomeAfterWave: after.income,
        mythiumAfterWave: after.mythium,
        valueAfterBuild: afterBuild.value,
        recommendedValue: waveByNumber(waveBefore).recommendedFighterValue,
        leaks: report?.perPlayer[HUMAN]?.leaks ?? 0,
        kingDamage: report?.kingDamage[team] ?? 0,
        ended: sim.state.phase === 'ended'
      });
    }
  }
  return rows;
};

const grouped = <T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> => {
  const out = new Map<string, T[]>();
  for (const row of rows) out.set(keyFn(row), [...(out.get(keyFn(row)) ?? []), row]);
  return out;
};

const summarizePreset = (rows: WaveRow[]) => {
  const groups = grouped(rows, (r) => `${r.preset}|${r.scenario}`);
  return [...groups.entries()].map(([key, group]) => {
    const [preset, scenario] = key.split('|');
    const earlyWorker = group.filter((r) => r.strategy === 'single_worker_after_wave_1' || r.strategy === 'single_worker_after_wave_2');
    const safe = group.filter((r) => r.strategy === 'safe_worker');
    const noWorkers = group.filter((r) => r.strategy === 'no_workers');
    const greedy = group.filter((r) => r.strategy === 'greedy_workers');
    const workerBuys = group.filter((r) => r.workersAfterBuild > r.workersBefore);
    const earlyWindow = group.filter((r) => r.wave <= 5);
    const factionLeakRates = FACTIONS.map((f) => {
      const fRows = group.filter((r) => r.faction === f.id);
      return fRows.filter((r) => r.leaks > 0).length / Math.max(1, fRows.length);
    });
    return {
      preset,
      scenario,
      runs: new Set(group.map((r) => `${r.faction}|${r.strategy}|${r.seed}`)).size,
      overallLeakRatePct: pct(group.filter((r) => r.leaks > 0).length, group.length),
      earlyWaveLeakRatePct: pct(earlyWindow.filter((r) => r.leaks > 0).length, earlyWindow.length),
      noWorkerLeakRatePct: pct(noWorkers.filter((r) => r.leaks > 0).length, noWorkers.length),
      earlyWorkerLeakRatePct: pct(earlyWorker.filter((r) => r.leaks > 0).length, earlyWorker.length),
      safeWorkerLeakRatePct: pct(safe.filter((r) => r.leaks > 0).length, safe.length),
      greedyLeakRatePct: pct(greedy.filter((r) => r.leaks > 0).length, greedy.length),
      workerBuyLeakRatePct: pct(workerBuys.filter((r) => r.leaks > 0).length, workerBuys.length),
      avgWorkersWave5: fmt(mean(group.filter((r) => r.wave === 5).map((r) => r.workersAfterWave))),
      avgIncomeWave5: fmt(mean(group.filter((r) => r.wave === 5).map((r) => r.incomeAfterWave))),
      avgIncomeWave8: fmt(mean(group.filter((r) => r.wave === 8).map((r) => r.incomeAfterWave))),
      avgKingDamage: fmt(mean(group.map((r) => r.kingDamage))),
      factionLeakSpreadPct: fmt((Math.max(...factionLeakRates) - Math.min(...factionLeakRates)) * 100)
    };
  });
};

const summarizeStrategy = (rows: WaveRow[]) => {
  const groups = grouped(rows, (r) => `${r.preset}|${r.scenario}|${r.faction}|${r.strategy}`);
  return [...groups.entries()].map(([key, group]) => {
    const [preset, scenario, faction, strategy] = key.split('|');
    const workerBuys = group.filter((r) => r.workersAfterBuild > r.workersBefore);
    return {
      preset,
      scenario,
      faction,
      strategy,
      samples: group.length,
      leakRatePct: pct(group.filter((r) => r.leaks > 0).length, group.length),
      avgLeaks: fmt(mean(group.map((r) => r.leaks))),
      workerBuyLeakRatePct: pct(workerBuys.filter((r) => r.leaks > 0).length, workerBuys.length),
      avgWorkersWave5: fmt(mean(group.filter((r) => r.wave === 5).map((r) => r.workersAfterWave))),
      avgIncomeWave5: fmt(mean(group.filter((r) => r.wave === 5).map((r) => r.incomeAfterWave))),
      avgIncomeWave8: fmt(mean(group.filter((r) => r.wave === 8).map((r) => r.incomeAfterWave))),
      avgKingDamage: fmt(mean(group.map((r) => r.kingDamage)))
    };
  });
};

const writeReport = (presetSummary: Record<string, unknown>[], strategySummary: Record<string, unknown>[]): void => {
  const isolated = presetSummary.filter((r) => r.scenario === 'isolated_waves');
  const pressure = presetSummary.filter((r) => r.scenario === 'normal_ai_pressure');
  const top = [...isolated].sort(
    (a, b) =>
      Number(a.earlyWorkerLeakRatePct) - Number(b.earlyWorkerLeakRatePct) ||
      Number(a.factionLeakSpreadPct) - Number(b.factionLeakSpreadPct)
  );
  const chosen = top[0];
  const lines = [
    '# Balance Experiment Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Scope',
    '',
    `- Presets: ${PRESETS.map((p) => p.id).join(', ')}`,
    `- Scenarios: ${SCENARIOS.join(', ')}`,
    `- Seeds per faction/strategy/scenario/preset: ${SEEDS.length}`,
    `- Total rows: ${strategySummary.reduce((sum, row) => sum + Number(row.samples), 0)}`,
    '',
    '## Best Isolated Economy Presets',
    '',
    '| Preset | Overall leaks | Early wave leaks | No-worker leaks | Early-worker leaks | Safe-worker leaks | Worker-buy leak rate | Avg workers W5 | Avg income W8 | Faction spread |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...top.map(
      (r) =>
        `| ${r.preset} | ${r.overallLeakRatePct}% | ${r.earlyWaveLeakRatePct}% | ${r.noWorkerLeakRatePct}% | ${r.earlyWorkerLeakRatePct}% | ${r.safeWorkerLeakRatePct}% | ${r.workerBuyLeakRatePct}% | ${r.avgWorkersWave5} | ${r.avgIncomeWave8} | ${r.factionLeakSpreadPct}% |`
    ),
    '',
    '## Normal AI Pressure Check',
    '',
    '| Preset | Overall leaks | Early wave leaks | Early-worker leaks | Greedy leaks | Avg workers W5 | Avg income W8 | Avg king damage |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...pressure.map(
      (r) =>
        `| ${r.preset} | ${r.overallLeakRatePct}% | ${r.earlyWaveLeakRatePct}% | ${r.earlyWorkerLeakRatePct}% | ${r.greedyLeakRatePct}% | ${r.avgWorkersWave5} | ${r.avgIncomeWave8} | ${r.avgKingDamage} |`
    ),
    '',
    '## Current Best Candidate',
    '',
    chosen
      ? `- ${chosen.preset}: lowest isolated early-worker leak rate in this sweep, with faction spread ${chosen.factionLeakSpreadPct}%.`
      : '- No candidate selected.',
    '',
    '## Files',
    '',
    '- `preset-summary.csv`: top-level preset comparison.',
    '- `strategy-summary.csv`: preset/scenario/faction/strategy breakdown.',
    '- `waves.csv`: full flat per-wave rows.',
    ''
  ];
  writeFileSync(join(OUT_DIR, 'report.md'), lines.join('\n'));
};

const main = (): void => {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows: WaveRow[] = [];
  for (const preset of PRESETS) {
    applyPreset(preset);
    for (const scenario of SCENARIOS) {
      for (const faction of FACTIONS) {
        for (const strategy of STRATEGIES) {
          for (const seed of SEEDS) {
            rows.push(...runOne(preset.id, scenario, faction.id, strategy, seed));
          }
        }
      }
    }
  }

  resetPreset();
  const presetSummary = summarizePreset(rows);
  const strategySummary = summarizeStrategy(rows);
  writeFileSync(join(OUT_DIR, 'waves.csv'), toCsv(rows as unknown as Record<string, unknown>[]));
  writeFileSync(join(OUT_DIR, 'preset-summary.csv'), toCsv(presetSummary));
  writeFileSync(join(OUT_DIR, 'strategy-summary.csv'), toCsv(strategySummary));
  writeReport(presetSummary, strategySummary);
  console.log(`Wrote ${rows.length} wave rows to ${OUT_DIR}`);
};

main();
