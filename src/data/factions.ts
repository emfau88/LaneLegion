import type { FactionDefinition } from '../model/FactionDefinition';

export const FACTIONS: FactionDefinition[] = [
  {
    id: 'ironclad',
    name: 'Ironclad Legion',
    difficultyStars: 1,
    style: 'Stable frontline, forgiving to play.',
    strengths: 'Tough tanks, strong physical defense',
    weaknesses: 'Weak vs magic and big swarms',
    passiveDesc: 'All tanks gain +8% max HP.',
    color: 0x6f8fb5,
    colorDark: 0x3a5273,
    fighterIds: ['shield_guard', 'hammer_recruit', 'ballista_scout', 'banner_bearer', 'steel_hound', 'fortress_golem']
  },
  {
    id: 'ember',
    name: 'Ember Covenant',
    difficultyStars: 2,
    style: 'Fragile casters with huge area damage.',
    strengths: 'Best AOE, melts swarms',
    weaknesses: 'Fragile, positioning matters',
    passiveDesc: 'Magic damage fighters deal +6% damage.',
    color: 0xe08a3c,
    colorDark: 0x9c5218,
    fighterIds: ['spark_adept', 'ember_mage', 'ash_guard', 'fire_imp', 'sun_archer', 'phoenix_vessel']
  },
  {
    id: 'wildroot',
    name: 'Wildroot Clans',
    difficultyStars: 2,
    style: 'Cheap units and regeneration. Wins long fights.',
    strengths: 'Sustain, strong in drawn-out battles',
    weaknesses: 'Weak vs burst and boss waves',
    passiveDesc: 'All fighters regenerate 0.4% max HP per second in battle.',
    color: 0x71a852,
    colorDark: 0x3e6b2c,
    fighterIds: ['rootling', 'briar_warrior', 'moss_shaman', 'barkback_beast', 'vine_spitter', 'grove_titan']
  },
  {
    id: 'shadow',
    name: 'Shadow Pact',
    difficultyStars: 3,
    style: 'Debuffs, lifesteal and risky damage.',
    strengths: 'High damage, cripples enemies',
    weaknesses: 'Hard to play, punishes mistakes',
    passiveDesc: 'Hits slow enemy attack speed by 3% (stacks up to 5 times).',
    color: 0x9a6fd0,
    colorDark: 0x5b3a8a,
    fighterIds: ['duskblade', 'hex_acolyte', 'hollow_guard', 'shade_archer', 'leech_priest', 'void_horror']
  }
];

export const factionById = (id: string): FactionDefinition => {
  const f = FACTIONS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown faction: ${id}`);
  return f;
};
