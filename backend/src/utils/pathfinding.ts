import { Position } from "../models/types";
import { WAREHOUSE_WIDTH, WAREHOUSE_HEIGHT, WAREHOUSE_GRID, CELL_TYPES } from "../config/warehouse";

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isWalkable(x: number, y: number, robotPositions: Position[]): boolean {
  if (x < 0 || x >= WAREHOUSE_WIDTH || y < 0 || y >= WAREHOUSE_HEIGHT) return false;
  const cell = WAREHOUSE_GRID[y][x];
  if (cell === CELL_TYPES.RACK) return false;
  // Check collision with other robots
  for (const pos of robotPositions) {
    if (pos.x === x && pos.y === y) return false;
  }
  return true;
}

function isWalkableIgnoreRobots(x: number, y: number): boolean {
  if (x < 0 || x >= WAREHOUSE_WIDTH || y < 0 || y >= WAREHOUSE_HEIGHT) return false;
  return WAREHOUSE_GRID[y][x] !== CELL_TYPES.RACK;
}

export function findPath(
  start: Position,
  end: Position,
  robotPositions: Position[] = [],
  ignoreRobots = false
): Position[] {
  // If start equals end, return empty path
  if (start.x === end.x && start.y === end.y) return [];

  const walkCheck = ignoreRobots
    ? (x: number, y: number) => isWalkableIgnoreRobots(x, y)
    : (x: number, y: number) => isWalkable(x, y, robotPositions);

  // Ensure end is walkable (ignore robots for destination)
  if (!isWalkableIgnoreRobots(end.x, end.y)) {
    // Find nearest walkable cell to end
    const nearest = findNearestWalkable(end);
    if (!nearest) return [];
    end = nearest;
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  openSet.push(startNode);

  const directions = [
    { x: 0, y: -1 }, { x: 0, y: 1 },
    { x: -1, y: 0 }, { x: 1, y: 0 },
  ];

  let iterations = 0;
  const maxIterations = WAREHOUSE_WIDTH * WAREHOUSE_HEIGHT * 4;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
    }

    const current = openSet[lowestIdx];

    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path: Position[] = [];
      let node: PathNode | null = current;
      while (node && !(node.x === start.x && node.y === start.y)) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    openSet.splice(lowestIdx, 1);
    closedSet.add(`${current.x},${current.y}`);

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const key = `${nx},${ny}`;

      if (closedSet.has(key)) continue;
      // Allow walking onto the destination even if a robot is there
      const isDestination = nx === end.x && ny === end.y;
      if (!isDestination && !walkCheck(nx, ny)) continue;
      if (isDestination && !isWalkableIgnoreRobots(nx, ny)) continue;

      const g = current.g + 1;
      const existing = openSet.find((n) => n.x === nx && n.y === ny);

      if (!existing) {
        openSet.push({
          x: nx, y: ny, g, h: heuristic({ x: nx, y: ny }, end),
          f: g + heuristic({ x: nx, y: ny }, end), parent: current,
        });
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + existing.h;
        existing.parent = current;
      }
    }
  }

  // No path found — try again ignoring robots
  if (!ignoreRobots) {
    return findPath(start, end, [], true);
  }

  return [];
}

function findNearestWalkable(pos: Position): Position | null {
  for (let r = 1; r < Math.max(WAREHOUSE_WIDTH, WAREHOUSE_HEIGHT); r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (isWalkableIgnoreRobots(nx, ny)) return { x: nx, y: ny };
      }
    }
  }
  return null;
}

export function detectCongestion(robotPositions: Position[], threshold = 3): Position[] {
  const zones: Position[] = [];
  // Check 3x3 areas for robot clustering
  for (let x = 0; x < WAREHOUSE_WIDTH - 2; x++) {
    for (let y = 0; y < WAREHOUSE_HEIGHT - 2; y++) {
      let count = 0;
      for (const rp of robotPositions) {
        if (rp.x >= x && rp.x <= x + 2 && rp.y >= y && rp.y <= y + 2) {
          count++;
        }
      }
      if (count >= threshold) {
        zones.push({ x: x + 1, y: y + 1 });
      }
    }
  }
  return zones;
}
