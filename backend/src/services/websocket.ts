import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { WSMessage } from "../models/types";

export class WSBroadcaster {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`WebSocket client connected (total: ${this.clients.size})`);

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log(`WebSocket client disconnected (total: ${this.clients.size})`);
      });

      ws.on("error", (err) => {
        console.error("WebSocket error:", err.message);
        this.clients.delete(ws);
      });

      // Send welcome
      ws.send(JSON.stringify({ type: "connected", payload: { timestamp: Date.now() } }));
    });
  }

  broadcast(msg: WSMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
