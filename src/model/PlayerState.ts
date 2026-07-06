export interface PlayerState {
  id: string;
  name: string;
  teamId: string;
  isHuman: boolean;
  factionId: string;
  laneId: string;

  gold: number;
  mythium: number;
  income: number;
  workers: number;

  /** Merc def ids queued for the next battle. */
  pendingSends: string[];
  autoSend: boolean;
  /** Player whose lane receives this player's sends. */
  sendTargetPlayerId: string;

  ready: boolean;
  leaksThisWave: number;
  leakedLastWave: boolean;
  totalLeaks: number;
  /** Fractional gold accumulator (king damage bonus etc.). */
  goldFraction: number;
}
