import { ARENA_ENCOUNTERS } from '../data/arenaEncounters';
import { createArenaBattle } from '../model/createArenaBattle';
import {
  advanceArenaRun,
  arenaRunPlacements,
  buyArenaOffer,
  cloneArenaRun,
  createArenaRun,
  deployArenaFighter,
  MAX_DEPLOYED_FIGHTERS,
  rerollArenaShop,
  upgradeArenaFighter
} from '../model/ArenaRunSystem';
import type { ArenaPlacement } from '../model/ArenaTypes';
import { drainArenaEvents, startArenaBattle, tickArenaBattle } from '../systems/ArenaBattleSystem';

const layouts: Record<string, ArenaPlacement[]> = {
  protected: [
    { definitionId: 'shield_guard', col: 3, row: 3 },
    { definitionId: 'ranger', col: 1, row: 5 },
    { definitionId: 'fire_mage', col: 5, row: 5 },
    { definitionId: 'healer', col: 3, row: 5 }
  ],
  exposedBackline: [
    { definitionId: 'shield_guard', col: 6, row: 5 },
    { definitionId: 'ranger', col: 1, row: 3 },
    { definitionId: 'fire_mage', col: 3, row: 3 },
    { definitionId: 'healer', col: 0, row: 3 }
  ],
  tightCenter: [
    { definitionId: 'shield_guard', col: 3, row: 3 },
    { definitionId: 'ranger', col: 2, row: 4 },
    { definitionId: 'fire_mage', col: 4, row: 4 },
    { definitionId: 'healer', col: 3, row: 4 }
  ],
  splitCorners: [
    { definitionId: 'shield_guard', col: 0, row: 3 },
    { definitionId: 'ranger', col: 0, row: 5 },
    { definitionId: 'fire_mage', col: 6, row: 5 },
    { definitionId: 'healer', col: 6, row: 3 }
  ]
};

interface Result {
  outcome: string;
  time: number;
  playerSurvivors: string[];
  enemySurvivors: string[];
}

const simulate = (placements: ArenaPlacement[], fightIndex = 0): Result => {
  const state = createArenaBattle(placements, fightIndex);
  startArenaBattle(state);
  while (state.phase === 'battle') {
    tickArenaBattle(state, 1 / 30);
    drainArenaEvents(state);
  }
  return {
    outcome: state.phase,
    time: Number(state.time.toFixed(2)),
    playerSurvivors: state.units.filter((unit) => unit.team === 'player' && unit.alive).map((unit) => unit.definitionId),
    enemySurvivors: state.units.filter((unit) => unit.team === 'enemy' && unit.alive).map((unit) => unit.definitionId)
  };
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const formationResults = Object.entries(layouts).map(([name, placements]) => {
  const first = simulate(placements);
  const second = simulate(placements);
  assert(JSON.stringify(first) === JSON.stringify(second), `${name} is not deterministic`);
  return { name, ...first };
});

const verifyRunEconomy = (): void => {
  const run = createArenaRun();
  assert(run.shopOffers.length === 3, 'Shop must begin with exactly three offers');
  const beforeReroll = run.shopOffers.map((offer) => offer.definitionId).join(',');
  assert(rerollArenaShop(run), 'The first reroll should succeed');
  assert(run.rerollsLeft === 0 && run.gold === 4, 'Reroll must cost one gold and be usable once');
  assert(run.shopOffers.map((offer) => offer.definitionId).join(',') !== beforeReroll, 'Reroll must change the offers');
  assert(!rerollArenaShop(run), 'A second reroll in the same fight must fail');

  const purchaseRun = createArenaRun();
  const affordable = purchaseRun.shopOffers.find((offer) => offer.cost <= purchaseRun.gold);
  assert(Boolean(affordable), 'Initial shop needs an affordable offer');
  const goldBefore = purchaseRun.gold;
  assert(buyArenaOffer(purchaseRun, affordable!.id), 'Affordable offer should be purchasable');
  assert(purchaseRun.fighters.length === 5, 'Purchase must add one fighter');
  assert(purchaseRun.gold === goldBefore - affordable!.cost, 'Purchase must deduct its listed cost');

  purchaseRun.gold = 20;
  assert(upgradeArenaFighter(purchaseRun, 1), 'A tier-I fighter should upgrade once');
  assert(!upgradeArenaFighter(purchaseRun, 1), 'A fighter must not upgrade twice');
  assert(advanceArenaRun(purchaseRun), 'A cleared non-boss fight should advance the run');
  assert(purchaseRun.fightIndex === 1 && purchaseRun.rerollsLeft === 1, 'Next fight must refresh shop and reroll');

  const reserveRun = cloneArenaRun(purchaseRun);
  while (reserveRun.fighters.filter((fighter) => fighter.cell !== null).length < MAX_DEPLOYED_FIGHTERS) {
    const reserve = reserveRun.fighters.find((fighter) => fighter.cell === null);
    if (!reserve) break;
    assert(deployArenaFighter(reserveRun, reserve.id, { col: 0, row: 4 }), 'Reserve should deploy into an empty cell');
  }
};

const campaign = createArenaRun();
const campaignResults = ARENA_ENCOUNTERS.map((encounter, fightIndex) => {
  if (fightIndex === 1) {
    const priorities = ['ranger', 'fire_mage', 'healer', 'shield_guard'];
    const offer = [...campaign.shopOffers].sort(
      (a, b) => priorities.indexOf(a.definitionId) - priorities.indexOf(b.definitionId)
    )[0];
    assert(buyArenaOffer(campaign, offer.id), 'Fight-two shop purchase should be affordable');
    assert(upgradeArenaFighter(campaign, 1), 'Fight-two Shield Guard upgrade should be affordable');
  }
  if (fightIndex === 2) assert(upgradeArenaFighter(campaign, 2), 'Fight-three Ranger upgrade should be affordable');
  if (fightIndex === 3) assert(upgradeArenaFighter(campaign, 3), 'Boss-prep Fire Mage upgrade should be affordable');
  const run = cloneArenaRun(campaign);
  const placements = arenaRunPlacements(run);
  const first = simulate(placements, fightIndex);
  const second = simulate(placements, fightIndex);
  assert(JSON.stringify(first) === JSON.stringify(second), `${encounter.name} is not deterministic`);
  const result = { fight: fightIndex + 1, name: encounter.name, gold: campaign.gold, ...first };
  if (!encounter.boss) assert(advanceArenaRun(campaign), `Fight ${fightIndex + 1} should advance`);
  return result;
});

verifyRunEconomy();
console.log(JSON.stringify({ formationResults, campaignResults }, null, 2));

assert(formationResults.every((result) => result.time <= 40.05), 'Arena battle exceeded its time cap');
assert(formationResults.find((result) => result.name === 'protected')?.outcome === 'victory', 'Protected formation should win');
assert(formationResults.find((result) => result.name === 'exposedBackline')?.outcome === 'defeat', 'Exposed backline should lose');
assert(campaignResults.every((result) => result.outcome === 'victory'), 'Prepared roster should clear all four fights');
assert(campaignResults.every((result) => result.time >= 12 && result.time <= 30), 'Campaign fights should last roughly 12-30 seconds');
