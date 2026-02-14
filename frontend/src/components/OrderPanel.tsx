import { useState } from "react";
import { Order } from "../types";
import { api } from "../utils/api";

const STORAGE_SLOTS = [
  "A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4", "D1", "D2", "D3", "D4",
  "E1", "E2", "E3", "E4", "F1", "F2", "F3", "F4",
  "G1", "G2", "G3", "G4", "H1", "H2", "H3", "H4",
  "I1", "I2", "I3", "I4", "J1", "J2", "J3", "J4",
  "K1", "K2", "K3", "K4", "L1", "L2", "L3", "L4",
];

interface Props {
  orders: Order[];
}

export function OrderPanel({ orders }: Props) {
  const [location, setLocation] = useState("A1");
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.createOrder(location, quantity, priority);
    } catch (err) {
      console.error("Order creation failed:", err);
    }
    setSubmitting(false);
  };

  const handleBatch = async () => {
    setSubmitting(true);
    try {
      await api.batchOrders(5);
    } catch (err) {
      console.error("Batch order failed:", err);
    }
    setSubmitting(false);
  };

  const activeOrders = orders.filter((o) => o.status !== "completed" && o.status !== "failed");
  const recentCompleted = orders
    .filter((o) => o.status === "completed")
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Order Control</h3>

      <div style={styles.form}>
        <div style={styles.row}>
          <label style={styles.label}>Location</label>
          <select value={location} onChange={(e) => setLocation(e.target.value)} style={styles.select}>
            {STORAGE_SLOTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Qty</label>
          <input type="number" min={1} max={10} value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))} style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={styles.select}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <button onClick={handleSubmit} disabled={submitting} style={styles.btn}>
          {submitting ? "Creating..." : "Create Order"}
        </button>
        <button onClick={handleBatch} disabled={submitting} style={{ ...styles.btn, background: "#4b5563" }}>
          Demo: 5 Random Orders
        </button>
      </div>

      <h4 style={{ ...styles.title, fontSize: 13, marginTop: 16 }}>Active Orders ({activeOrders.length})</h4>
      <div style={styles.orderList}>
        {activeOrders.length === 0 && <div style={styles.empty}>No active orders</div>}
        {activeOrders.map((o) => (
          <div key={o.id} style={styles.orderCard}>
            <div style={styles.orderHeader}>
              <span style={styles.orderId}>{o.id}</span>
              <span style={{ ...styles.badge, ...priorityStyle(o.priority) }}>{o.priority}</span>
            </div>
            <div style={styles.orderDetail}>
              <span>Loc: {o.itemLocation}</span>
              <span>Qty: {o.quantity}</span>
              <span style={{ color: statusColor(o.status) }}>{o.status}</span>
            </div>
            {o.assignedRobot && <div style={styles.assignedRobot}>Robot: {o.assignedRobot}</div>}
          </div>
        ))}
      </div>

      {recentCompleted.length > 0 && (
        <>
          <h4 style={{ ...styles.title, fontSize: 13, marginTop: 16 }}>Recent Completed</h4>
          <div style={styles.orderList}>
            {recentCompleted.map((o) => (
              <div key={o.id} style={{ ...styles.orderCard, opacity: 0.6 }}>
                <span style={styles.orderId}>{o.id}</span>
                <span style={{ color: "#34d399", fontSize: 11 }}>
                  {o.completedAt ? `${((o.completedAt - o.createdAt) / 1000).toFixed(1)}s` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "#9ca3af", assigned: "#60a5fa", in_progress: "#34d399",
    picking: "#f59e0b", delivering: "#a78bfa", completed: "#22c55e", failed: "#ef4444",
  };
  return map[status] || "#9ca3af";
}

function priorityStyle(p: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    low: { background: "#374151", color: "#9ca3af" },
    medium: { background: "#1e3a5f", color: "#60a5fa" },
    high: { background: "#7c2d12", color: "#fb923c" },
    urgent: { background: "#7f1d1d", color: "#fca5a5" },
  };
  return map[p] || {};
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 16 },
  title: { color: "#e5e7eb", fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  row: { display: "flex", alignItems: "center", gap: 8 },
  label: { color: "#9ca3af", fontSize: 12, width: 60, flexShrink: 0 },
  select: {
    flex: 1, background: "#1a1d23", color: "#e5e7eb", border: "1px solid #2a2d35",
    borderRadius: 4, padding: "6px 8px", fontSize: 13, outline: "none",
  },
  input: {
    flex: 1, background: "#1a1d23", color: "#e5e7eb", border: "1px solid #2a2d35",
    borderRadius: 4, padding: "6px 8px", fontSize: 13, outline: "none", width: 60,
  },
  btn: {
    background: "#2563eb", color: "#fff", border: "none", borderRadius: 6,
    padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    marginTop: 4,
  },
  orderList: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" },
  empty: { color: "#4b5563", fontSize: 12, fontStyle: "italic", padding: 8 },
  orderCard: {
    background: "#1a1d23", borderRadius: 6, padding: "8px 10px",
    border: "1px solid #2a2d35", fontSize: 12, fontFamily: "monospace",
  },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  orderId: { color: "#e5e7eb", fontWeight: 700 },
  badge: { padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const },
  orderDetail: { display: "flex", gap: 12, color: "#9ca3af", fontSize: 11 },
  assignedRobot: { color: "#60a5fa", fontSize: 11, marginTop: 2 },
};
