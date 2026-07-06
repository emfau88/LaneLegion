export interface FactionDefinition {
  id: string;
  name: string;
  /** 1 = easy to play … 3 = hard to play */
  difficultyStars: number;
  style: string;
  strengths: string;
  weaknesses: string;
  passiveDesc: string;
  /** Main UI color for this faction. */
  color: number;
  colorDark: number;
  /** Ids of the 6 base fighters, in shop order. */
  fighterIds: string[];
}
