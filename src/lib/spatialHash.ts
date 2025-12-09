/**
 * Spatial Hash Grid for O(N) Collision Detection
 * Uses linked-list-in-arrays pattern for zero garbage collection
 */

import { MAX_UNITS } from './battleSoA';

export interface SpatialHashGrid {
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  cellCount: number;
  cellHead: Int32Array;  // Head pointer for each cell's linked list
  cellNext: Int32Array;  // Next pointer for each unit
  worldWidth: number;
  worldHeight: number;
}

/**
 * Create a new spatial hash grid
 * @param worldWidth Canvas width
 * @param worldHeight Canvas height
 * @param cellSize Size of each cell (should match interaction radius)
 */
export function createSpatialHashGrid(
  worldWidth: number,
  worldHeight: number,
  cellSize: number = 50
): SpatialHashGrid {
  const gridWidth = Math.ceil(worldWidth / cellSize);
  const gridHeight = Math.ceil(worldHeight / cellSize);
  const cellCount = gridWidth * gridHeight;
  
  return {
    cellSize,
    gridWidth,
    gridHeight,
    cellCount,
    cellHead: new Int32Array(cellCount).fill(-1),
    cellNext: new Int32Array(MAX_UNITS).fill(-1),
    worldWidth,
    worldHeight,
  };
}

/**
 * Resize grid if canvas dimensions change
 */
export function resizeGrid(
  grid: SpatialHashGrid,
  worldWidth: number,
  worldHeight: number
): void {
  grid.worldWidth = worldWidth;
  grid.worldHeight = worldHeight;
  grid.gridWidth = Math.ceil(worldWidth / grid.cellSize);
  grid.gridHeight = Math.ceil(worldHeight / grid.cellSize);
  const newCellCount = grid.gridWidth * grid.gridHeight;
  
  if (newCellCount > grid.cellHead.length) {
    grid.cellHead = new Int32Array(newCellCount);
    grid.cellCount = newCellCount;
  }
}

/**
 * Clear the grid (O(cellCount) - fast for typical grids)
 */
export function clearGrid(grid: SpatialHashGrid): void {
  grid.cellHead.fill(-1);
}

/**
 * Get cell index for a position
 */
export function getCellIndex(grid: SpatialHashGrid, x: number, y: number): number {
  const cellX = Math.floor(x / grid.cellSize);
  const cellY = Math.floor(y / grid.cellSize);
  
  // Clamp to grid bounds
  const clampedX = Math.max(0, Math.min(grid.gridWidth - 1, cellX));
  const clampedY = Math.max(0, Math.min(grid.gridHeight - 1, cellY));
  
  return clampedY * grid.gridWidth + clampedX;
}

/**
 * Insert a unit into the grid (O(1))
 */
export function insertUnit(
  grid: SpatialHashGrid,
  unitIndex: number,
  x: number,
  y: number
): void {
  const cellIndex = getCellIndex(grid, x, y);
  
  // Push to front of linked list
  grid.cellNext[unitIndex] = grid.cellHead[cellIndex];
  grid.cellHead[cellIndex] = unitIndex;
}

/**
 * Rebuild entire grid from position arrays (O(N))
 * Call this once per frame before queries
 */
export function rebuildGrid(
  grid: SpatialHashGrid,
  posX: Float32Array,
  posY: Float32Array,
  stateFlags: Uint8Array,
  unitCount: number,
  FLAG_ALIVE: number
): void {
  // Clear all cell heads
  clearGrid(grid);
  
  // Insert all alive units
  for (let i = 0; i < unitCount; i++) {
    if ((stateFlags[i] & FLAG_ALIVE) === 0) continue;
    insertUnit(grid, i, posX[i], posY[i]);
  }
}

/**
 * Query all units in a cell
 * Returns an iterator over unit indices
 */
export function* queryCellUnits(
  grid: SpatialHashGrid,
  cellIndex: number
): Generator<number> {
  let current = grid.cellHead[cellIndex];
  while (current !== -1) {
    yield current;
    current = grid.cellNext[current];
  }
}

/**
 * Query units in radius around a position (Moore neighborhood)
 * Checks current cell and 8 surrounding cells
 */
export function* queryRadius(
  grid: SpatialHashGrid,
  x: number,
  y: number
): Generator<number> {
  const centerCellX = Math.floor(x / grid.cellSize);
  const centerCellY = Math.floor(y / grid.cellSize);
  
  // Check 3x3 neighborhood (Moore neighborhood)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cellX = centerCellX + dx;
      const cellY = centerCellY + dy;
      
      // Skip out of bounds
      if (cellX < 0 || cellX >= grid.gridWidth) continue;
      if (cellY < 0 || cellY >= grid.gridHeight) continue;
      
      const cellIndex = cellY * grid.gridWidth + cellX;
      
      // Iterate through linked list
      let current = grid.cellHead[cellIndex];
      while (current !== -1) {
        yield current;
        current = grid.cellNext[current];
      }
    }
  }
}

/**
 * Count units in radius for debugging/stats
 */
export function countInRadius(
  grid: SpatialHashGrid,
  x: number,
  y: number,
  radius: number,
  posX: Float32Array,
  posY: Float32Array
): number {
  const radiusSq = radius * radius;
  let count = 0;
  
  for (const idx of queryRadius(grid, x, y)) {
    const dx = posX[idx] - x;
    const dy = posY[idx] - y;
    if (dx * dx + dy * dy <= radiusSq) {
      count++;
    }
  }
  
  return count;
}
