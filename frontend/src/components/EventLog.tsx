import { WSMessage } from "../types";

interface Props {
  events: WSMessage[];
}

function formatEvent(event: WSMessage): { text: string; color: string } {
  switch (event.type) {
    case "order_created":
      return { text: `Order ${event.payload?.id} created [${event.payload?.itemLocation}]`, color: "#60a5fa" };
    case "order_assigned":
      return {
        text: `Order ${event.payload?.order?.id} -> ${event.payload?.plan?.robot_id}: "${event.payload?.plan?.reasoning_summary?.slice(0, 80)}"`,
        color: "#34d399",
      };
    case "order_completed":
      return { text: `Order ${event.payload?.id} completed`, color: "#22c55e" };
    case "battery_alert":
      return { text: `Battery alert: ${event.payload?.robot} at ${event.payload?.battery?.toFixed(0)}%`, color: "#f59e0b" };
    case "task_reassigned":
      return { text: `Task reassigned: ${event.payload?.orderId} (${event.payload?.reason})`, color: "#fb923c" };
    case "congestion_resolved":
      return { text: `Congestion resolved, ${event.payload?.plans?.length || 0} robots rerouted`, color: "#ef4444" };
    case "simulation_reset":
      return { text: "Simulation reset", color: "#94a3b8" };
    case "connected":
      return { text: "Connected to server", color: "#22c55e" };
    default:
      return { text: `${event.type}`, color: "#4b5563" };
  }
}

export function EventLog({ events }: Props) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>AI Decision Log</h3>
      <div style={styles.list}>
        {events.length === 0 && <div style={styles.empty}>Waiting for events...</div>}
        {events.map((event, i) => {
          const { text, color } = formatEvent(event);
          return (
            <div key={i} style={styles.entry}>
              <span style={{ ...styles.dot, backgroundColor: color }} />
              <span style={styles.text}>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 16 },
  title: { color: "#e5e7eb", fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" },
  list: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 250, overflowY: "auto" },
  empty: { color: "#4b5563", fontSize: 12, fontStyle: "italic" },
  entry: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, fontFamily: "monospace" },
  dot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 4 },
  text: { color: "#d1d5db", lineHeight: 1.4 },
};
