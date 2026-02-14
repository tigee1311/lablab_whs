import { useState, useCallback } from "react";
import { SimulationState } from "./types";
import { useWebSocket } from "./hooks/useWebSocket";
import { WarehouseCanvas } from "./components/WarehouseCanvas";
import { KPIDashboard } from "./components/KPIDashboard";
import { OrderPanel } from "./components/OrderPanel";
import { EventLog } from "./components/EventLog";
import { api } from "./utils/api";

const EMPTY_METRICS = {
  ordersCompleted: 0, ordersTotal: 0, avgTaskTimeMs: 0,
  robotUtilization: {}, congestionEvents: 0, reassignments: 0,
  throughputPerHour: 0, uptimeSeconds: 0,
};

export default function App() {
  const [state, setState] = useState<SimulationState>({
    robots: [], orders: [], metrics: EMPTY_METRICS,
    grid: [], tick: 0, congestionZones: [],
  });

  const onStateUpdate = useCallback((newState: SimulationState) => {
    setState(newState);
  }, []);

  const { connected, events } = useWebSocket(onStateUpdate);

  const handleReset = async () => {
    try {
      await api.resetSimulation();
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>OpsTwin AI</h1>
          <span style={styles.tagline}>AI Control Tower for Autonomous Warehouses</span>
        </div>
        <div style={styles.headerRight}>
          <div style={{ ...styles.statusDot, backgroundColor: connected ? "#22c55e" : "#ef4444" }} />
          <span style={styles.statusText}>{connected ? "Live" : "Disconnected"}</span>
          <span style={styles.tick}>Tick #{state.tick}</span>
          <button onClick={handleReset} style={styles.resetBtn}>Reset</button>
        </div>
      </header>

      {/* Main Layout */}
      <div style={styles.main}>
        {/* Left Panel - Orders */}
        <aside style={styles.leftPanel}>
          <OrderPanel orders={state.orders} />
        </aside>

        {/* Center - Warehouse Visualization */}
        <main style={styles.center}>
          <div style={styles.canvasWrapper}>
            <WarehouseCanvas
              grid={state.grid}
              robots={state.robots}
              congestionZones={state.congestionZones}
            />
          </div>
          <EventLog events={events} />
        </main>

        {/* Right Panel - KPI Dashboard */}
        <aside style={styles.rightPanel}>
          <KPIDashboard metrics={state.metrics} robots={state.robots} />
        </aside>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>Powered by Gemini AI</span>
        <span>System of Record: Vultr VM</span>
        <span>Simulation Mode</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "#0f1117",
    color: "#e5e7eb",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid #1e2028",
    background: "#13151b",
  },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 16 },
  logo: { fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5, color: "#fff" },
  tagline: { fontSize: 12, color: "#6b7280" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: "50%" },
  statusText: { fontSize: 12, color: "#9ca3af" },
  tick: { fontSize: 12, color: "#4b5563", fontFamily: "monospace" },
  resetBtn: {
    background: "#1e2028",
    color: "#9ca3af",
    border: "1px solid #2a2d35",
    borderRadius: 4,
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: 300,
    borderRight: "1px solid #1e2028",
    overflowY: "auto",
    background: "#13151b",
    flexShrink: 0,
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    padding: 16,
    gap: 16,
  },
  canvasWrapper: {
    display: "flex",
    justifyContent: "center",
  },
  rightPanel: {
    width: 320,
    borderLeft: "1px solid #1e2028",
    overflowY: "auto",
    background: "#13151b",
    flexShrink: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    gap: 32,
    padding: "8px 24px",
    borderTop: "1px solid #1e2028",
    fontSize: 11,
    color: "#4b5563",
    background: "#13151b",
  },
};
