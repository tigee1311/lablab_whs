import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { initDatabase } from "./models/database";
import { createApiRouter } from "./routes/api";
import { WSBroadcaster } from "./services/websocket";
import { SimulationEngine } from "./services/simulation";

const PORT = parseInt(process.env.PORT || "3001");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const TICK_MS = parseInt(process.env.SIMULATION_TICK_MS || "500");

// Initialize database
initDatabase();
console.log("Database initialized");

// Express app
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// HTTP server (shared with WebSocket)
const server = http.createServer(app);

// WebSocket broadcaster
const wsBroadcaster = new WSBroadcaster(server);

// Simulation engine
const simulation = new SimulationEngine((msg) => wsBroadcaster.broadcast(msg));

// API routes
app.use("/api", createApiRouter(simulation));

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(__dirname, "..", "public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// Start simulation
simulation.start(TICK_MS);

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════╗
║         OpsTwin AI - Backend             ║
║         AI Control Tower                 ║
╠══════════════════════════════════════════╣
║  REST API:    http://0.0.0.0:${PORT}       ║
║  WebSocket:   ws://0.0.0.0:${PORT}/ws      ║
║  Tick Rate:   ${TICK_MS}ms                      ║
║  CORS:        ${CORS_ORIGIN}   ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  simulation.stop();
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  simulation.stop();
  server.close();
  process.exit(0);
});
