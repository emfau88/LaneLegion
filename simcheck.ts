/** Headless simulation smoke test: plays full matches without rendering. Run: npx tsx simcheck.ts */
import { Simulation } from './src/core/Simulation';
import { validCells } from './src/systems/PlacementSystem';
import { fightersOfFaction } from './src/data/fighters';
import { playerFighterValue } from './src/core/util';
import { kingOf } from './src/systems/KingSystem';
import type { Difficulty, GameMode } from './src/model/Types';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.log(`  FAIL: ${msg}`);
  }
};

function runMatch(mode: GameMode, difficulty: Difficulty, faction: string, seed: number): void {
  console.log(`\n=== ${mode} vs ${difficulty} AI, faction=${faction}, seed=${seed} ===`);
  const sim = new Simulation({ mode, difficulty, playerFactionId: faction, seed });
  const s = sim.state;
  sim.toggleAutoSend();

  let safety = 0;
  let lastPhase = s.phase;
  let lastWave = 0;
  let builtThisPhase = false;
  let deaths = 0;
  let leaks = 0;
  let attacks = 0;

  while (s.phase !== 'ended' && safety++ < 60000) {
    if (s.phase === 'build') {
      if (!builtThisPhase) {
        builtThisPhase = true;
        // crude "human": buy random affordable fighters, then a worker
        const human = s.players[s.humanPlayerId];
        let guard = 0;
        while (guard++ < 15) {
          const defs = fightersOfFaction(human.factionId).filter(
            (d) => d.tiers[0].cost <= human.gold
          );
          const cells = validCells(s, human.id);
          if (defs.length === 0 || cells.length === 0) break;
          const def = defs[(guard * 7) % defs.length];
          const cell = cells[(guard * 13) % cells.length];
          sim.placeFighter(def.id, cell.col, cell.row);
        }
        sim.buyWorker();
      }
    } else {
      builtThisPhase = false;
    }

    sim.update(250); // capped internally at 0.25s of sim time per call
    for (const ev of sim.drainEvents()) {
      if (ev.type === 'death') deaths++;
      if (ev.type === 'leak') leaks++;
      if (ev.type === 'attack') attacks++;
    }

    if (s.phase !== lastPhase || s.waveNumber !== lastWave) {
      if (s.phase === 'battle') {
        const h = s.players[s.humanPlayerId];
        const e = s.players.e1;
        console.log(
          `  w${s.waveNumber} battle | you: ${Math.floor(h.gold)}g ${h.workers}wk ${h.income}inc val=${Math.floor(playerFighterValue(s, h.id))} | AI e1: ${Math.floor(e.gold)}g ${e.workers}wk ${e.income}inc val=${Math.floor(playerFighterValue(s, 'e1'))}`
        );
      }
      lastPhase = s.phase;
      lastWave = s.waveNumber;
    }
  }

  const k1 = kingOf(s, 'T1')!;
  const k2 = kingOf(s, 'T2')!;
  console.log(
    `  RESULT: winner=${s.winnerTeamId} (${s.winReason}) after wave ${s.waveNumber}, t=${s.time.toFixed(0)}s`
  );
  console.log(
    `  kings: T1=${Math.ceil(k1.hp)}/${k1.maxHp} T2=${Math.ceil(k2.hp)}/${k2.maxHp} | deaths=${deaths} leaks=${leaks} attacks=${attacks}`
  );

  check(s.phase === 'ended', 'match ended');
  check(s.winnerTeamId === 'T1' || s.winnerTeamId === 'T2', 'winner set');
  check(s.waveReport !== null || s.winReason === 'kingDestroyed', 'wave report recorded');
  check(safety < 60000, 'no infinite loop');
  check(deaths > 20, `units died in combat (deaths=${deaths})`);
  check(attacks > 100, `attacks happened (attacks=${attacks})`);
  check(playerFighterValue(s, 'e1') > 0, 'AI built fighters');
  check(s.players.e1.workers > 1 || difficulty === 'easy', 'AI bought workers');
  check(s.players.e1.income > 0, 'AI sent mercenaries (income grew)');
  check(k1.hp < k1.maxHp || k2.hp < k2.maxHp || leaks === 0, 'king damage consistent with leaks');
  if (mode === '2v2') {
    check(playerFighterValue(s, 'a1') > 0, 'ally AI built fighters');
    check(playerFighterValue(s, 'e2') > 0, 'second enemy AI built fighters');
  }
}

runMatch('1v1', 'normal', 'ironclad', 12345);
runMatch('1v1', 'hard', 'ember', 999);
runMatch('1v1', 'easy', 'shadow', 4242);
runMatch('2v2', 'normal', 'wildroot', 777);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
