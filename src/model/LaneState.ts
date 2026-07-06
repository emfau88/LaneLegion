export interface LaneState {
  id: string;
  ownerId: string;
  /** grid[row][col] -> fighter unit id or null. */
  grid: (number | null)[][];
}
