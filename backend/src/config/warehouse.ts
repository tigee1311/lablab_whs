// Warehouse grid configuration
// 0 = open floor, 1 = rack/obstacle, 2 = packing station, 3 = charging station
// Grid is 20x15

export const WAREHOUSE_WIDTH = 20;
export const WAREHOUSE_HEIGHT = 15;

export const CELL_TYPES = {
  FLOOR: 0,
  RACK: 1,
  PACKING: 2,
  CHARGING: 3,
} as const;

export type CellType = (typeof CELL_TYPES)[keyof typeof CELL_TYPES];

// Warehouse layout — racks form aisles, stations at edges
export const WAREHOUSE_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
  [0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
];

// Named locations for Gemini planning
export const LOCATIONS: Record<string, { x: number; y: number }> = {
  PACK_ZONE: { x: 17, y: 13 },
  CHARGING_A: { x: 1, y: 13 },
  CHARGING_B: { x: 2, y: 13 },
  CHARGING_C: { x: 1, y: 14 },
  CHARGING_D: { x: 2, y: 14 },
};

// Item storage locations — positions adjacent to racks
export const STORAGE_SLOTS: Record<string, { x: number; y: number }> = {
  A1: { x: 0, y: 1 }, A2: { x: 3, y: 1 }, A3: { x: 0, y: 2 }, A4: { x: 3, y: 2 },
  B1: { x: 6, y: 1 }, B2: { x: 9, y: 1 }, B3: { x: 6, y: 2 }, B4: { x: 9, y: 2 },
  C1: { x: 12, y: 1 }, C2: { x: 15, y: 1 }, C3: { x: 12, y: 2 }, C4: { x: 15, y: 2 },
  D1: { x: 0, y: 4 }, D2: { x: 3, y: 4 }, D3: { x: 0, y: 5 }, D4: { x: 3, y: 5 },
  E1: { x: 6, y: 4 }, E2: { x: 9, y: 4 }, E3: { x: 6, y: 5 }, E4: { x: 9, y: 5 },
  F1: { x: 12, y: 4 }, F2: { x: 15, y: 4 }, F3: { x: 12, y: 5 }, F4: { x: 15, y: 5 },
  G1: { x: 0, y: 7 }, G2: { x: 3, y: 7 }, G3: { x: 0, y: 8 }, G4: { x: 3, y: 8 },
  H1: { x: 6, y: 7 }, H2: { x: 9, y: 7 }, H3: { x: 6, y: 8 }, H4: { x: 9, y: 8 },
  I1: { x: 12, y: 7 }, I2: { x: 15, y: 7 }, I3: { x: 12, y: 8 }, I4: { x: 15, y: 8 },
  J1: { x: 0, y: 10 }, J2: { x: 3, y: 10 }, J3: { x: 0, y: 11 }, J4: { x: 3, y: 11 },
  K1: { x: 6, y: 10 }, K2: { x: 9, y: 10 }, K3: { x: 6, y: 11 }, K4: { x: 9, y: 11 },
  L1: { x: 12, y: 10 }, L2: { x: 15, y: 10 }, L3: { x: 12, y: 11 }, L4: { x: 15, y: 11 },
};

// Initial robot configurations
export const INITIAL_ROBOTS = [
  { id: "R1", x: 0, y: 0, battery: 100 },
  { id: "R2", x: 19, y: 0, battery: 95 },
  { id: "R3", x: 0, y: 6, battery: 88 },
  { id: "R4", x: 19, y: 6, battery: 92 },
  { id: "R5", x: 0, y: 12, battery: 100 },
  { id: "R6", x: 19, y: 12, battery: 97 },
];

export const BATTERY_DRAIN_PER_MOVE = 0.3;
export const BATTERY_CHARGE_PER_TICK = 2;
export const LOW_BATTERY_THRESHOLD = 20;
export const CRITICAL_BATTERY_THRESHOLD = 10;
