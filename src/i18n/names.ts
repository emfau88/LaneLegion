/**
 * German display names/descriptions for game content, keyed by internal id.
 * The English source of truth stays in src/data/ (internal names also drive
 * sprite keys and creep defIds — never localize the data files themselves).
 * Missing entries fall back to the English data value.
 */
import { getLang } from './i18n';
import type { FactionDefinition } from '../model/FactionDefinition';
import type { FighterDefinition } from '../model/UnitDefinition';
import type { MercenaryDefinition } from '../model/MercenaryDefinition';
import type { WaveDefinition } from '../model/WaveDefinition';
import type { KingUpgradeSpec } from '../data/kingUpgrades';
import type { PlayerState } from '../model/PlayerState';

const de = (): boolean => getLang() === 'de';

// ---------- fighters ----------

/** [tier0 name, tier1 name, description] */
const FIGHTER_DE: Record<string, [string, string, string]> = {
  shield_guard: ['Schildwache', 'Eiserne Bastion', 'Günstiger Frontlinien-Tank. Hält früh die Stellung.'],
  hammer_recruit: ['Hammerrekrut', 'Kriegshammer-Veteran', 'Robuster Nahkämpfer. Knackt gepanzerte Gegner.'],
  ballista_scout: ['Ballista-Späher', 'Belagerungsschütze', 'Einzelziel-Schütze mit großer Reichweite. Zerbrechlich.'],
  banner_bearer: ['Bannerträger', 'Legionsstandarte', 'Aura: Kämpfer in der Nähe greifen schneller an.'],
  steel_hound: ['Stahlhund', 'Eisenfang', 'Schneller Raufbold, der Durchbrecher abfängt.'],
  fortress_golem: ['Festungsgolem', 'Zitadellengolem', 'Teurer Spätspiel-Koloss. Nahezu unzerstörbar.'],
  spark_adept: ['Funkenadept', 'Flammenadept', 'Günstiger Magieschaden auf Distanz.'],
  ember_mage: ['Glutmagier', 'Feuerorakel', 'Flächenschaden-Zauberer. Schmilzt Gegnergruppen.'],
  ash_guard: ['Aschenwache', 'Glutbollwerk', 'Solider Tank, der die Zauberer schützt.'],
  fire_imp: ['Feuerkobold', 'Flammenkobold', 'Günstiger Füllschaden. Stirbt schnell, trifft schnell.'],
  sun_archer: ['Sonnenschütze', 'Sonnenjäger', 'Verlässlicher physischer Fernkampfschaden.'],
  phoenix_vessel: ['Phönixgefäß', 'Phönix-Avatar', 'Teurer, skalierender Schadensträger.'],
  rootling: ['Wurzling', 'Dornling', 'Günstiger Schwarm-Tank. Kauf gleich mehrere.'],
  briar_warrior: ['Dornenkrieger', 'Dornenklinge', 'Aggressiver Nahkämpfer.'],
  moss_shaman: ['Moosschamane', 'Ahnenschamane', 'Heilt regelmäßig den verwundetsten Kämpfer in der Nähe.'],
  barkback_beast: ['Borkenrücken', 'Uralter Borkenrücken', 'Dickhäutiger Tank, der Schläge wegsteckt.'],
  vine_spitter: ['Rankenspucker', 'Giftranke', 'Fernkämpfer mit ätzenden Dornen.'],
  grove_titan: ['Hain-Titan', 'Weltwurzel-Titan', 'Spätspiel-Tank mit Ausdauer. Regeneriert durch Schlachten.'],
  duskblade: ['Dämmerklinge', 'Nachtklinge', 'Günstiger Assassinen-Nahkampfschaden.'],
  hex_acolyte: ['Fluch-Akolyth', 'Fluchbinder', 'Schwächungs-Magier. Jeder Treffer raubt Angriffstempo.'],
  hollow_guard: ['Hohlwache', 'Hohlwächter', 'Riskanter Tank: stark für den Preis, aber ohne Nachhaltigkeit.'],
  shade_archer: ['Schattenschütze', 'Düsterschütze', 'Physischer Langstreckenschaden aus dem Dunkel.'],
  leech_priest: ['Egelpriester', 'Blutorakel', 'Aura: Kämpfer in der Nähe heilen sich um einen Teil ihres Schadens.'],
  void_horror: ['Leerenschrecken', 'Abgrundschrecken', 'Teures Monster, das im Spätspiel furchteinflößend wird.']
};

export const fighterTierName = (def: FighterDefinition, tier: 0 | 1): string =>
  de() ? FIGHTER_DE[def.id]?.[tier] ?? def.tiers[tier].name : def.tiers[tier].name;

export const fighterDesc = (def: FighterDefinition): string =>
  de() ? FIGHTER_DE[def.id]?.[2] ?? def.desc : def.desc;

// ---------- factions ----------

interface FactionDe {
  name: string;
  style: string;
  strengths: string;
  weaknesses: string;
  passiveDesc: string;
}

const FACTION_DE: Record<string, FactionDe> = {
  ironclad: {
    name: 'Eiserne Legion',
    style: 'Stabile Frontlinie, verzeiht Fehler.',
    strengths: 'Zähe Tanks, starke physische Verteidigung',
    weaknesses: 'Schwach gegen Magie und große Schwärme',
    passiveDesc: 'Alle Tanks erhalten +8 % maximale HP.'
  },
  ember: {
    name: 'Glutbund',
    style: 'Zerbrechliche Zauberer mit riesigem Flächenschaden.',
    strengths: 'Bester Flächenschaden, schmilzt Schwärme',
    weaknesses: 'Zerbrechlich, Positionierung entscheidet',
    passiveDesc: 'Magie-Kämpfer verursachen +6 % Schaden.'
  },
  wildroot: {
    name: 'Wildwurzel-Klane',
    style: 'Günstige Einheiten und Regeneration. Gewinnt lange Kämpfe.',
    strengths: 'Ausdauer, stark in zähen Schlachten',
    weaknesses: 'Schwach gegen Burst und Boss-Wellen',
    passiveDesc: 'Alle Kämpfer regenerieren im Kampf 0,4 % max. HP pro Sekunde.'
  },
  shadow: {
    name: 'Schattenpakt',
    style: 'Schwächungen, Lebensraub und riskanter Schaden.',
    strengths: 'Hoher Schaden, verkrüppelt Gegner',
    weaknesses: 'Schwer zu spielen, bestraft Fehler',
    passiveDesc: 'Treffer verlangsamen das gegnerische Angriffstempo um 3 % (bis zu 5×).'
  }
};

export const factionName = (f: FactionDefinition): string =>
  de() ? FACTION_DE[f.id]?.name ?? f.name : f.name;
export const factionStyle = (f: FactionDefinition): string =>
  de() ? FACTION_DE[f.id]?.style ?? f.style : f.style;
export const factionStrengths = (f: FactionDefinition): string =>
  de() ? FACTION_DE[f.id]?.strengths ?? f.strengths : f.strengths;
export const factionWeaknesses = (f: FactionDefinition): string =>
  de() ? FACTION_DE[f.id]?.weaknesses ?? f.weaknesses : f.weaknesses;
export const factionPassive = (f: FactionDefinition): string =>
  de() ? FACTION_DE[f.id]?.passiveDesc ?? f.passiveDesc : f.passiveDesc;

// ---------- creeps (wave enemies + spawned mercenaries), keyed by defId ----------

const CREEP_DE: Record<string, string> = {
  grubling: 'Grubling',
  stone_beetle: 'Steinkäfer',
  swift_stalker: 'Flinker Pirscher',
  bulwark_brute: 'Bollwerk-Schläger',
  gloomspawn: 'Düsterbrut',
  gloom_ogre: 'Düsteroger',
  horde_runt: 'Horden-Wicht',
  horde_bruiser: 'Horden-Schläger',
  iron_carapace: 'Eisenpanzer',
  ravager: 'Verwüster',
  swarmling: 'Schwärmling',
  dread_cultist: 'Schreckenskultist',
  dread_colossus: 'Schreckenskoloss',
  crawler: 'Krabbler',
  brute: 'Rohling',
  saboteur: 'Saboteur',
  crusher: 'Zermalmer',
  drake: 'Drache',
  king: 'König'
};

export const creepName = (defId: string, fallback: string): string =>
  de() ? CREEP_DE[defId] ?? fallback : fallback;

/** Same defId derivation as WaveSystem.createCreep (English data name → id). */
export const creepDefId = (englishName: string): string =>
  englishName.toLowerCase().replace(/\s+/g, '_');

// ---------- waves ----------

/** [name, hint, warning] */
const WAVE_DE: Record<number, [string, string, string]> = {
  1: ['Grubling-Ansturm', 'Viele schwache Gegner. Jede einfache Verteidigung hält.', 'Viele schwache Gegner'],
  2: ['Steinkäfer', 'Zähere Panzer. Guter Moment für den ersten Arbeiter.', 'Gepanzerte Gegner'],
  3: ['Flinke Pirscher', 'Schnelle Läufer bestrafen schlechte Positionierung.', 'Schnelle Gegner'],
  4: ['Bollwerk-Schläger', 'Wenige fette Gegner. Reiner Flächenschaden scheitert hier.', 'Wenige große Gegner'],
  5: ['Düsteroger', 'Mini-Boss. Gegnerische Sends kommen oft mit ihm.', 'Boss-Welle'],
  6: ['Bunte Horde', 'Gemischte Welle. Prüft, ob deine Ökonomie mithält.', 'Gemischte Gegner'],
  7: ['Eisenpanzer', 'Schwere Panzerung. Wucht und Magie glänzen, Stich versagt.', 'Gepanzerte Gegner'],
  8: ['Verwüster', 'Fernkampf und bösartig. Du brauchst echte Tanks und Support.', 'Hoher Schaden'],
  9: ['Endloser Schwarm', 'Eine Flut aus Körpern. Fläche und Ausdauer gewinnen hier.', 'Viele schwache Gegner'],
  10: ['Schreckenskoloss', 'Der Endboss. Alles, was du hast — jetzt.', 'Boss-Welle']
};

export const waveName = (w: WaveDefinition): string =>
  de() ? WAVE_DE[w.waveNumber]?.[0] ?? w.name : w.name;
export const waveHint = (w: WaveDefinition): string =>
  de() ? WAVE_DE[w.waveNumber]?.[1] ?? w.shortHint : w.shortHint;
export const waveWarning = (w: WaveDefinition): string =>
  de() ? WAVE_DE[w.waveNumber]?.[2] ?? w.warning : w.warning;

// ---------- mercenaries ----------

/** [name, roleDesc, description] */
const MERC_DE: Record<string, [string, string, string]> = {
  crawler: ['Krabbler', 'Einkommen', 'Billig und schwach, aber das meiste Einkommen pro Mythium.'],
  brute: ['Rohling', 'Tank', 'Eine Wand aus Muskeln. Schluckt Schaden und bremst Verteidigungen.'],
  saboteur: ['Saboteur', 'Schwächung', 'Treffer verlangsamen das Angriffstempo der Verteidiger.'],
  crusher: ['Zermalmer', 'Durchbruch', 'Schwer gepanzerter Schläger, der dünne Frontlinien zerschmettert.'],
  drake: ['Drache', 'Boss', 'Langsam, massiv, verheerend. Ein Wellenbrecher.']
};

export const mercName = (m: MercenaryDefinition): string =>
  de() ? MERC_DE[m.id]?.[0] ?? m.name : m.name;
export const mercRole = (m: MercenaryDefinition): string =>
  de() ? MERC_DE[m.id]?.[1] ?? m.roleDesc : m.roleDesc;
export const mercDesc = (m: MercenaryDefinition): string =>
  de() ? MERC_DE[m.id]?.[2] ?? m.desc : m.desc;

// ---------- king upgrades ----------

const KING_UPGRADE_DE: Record<string, [string, string]> = {
  attack: ['Königliche Waffen', '+{v} Angriffsschaden des Königs pro Stufe'],
  regen: ['Königliche Vitalität', '+{v} HP-Regeneration pro Sekunde pro Stufe'],
  spell: ['Königlicher Zorn', '+{v} Flächenzauber-Schaden pro Stufe']
};

export const kingUpgradeName = (spec: KingUpgradeSpec): string =>
  de() ? KING_UPGRADE_DE[spec.type]?.[0] ?? spec.name : spec.name;
export const kingUpgradeDesc = (spec: KingUpgradeSpec): string =>
  de()
    ? (KING_UPGRADE_DE[spec.type]?.[1] ?? spec.desc).replace('{v}', String(spec.valuePerLevel))
    : spec.desc;

// ---------- players ----------

/** Keyed by the internal English player name set in createGame. */
const PLAYER_DE: Record<string, string> = {
  You: 'Du',
  Ally: 'Verbündeter',
  Enemy: 'Gegner',
  'Enemy A': 'Gegner A',
  'Enemy B': 'Gegner B'
};

export const playerName = (p: PlayerState): string => (de() ? PLAYER_DE[p.name] ?? p.name : p.name);

// ---------- generic unit display name (action menu, popups) ----------

export const unitDisplayName = (u: { kind: string; defId: string; name: string; tier: number }): string => {
  if (!de()) return u.name;
  if (u.kind === 'fighter') {
    const entry = FIGHTER_DE[u.defId];
    if (entry) return entry[u.tier === 1 ? 1 : 0];
  }
  return CREEP_DE[u.defId] ?? u.name;
};
