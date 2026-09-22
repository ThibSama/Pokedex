/** Shared geometry for the Pokémon tile grids (Pokédex and Collection). */

/** Figma gutter between tiles, horizontally and vertically. */
export const GRID_GAP = 8;
/** Below this a tile can no longer show artwork plus a readable name band. */
const MIN_TILE_WIDTH = 96;

/**
 * Tile width for exactly `columns` columns across a content box of
 * `contentWidth`. Fractional on purpose: rounding down leaves unused white
 * space on the right. 360px frame → 104, 393px → 115.
 */
export function gridTileWidth(contentWidth: number, columns: number): number {
  return Math.max(48, (contentWidth - (columns - 1) * GRID_GAP) / columns);
}

/**
 * Preferred column count, stepping down only on unusually narrow frames so a
 * phone keeps the three-column Figma grid.
 */
export function gridColumns(contentWidth: number, preferred = 3): number {
  for (let columns = preferred; columns > 1; columns -= 1) {
    if (gridTileWidth(contentWidth, columns) >= MIN_TILE_WIDTH) return columns;
  }
  return 1;
}
