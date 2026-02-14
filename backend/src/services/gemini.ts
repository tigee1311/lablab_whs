import { GoogleGenAI } from "@google/genai";
import { Robot, Order, GeminiPlan, Position } from "../models/types";
import { STORAGE_SLOTS, LOCATIONS } from "../config/warehouse";
import db from "../models/database";

let _genai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!_genai) {
    _genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }
  return _genai;
}

function logGeminiCall(promptType: string, summary: string, response: string, latencyMs: number): void {
  try {
    db.prepare(
      "INSERT INTO gemini_logs (timestamp, prompt_type, request_summary, response_json, latency_ms) VALUES (?, ?, ?, ?, ?)"
    ).run(Date.now(), promptType, summary, response, latencyMs);
  } catch (_) {
    // Non-critical logging
  }
}

function buildWarehouseContext(robots: Robot[], orders: Order[]): string {
  const robotSummary = robots.map((r) =>
    `${r.id}: pos=(${r.x},${r.y}), status=${r.status}, battery=${r.battery.toFixed(1)}%, task=${r.currentTaskId || "none"}`
  ).join("\n");

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const activeOrders = orders.filter((o) => !["pending", "completed", "failed"].includes(o.status));

  const locationList = Object.entries(STORAGE_SLOTS)
    .map(([name, pos]) => `${name}: (${pos.x},${pos.y})`)
    .join(", ");

  return `WAREHOUSE STATE:
Grid: 20x15, racks form aisles, open floor for movement.
Packing Zone: (17,13)
Charging Stations: (1,13), (2,13), (1,14), (2,14)

ROBOTS:
${robotSummary}

STORAGE LOCATIONS: ${locationList}

PENDING ORDERS: ${pendingOrders.length}
${pendingOrders.map((o) => `  Order ${o.id}: item at ${o.itemLocation}, qty=${o.quantity}, priority=${o.priority}`).join("\n")}

ACTIVE ORDERS: ${activeOrders.length}
${activeOrders.map((o) => `  Order ${o.id}: status=${o.status}, robot=${o.assignedRobot}`).join("\n")}`;
}

export async function planOrderAssignment(
  order: Order,
  robots: Robot[],
  allOrders: Order[]
): Promise<GeminiPlan> {
  const context = buildWarehouseContext(robots, allOrders);
  const itemPos = STORAGE_SLOTS[order.itemLocation];
  if (!itemPos) {
    throw new Error(`Unknown item location: ${order.itemLocation}`);
  }

  const prompt = `You are an AI warehouse orchestrator. Assign a robot to fulfill this order and create a task plan.

${context}

NEW ORDER TO ASSIGN:
Order ID: ${order.id}
Item Location: ${order.itemLocation} at position (${itemPos.x}, ${itemPos.y})
Quantity: ${order.quantity}
Priority: ${order.priority}

RULES:
- Pick the best available robot based on: proximity to item, battery level, current status
- Only assign idle robots or robots that are charging with battery > 50%
- If no robots are available, pick the one that will be free soonest
- Battery below 20% means robot must charge first
- Task sequence uses these actions: navigate_to:<location>, pick_item, drop_item, return_to:CHARGING
- Location can be a storage slot name (e.g., A1) or PACK_ZONE or CHARGING

Respond ONLY with valid JSON in this exact format:
{
  "robot_id": "<robot_id>",
  "task_sequence": ["navigate_to:<loc>", "pick_item", "navigate_to:PACK_ZONE", "drop_item", "return_to:CHARGING"],
  "reasoning_summary": "<brief explanation>"
}`;

  const start = Date.now();
  try {
    const response = await getGenAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    });

    const text = response.text?.trim() || "";
    const latency = Date.now() - start;
    logGeminiCall("order_assignment", `Order ${order.id}`, text, latency);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini returned non-JSON:", text);
      return fallbackPlan(order, robots);
    }

    const plan: GeminiPlan = JSON.parse(jsonMatch[0]);

    // Validate robot exists
    const robotExists = robots.some((r) => r.id === plan.robot_id);
    if (!robotExists) {
      console.warn(`Gemini suggested non-existent robot ${plan.robot_id}, falling back`);
      return fallbackPlan(order, robots);
    }

    return plan;
  } catch (err) {
    console.error("Gemini API error:", err);
    const latency = Date.now() - start;
    logGeminiCall("order_assignment_error", `Order ${order.id}`, String(err), latency);
    return fallbackPlan(order, robots);
  }
}

export async function planCongestionResponse(
  congestionZones: Position[],
  robots: Robot[],
  orders: Order[]
): Promise<GeminiPlan[]> {
  const context = buildWarehouseContext(robots, orders);

  const prompt = `You are an AI warehouse orchestrator. Congestion detected — reroute affected robots.

${context}

CONGESTION ZONES (center of 3x3 areas with 3+ robots):
${congestionZones.map((z) => `(${z.x}, ${z.y})`).join(", ")}

Identify robots near congestion and suggest rerouting. For each affected robot, provide an alternative plan.
Only reroute robots that are currently moving (status=moving).

Respond ONLY with valid JSON array:
[
  {
    "robot_id": "<id>",
    "task_sequence": ["navigate_to:<alternative_location>", ...],
    "reasoning_summary": "<why rerouting>"
  }
]

If no rerouting needed, respond with: []`;

  const start = Date.now();
  try {
    const response = await getGenAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3, maxOutputTokens: 800 },
    });

    const text = response.text?.trim() || "";
    const latency = Date.now() - start;
    logGeminiCall("congestion_response", `Zones: ${congestionZones.length}`, text, latency);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Gemini congestion API error:", err);
    return [];
  }
}

export async function planBatteryResponse(
  robot: Robot,
  robots: Robot[],
  orders: Order[]
): Promise<GeminiPlan> {
  const context = buildWarehouseContext(robots, orders);

  const prompt = `You are an AI warehouse orchestrator. A robot has low battery and needs to charge.

${context}

LOW BATTERY ROBOT: ${robot.id} at (${robot.x}, ${robot.y}) with ${robot.battery.toFixed(1)}% battery.
Current task: ${robot.currentTaskId || "none"}

Decide:
1. Should this robot abandon its current task? (yes if battery < 15%)
2. Which charging station to go to? (pick the nearest unoccupied one)
3. Should another robot take over the abandoned task?

Charging stations: CHARGING_A(1,13), CHARGING_B(2,13), CHARGING_C(1,14), CHARGING_D(2,14)

Respond ONLY with valid JSON:
{
  "robot_id": "${robot.id}",
  "task_sequence": ["navigate_to:CHARGING_A"],
  "reasoning_summary": "<explanation>"
}`;

  const start = Date.now();
  try {
    const response = await getGenAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 400 },
    });

    const text = response.text?.trim() || "";
    const latency = Date.now() - start;
    logGeminiCall("battery_response", `Robot ${robot.id}`, text, latency);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { robot_id: robot.id, task_sequence: ["navigate_to:CHARGING_A"], reasoning_summary: "Fallback: low battery" };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Gemini battery API error:", err);
    return { robot_id: robot.id, task_sequence: ["navigate_to:CHARGING_A"], reasoning_summary: "Fallback: API error" };
  }
}

// Deterministic fallback when Gemini is unavailable
function fallbackPlan(order: Order, robots: Robot[]): GeminiPlan {
  const itemPos = STORAGE_SLOTS[order.itemLocation];
  const available = robots
    .filter((r) => r.status === "idle" || (r.status === "charging" && r.battery > 50))
    .sort((a, b) => {
      const distA = Math.abs(a.x - itemPos.x) + Math.abs(a.y - itemPos.y);
      const distB = Math.abs(b.x - itemPos.x) + Math.abs(b.y - itemPos.y);
      return distA - distB || b.battery - a.battery;
    });

  const chosen = available[0] || robots.sort((a, b) => b.battery - a.battery)[0];

  return {
    robot_id: chosen.id,
    task_sequence: [
      `navigate_to:${order.itemLocation}`,
      "pick_item",
      "navigate_to:PACK_ZONE",
      "drop_item",
      "return_to:CHARGING",
    ],
    reasoning_summary: `Fallback: ${chosen.id} selected by proximity (dist=${Math.abs(chosen.x - itemPos.x) + Math.abs(chosen.y - itemPos.y)}) and battery (${chosen.battery.toFixed(0)}%).`,
  };
}
