export const GRID_GAP = 8;
// En dessous, une tuile ne peut plus afficher l'artwork et un nom lisible.
const MIN_TILE_WIDTH = 96;

// Fractionnaire exprès : arrondir laisserait du blanc à droite.
export function gridTileWidth(contentWidth: number, columns: number): number {
  return Math.max(48, (contentWidth - (columns - 1) * GRID_GAP) / columns);
}

export function gridColumns(contentWidth: number, preferred = 3): number {
  for (let columns = preferred; columns > 1; columns -= 1) {
    if (gridTileWidth(contentWidth, columns) >= MIN_TILE_WIDTH) return columns;
  }
  return 1;
}
