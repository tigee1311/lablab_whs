import { Robot, Order, Position, Metrics, SimulationState } from "../models/types";
import { findPath, detectCongestion } from "../utils/pathfinding";
import { planOrderAssignment, planCongestionResponse, planBatteryResponse } from "./gemini";
import {
  WAREHOUSE_GRID, STORAGE_SLOTS, LOCATIONS, INITIAL_ROBOTS,
  BATTERY_DRAIN_PER_MOVE, BATTERY_CHARGE_PER_TICK,
  LOW_BATTERY_THRESHOLD, CRITICAL_BATTERY_THRESHOLD,
} from "../config/warehouse";
import db from "../models/database";
import { v4 as uuid } from "uuid";

type BroadcastFn = (msg: { type: string; payload: unknown }) => void;

export class SimulationEngine {
  private robots: Robot[] = [];
  private orders: Map<string, Order> = new Map();
  private tick = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private broadcast: BroadcastFn;
  private congestionZones: Position[] = [];
  private pendingGeminiCalls = new Set<string>();
  private taskSteps: Map<string, string[]> = new Map(); // orderId -> remaining steps
  private startTime = Date.now();
  private totalTaskTimeMs = 0;
  private tickMs = 500;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
    this.initRobots();
    this.loadOrdersFromDb();
  }

  private initRobots(): void {
    // Load from DB or initialize
    const dbRobots = db.prepare("SELECT * FROM robots").all() as any[];
    if (dbRobots.length > 0) {
      this.robots = dbRobots.map((r) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        status: r.status,
        battery: r.battery,
        currentTaskId: r.current_task_id,
        path: JSON.parse(r.path_json || "[]"),
        targetDescription: r.target_description || "",
      }));
    } else {
      this.robots = INITIAL_ROBOTS.map((r) => ({
        ...r,
        status: "idle" as const,
        currentTaskId: null,
        path: [],
        targetDescription: "",
      }));
      this.saveRobotsToDb();
    }
  }

  private loadOrdersFromDb(): void {
    const dbOrders = db.prepare("SELECT * FROM orders").all() as any[];
    for (const o of dbOrders) {
      this.orders.set(o.id, {
        id: o.id,
        itemLocation: o.item_location,
        quantity: o.quantity,
        priority: o.priority,
        status: o.status,
        assignedRobot: o.assigned_robot,
        createdAt: o.created_at,
        completedAt: o.completed_at,
      });
    }
  }

  private saveRobotsToDb(): void {
    const upsert = db.prepare(`
      INSERT INTO robots (id, x, y, status, battery, current_task_id, path_json, target_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        x = excluded.x, y = excluded.y, status = excluded.status,
        battery = excluded.battery, current_task_id = excluded.current_task_id,
        path_json = excluded.path_json, target_description = excluded.target_description
    `);

    const txn = db.transaction(() => {
      for (const r of this.robots) {
        upsert.run(r.id, r.x, r.y, r.status, r.battery, r.currentTaskId, JSON.stringify(r.path), r.targetDescription);
      }
    });
    txn();
  }

  private saveOrderToDb(order: Order): void {
    db.prepare(`
      INSERT INTO orders (id, item_location, quantity, priority, status, assigned_robot, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status, assigned_robot = excluded.assigned_robot, completed_at = excluded.completed_at
    `).run(order.id, order.itemLocation, order.quantity, order.priority, order.status, order.assignedRobot, order.createdAt, order.completedAt);
  }

  start(tickMs: number): void {
    if (this.interval) return;
    this.tickMs = tickMs;
    this.interval = setInterval(() => this.update(), tickMs);
    console.log(`Simulation started with ${tickMs}ms tick interval`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async createOrder(itemLocation: string, quantity: number, priority: string): Promise<Order> {
    const order: Order = {
      id: `ORD-${uuid().slice(0, 8).toUpperCase()}`,
      itemLocation,
      quantity,
      priority: priority as Order["priority"],
      status: "pending",
      assignedRobot: null,
      createdAt: Date.now(),
      completedAt: null,
    };

    this.orders.set(order.id, order);
    this.saveOrderToDb(order);
    db.prepare("UPDATE metrics SET orders_total = orders_total + 1 WHERE id = 1").run();

    this.broadcast({ type: "order_created", payload: order });

    // Trigger Gemini planning asynchronously
    this.assignOrderViaGemini(order);

    return order;
  }

  private async assignOrderViaGemini(order: Order): Promise<void> {
    if (this.pendingGeminiCalls.has(order.id)) return;
    this.pendingGeminiCalls.add(order.id);

    try {
      const allOrders = Array.from(this.orders.values());
      const plan = await planOrderAssignment(order, this.robots, allOrders);

      const robot = this.robots.find((r) => r.id === plan.robot_id);
      if (!robot) {
        console.error(`Gemini assigned non-existent robot: ${plan.robot_id}`);
        return;
      }

      // Update order
      order.status = "assigned";
      order.assignedRobot = plan.robot_id;
      this.saveOrderToDb(order);

      // Set task steps
      this.taskSteps.set(order.id, [...plan.task_sequence]);

      // Update robot
      robot.currentTaskId = order.id;
      robot.status = "moving";
      robot.targetDescription = plan.reasoning_summary;

      // Start first step
      this.executeNextStep(robot, order);

      this.broadcast({
        type: "order_assigned",
        payload: { order, plan },
      });
    } catch (err) {
      console.error("Failed to assign order:", err);
    } finally {
      this.pendingGeminiCalls.delete(order.id);
    }
  }

  private executeNextStep(robot: Robot, order: Order): void {
    const steps = this.taskSteps.get(order.id);
    if (!steps || steps.length === 0) {
      // All steps complete
      order.status = "completed";
      order.completedAt = Date.now();
      this.saveOrderToDb(order);

      this.totalTaskTimeMs += order.completedAt - order.createdAt;
      db.prepare("UPDATE metrics SET orders_completed = orders_completed + 1, total_task_time_ms = total_task_time_ms + ? WHERE id = 1")
        .run(order.completedAt - order.createdAt);

      robot.currentTaskId = null;
      robot.status = "idle";
      robot.targetDescription = "";

      this.broadcast({ type: "order_completed", payload: order });
      return;
    }

    const step = steps[0];
    const [action, target] = step.includes(":") ? step.split(":") : [step, ""];

    switch (action) {
      case "navigate_to":
      case "return_to": {
        const pos = this.resolveLocation(target);
        if (pos) {
          const otherRobotPositions = this.robots.filter((r) => r.id !== robot.id).map((r) => ({ x: r.x, y: r.y }));
          robot.path = findPath({ x: robot.x, y: robot.y }, pos, otherRobotPositions);
          robot.status = "moving";
          if (action === "return_to" && target.startsWith("CHARGING")) {
            robot.targetDescription = `Returning to charging station`;
          } else {
            robot.targetDescription = `Navigating to ${target}`;
          }
        }
        break;
      }
      case "pick_item":
        robot.status = "picking";
        robot.targetDescription = "Picking item";
        // Picking takes 3 ticks (simulated)
        setTimeout(() => {
          steps.shift();
          order.status = "delivering";
          this.saveOrderToDb(order);
          this.executeNextStep(robot, order);
        }, 1500);
        return;
      case "drop_item":
        robot.status = "delivering";
        robot.targetDescription = "Dropping item at packing zone";
        setTimeout(() => {
          steps.shift();
          this.executeNextStep(robot, order);
        }, 1000);
        return;
    }
  }

  private resolveLocation(name: string): Position | null {
    if (STORAGE_SLOTS[name]) return STORAGE_SLOTS[name];
    if (LOCATIONS[name]) return LOCATIONS[name];
    // Try parsing as CHARGING_X
    if (name.startsWith("CHARGING")) {
      return LOCATIONS[name] || LOCATIONS["CHARGING_A"];
    }
    return null;
  }

  private update(): void {
    this.tick++;

    // Move robots along their paths
    for (const robot of this.robots) {
      if (robot.status === "charging") {
        robot.battery = Math.min(100, robot.battery + BATTERY_CHARGE_PER_TICK);
        if (robot.battery >= 100) {
          robot.status = "idle";
          robot.targetDescription = "Fully charged";
        }
        continue;
      }

      if (robot.path.length > 0 && robot.status === "moving") {
        const next = robot.path[0];

        // Check collision with other robots at next position
        const blocked = this.robots.some(
          (r) => r.id !== robot.id && r.x === next.x && r.y === next.y
        );

        if (blocked) {
          // Wait one tick — dynamic rerouting will handle persistent blocks
          continue;
        }

        robot.x = next.x;
        robot.y = next.y;
        robot.path.shift();
        robot.battery = Math.max(0, robot.battery - BATTERY_DRAIN_PER_MOVE);

        // If path complete, advance to next task step
        if (robot.path.length === 0 && robot.currentTaskId) {
          const order = this.orders.get(robot.currentTaskId);
          const steps = this.taskSteps.get(robot.currentTaskId);
          if (order && steps) {
            const currentStep = steps[0];
            if (currentStep?.startsWith("navigate_to:") || currentStep?.startsWith("return_to:")) {
              steps.shift();
              // Check if this was a return_to:CHARGING
              if (currentStep.startsWith("return_to:CHARGING")) {
                robot.status = "charging";
                robot.targetDescription = "Charging";
                // Continue with remaining steps after charging isn't needed, just complete
                this.executeNextStep(robot, order);
              } else {
                order.status = "in_progress";
                this.saveOrderToDb(order);
                this.executeNextStep(robot, order);
              }
            }
          }
        }
      }

      // Battery check
      if (robot.battery <= LOW_BATTERY_THRESHOLD && robot.status !== "charging" && !this.pendingGeminiCalls.has(`battery_${robot.id}`)) {
        this.handleLowBattery(robot);
      }
    }

    // Congestion detection every 10 ticks
    if (this.tick % 10 === 0) {
      const positions = this.robots.map((r) => ({ x: r.x, y: r.y }));
      this.congestionZones = detectCongestion(positions);
      if (this.congestionZones.length > 0) {
        db.prepare("UPDATE metrics SET congestion_events = congestion_events + ? WHERE id = 1").run(this.congestionZones.length);
        this.handleCongestion();
      }
    }

    // Process pending orders every 5 ticks
    if (this.tick % 5 === 0) {
      for (const order of this.orders.values()) {
        if (order.status === "pending" && !this.pendingGeminiCalls.has(order.id)) {
          this.assignOrderViaGemini(order);
        }
      }
    }

    // Save state every 10 ticks
    if (this.tick % 10 === 0) {
      this.saveRobotsToDb();
    }

    // Broadcast state
    this.broadcast({
      type: "state_update",
      payload: this.getState(),
    });
  }

  private async handleLowBattery(robot: Robot): Promise<void> {
    this.pendingGeminiCalls.add(`battery_${robot.id}`);
    try {
      const allOrders = Array.from(this.orders.values());
      const plan = await planBatteryResponse(robot, this.robots, allOrders);

      // If robot has a current task, mark for reassignment
      if (robot.currentTaskId && robot.battery <= CRITICAL_BATTERY_THRESHOLD) {
        const order = this.orders.get(robot.currentTaskId);
        if (order) {
          order.status = "pending";
          order.assignedRobot = null;
          this.saveOrderToDb(order);
          db.prepare("UPDATE metrics SET reassignments = reassignments + 1 WHERE id = 1").run();
          this.broadcast({ type: "task_reassigned", payload: { orderId: order.id, reason: "low_battery", robot: robot.id } });
        }
        robot.currentTaskId = null;
        this.taskSteps.delete(robot.currentTaskId || "");
      }

      // Navigate to charging
      const chargingPos = this.resolveLocation(plan.task_sequence[0]?.split(":")[1] || "CHARGING_A");
      if (chargingPos) {
        robot.path = findPath({ x: robot.x, y: robot.y }, chargingPos);
        robot.status = "moving";
        robot.targetDescription = "Heading to charge (low battery)";
      }

      this.broadcast({
        type: "battery_alert",
        payload: { robot: robot.id, battery: robot.battery, plan },
      });
    } catch (err) {
      console.error("Battery handling error:", err);
    } finally {
      this.pendingGeminiCalls.delete(`battery_${robot.id}`);
    }
  }

  private async handleCongestion(): Promise<void> {
    if (this.pendingGeminiCalls.has("congestion")) return;
    this.pendingGeminiCalls.add("congestion");

    try {
      const allOrders = Array.from(this.orders.values());
      const plans = await planCongestionResponse(this.congestionZones, this.robots, allOrders);

      for (const plan of plans) {
        const robot = this.robots.find((r) => r.id === plan.robot_id);
        if (!robot || robot.status !== "moving") continue;

        // Reroute: recalculate path avoiding congestion
        if (robot.path.length > 0) {
          const dest = robot.path[robot.path.length - 1];
          const otherPositions = this.robots.filter((r) => r.id !== robot.id).map((r) => ({ x: r.x, y: r.y }));
          robot.path = findPath({ x: robot.x, y: robot.y }, dest, otherPositions);
        }

        db.prepare("UPDATE metrics SET reassignments = reassignments + 1 WHERE id = 1").run();
      }

      if (plans.length > 0) {
        this.broadcast({ type: "congestion_resolved", payload: { zones: this.congestionZones, plans } });
      }
    } catch (err) {
      console.error("Congestion handling error:", err);
    } finally {
      this.pendingGeminiCalls.delete("congestion");
    }
  }

  getState(): SimulationState {
    const metricsRow = db.prepare("SELECT * FROM metrics WHERE id = 1").get() as any;
    const ordersCompleted = metricsRow?.orders_completed || 0;
    const ordersTotal = metricsRow?.orders_total || 0;
    const totalTaskTime = metricsRow?.total_task_time_ms || 0;
    const uptimeSeconds = (Date.now() - (metricsRow?.started_at || this.startTime)) / 1000;

    const robotUtilization: Record<string, number> = {};
    for (const r of this.robots) {
      robotUtilization[r.id] = r.status === "idle" || r.status === "charging" ? 0 : 1;
    }

    return {
      robots: this.robots.map((r) => ({ ...r })),
      orders: Array.from(this.orders.values()),
      metrics: {
        ordersCompleted,
        ordersTotal,
        avgTaskTimeMs: ordersCompleted > 0 ? totalTaskTime / ordersCompleted : 0,
        robotUtilization,
        congestionEvents: metricsRow?.congestion_events || 0,
        reassignments: metricsRow?.reassignments || 0,
        throughputPerHour: uptimeSeconds > 0 ? (ordersCompleted / uptimeSeconds) * 3600 : 0,
        uptimeSeconds,
      },
      grid: WAREHOUSE_GRID,
      tick: this.tick,
      congestionZones: this.congestionZones,
    };
  }

  getRobots(): Robot[] {
    return this.robots.map((r) => ({ ...r }));
  }

  getOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  resetSimulation(): void {
    const tickMs = this.interval ? 500 : 500;
    this.stop();
    this.tick = 0;
    this.orders.clear();
    this.taskSteps.clear();
    this.congestionZones = [];

    db.exec("DELETE FROM orders");
    db.exec("DELETE FROM robots");
    db.exec("UPDATE metrics SET orders_completed=0, orders_total=0, total_task_time_ms=0, congestion_events=0, reassignments=0, started_at=" + Date.now());

    this.robots = INITIAL_ROBOTS.map((r) => ({
      ...r,
      status: "idle" as const,
      currentTaskId: null,
      path: [],
      targetDescription: "",
    }));
    this.saveRobotsToDb();
    this.startTime = Date.now();

    this.broadcast({ type: "simulation_reset", payload: this.getState() });

    // Restart the tick loop
    this.start(this.tickMs);
  }
}
