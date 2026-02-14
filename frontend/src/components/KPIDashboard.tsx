import { Metrics, Robot } from "../types";

interface Props {
  metrics: Metrics;
  robots: Robot[];
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function KPIDashboard({ metrics, robots }: Props) {
  const activeRobots = robots.filter((r) => r.status !== "idle" && r.status !== "charging").length;
  const utilizationPct = robots.length > 0 ? ((activeRobots / robots.length) * 100).toFixed(0) : "0";

  const cards = [
    { label: "Orders Completed", value: `${metrics.ordersCompleted}/${metrics.ordersTotal}`, color: "#34d399" },
    { label: "Avg Task Time", value: formatTime(metrics.avgTaskTimeMs), color: "#60a5fa" },
    { label: "Robot Utilization", value: `${utilizationPct}%`, color: "#a78bfa" },
    { label: "Throughput/hr", value: metrics.throughputPerHour.toFixed(1), color: "#f59e0b" },
    { label: "Congestion Events", value: String(metrics.congestionEvents), color: "#ef4444" },
    { label: "Reassignments", value: String(metrics.reassignments), color: "#fb923c" },
    { label: "Active Robots", value: `${activeRobots}/${robots.length}`, color: "#22d3ee" },
    { label: "Uptime", value: formatUptime(metrics.uptimeSeconds), color: "#94a3b8" },
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>KPI Dashboard</h3>
      <div style={styles.grid}>
        {cards.map((card) => (
          <div key={card.label} style={styles.card}>
            <div style={{ ...styles.value, color: card.color }}>{card.value}</div>
            <div style={styles.label}>{card.label}</div>
          </div>
        ))}
      </div>

      <h4 style={{ ...styles.title, fontSize: 13, marginTop: 16 }}>Robot Status</h4>
      <div style={styles.robotList}>
        {robots.map((robot) => (
          <div key={robot.id} style={styles.robotRow}>
            <span style={{ ...styles.robotId, color: statusColor(robot.status) }}>{robot.id}</span>
            <span style={styles.robotStatus}>{robot.status}</span>
            <div style={styles.batteryBar}>
              <div
                style={{
                  ...styles.batteryFill,
                  width: `${robot.battery}%`,
                  backgroundColor: robot.battery > 50 ? "#22c55e" : robot.battery > 20 ? "#eab308" : "#ef4444",
                }}
              />
            </div>
            <span style={styles.batteryText}>{robot.battery.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    idle: "#60a5fa", moving: "#34d399", picking: "#f59e0b",
    delivering: "#a78bfa", charging: "#e6a817",
  };
  return map[status] || "#94a3b8";
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 16 },
  title: { color: "#e5e7eb", fontSize: 15, fontWeight: 700, margin: "0 0 12px 0", letterSpacing: 0.5 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  card: {
    background: "#1e2028",
    borderRadius: 8,
    padding: "12px 10px",
    textAlign: "center",
    border: "1px solid #2a2d35",
  },
  value: { fontSize: 20, fontWeight: 800, fontFamily: "monospace" },
  label: { fontSize: 10, color: "#9ca3af", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  robotList: { display: "flex", flexDirection: "column", gap: 4 },
  robotRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 8px",
    background: "#1a1d23",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
  },
  robotId: { fontWeight: 700, width: 28 },
  robotStatus: { color: "#9ca3af", width: 72, fontSize: 11 },
  batteryBar: {
    flex: 1,
    height: 6,
    background: "#333",
    borderRadius: 3,
    overflow: "hidden",
  },
  batteryFill: { height: "100%", borderRadius: 3, transition: "width 0.3s" },
  batteryText: { color: "#9ca3af", width: 32, textAlign: "right", fontSize: 11 },
};
