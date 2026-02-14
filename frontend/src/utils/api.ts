const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getState: () => request<any>("/state"),
  getRobots: () => request<any[]>("/robots"),
  getOrders: () => request<any[]>("/orders"),
  getMetrics: () => request<any>("/metrics"),

  createOrder: (itemLocation: string, quantity: number, priority: string) =>
    request<any>("/orders", {
      method: "POST",
      body: JSON.stringify({ itemLocation, quantity, priority }),
    }),

  batchOrders: (count: number) =>
    request<any>("/demo/batch-orders", {
      method: "POST",
      body: JSON.stringify({ count: String(count) }),
    }),

  resetSimulation: () =>
    request<any>("/reset", { method: "POST" }),

  getWarehouse: () => request<any>("/warehouse"),

  getGeminiLogs: (limit = 20) => request<any[]>(`/gemini-logs?limit=${limit}`),
};
