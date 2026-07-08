import royalIdolUrl from './king/royal-idol.png';

export type KingSheetFrame = 'idle' | 'brace' | 'cast' | 'damaged';

export const KING_SHEET = {
  key: 'king-sheet-royal-idol',
  url: royalIdolUrl,
  frameWidth: 256,
  frameHeight: 256
};

export const KING_SHEET_FRAME: Record<KingSheetFrame, number> = {
  idle: 0,
  brace: 1,
  cast: 2,
  damaged: 3
};
