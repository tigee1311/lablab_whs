export type RobotStatus = "idle" | "moving" | "picking" | "delivering" | "charging";
export type OrderPriority = "low" | "medium" | "high" | "urgent";
export type OrderStatus = "pending" | "assigned" | "in_progress" | "picking" | "delivering" | "completed" | "failed";

export interface Position {
  x: number;
  y: number;
}

export interface Robot {
  id: string;
  x: number;
  y: number;
  status: RobotStatus;
  battery: number;
  currentTaskId: string | null;
  path: Position[];
  targetDescription: string;
}

export interface Order {
  id: string;
  itemLocation: string;
  quantity: number;
  priority: OrderPriority;
  status: OrderStatus;
  assignedRobot: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface Metrics {
  ordersCompleted: number;
  ordersTotal: number;
  avgTaskTimeMs: number;
  robotUtilization: Record<string, number>;
  congestionEvents: number;
  reassignments: number;
  throughputPerHour: number;
  uptimeSeconds: number;
}

export interface SimulationState {
  robots: Robot[];
  orders: Order[];
  metrics: Metrics;
  grid: number[][];
  tick: number;
  congestionZones: Position[];
}

export interface GeminiPlan {
  robot_id: string;
  task_sequence: string[];
  reasoning_summary: string;
}

export interface WSMessage {
  type: string;
  payload: any;
}
