import { Router, Request, Response } from "express";
import { SimulationEngine } from "../services/simulation";
import { STORAGE_SLOTS, WAREHOUSE_GRID, LOCATIONS } from "../config/warehouse";
import db from "../models/database";

export function createApiRouter(simulation: SimulationEngine): Router {
  const router = Router();

  // Health check
  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Get full simulation state
  router.get("/state", (_req: Request, res: Response) => {
    res.json(simulation.getState());
  });

  // Get all robots
  router.get("/robots", (_req: Request, res: Response) => {
    res.json(simulation.getRobots());
  });

  // Get all orders
  router.get("/orders", (_req: Request, res: Response) => {
    res.json(simulation.getOrders());
  });

  // Create a new order
  router.post("/orders", async (req: Request, res: Response) => {
    const { itemLocation, quantity, priority } = req.body;

    if (!itemLocation || !STORAGE_SLOTS[itemLocation]) {
      res.status(400).json({
        error: "Invalid itemLocation",
        validLocations: Object.keys(STORAGE_SLOTS),
      });
      return;
    }

    const qty = quantity || 1;
    const prio = priority || "medium";

    if (!["low", "medium", "high", "urgent"].includes(prio)) {
      res.status(400).json({ error: "Invalid priority. Use: low, medium, high, urgent" });
      return;
    }

    try {
      const order = await simulation.createOrder(itemLocation, qty, prio);
      res.status(201).json(order);
    } catch (err) {
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Get warehouse layout info
  router.get("/warehouse", (_req: Request, res: Response) => {
    res.json({
      grid: WAREHOUSE_GRID,
      width: WAREHOUSE_GRID[0].length,
      height: WAREHOUSE_GRID.length,
      storageSlots: STORAGE_SLOTS,
      locations: LOCATIONS,
    });
  });

  // Get metrics
  router.get("/metrics", (_req: Request, res: Response) => {
    const state = simulation.getState();
    res.json(state.metrics);
  });

  // Get Gemini logs
  router.get("/gemini-logs", (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = db.prepare("SELECT * FROM gemini_logs ORDER BY timestamp DESC LIMIT ?").all(limit);
    res.json(logs);
  });

  // Reset simulation
  router.post("/reset", (_req: Request, res: Response) => {
    simulation.resetSimulation();
    res.json({ status: "reset", state: simulation.getState() });
  });

  // Create batch of random orders for demo
  router.post("/demo/batch-orders", async (req: Request, res: Response) => {
    const slots = Object.keys(STORAGE_SLOTS);
    const priorities: Array<"low" | "medium" | "high" | "urgent"> = ["low", "medium", "high", "urgent"];
    const count = parseInt(req.body.count as string) || 5;
    const orders = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const slot = slots[Math.floor(Math.random() * slots.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const qty = Math.floor(Math.random() * 3) + 1;

      // Stagger order creation
      await new Promise((r) => setTimeout(r, 300));
      const order = await simulation.createOrder(slot, qty, priority);
      orders.push(order);
    }

    res.json({ created: orders.length, orders });
  });

  return router;
}
