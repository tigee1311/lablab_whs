import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || "./data/opstwin.db";

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// const db = new Database(DB_PATH);
// const DB_PATH = "./database.sqlite";
const db: any = new Database(DB_PATH);
export { db };

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS robots (
      id TEXT PRIMARY KEY,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      battery REAL NOT NULL DEFAULT 100,
      current_task_id TEXT,
      path_json TEXT DEFAULT '[]',
      target_description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      item_location TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_robot TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (assigned_robot) REFERENCES robots(id)
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      orders_completed INTEGER DEFAULT 0,
      orders_total INTEGER DEFAULT 0,
      total_task_time_ms INTEGER DEFAULT 0,
      congestion_events INTEGER DEFAULT 0,
      reassignments INTEGER DEFAULT 0,
      started_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gemini_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      prompt_type TEXT NOT NULL,
      request_summary TEXT,
      response_json TEXT,
      latency_ms INTEGER
    );
  `);

  // Initialize metrics row if not exists
  const metricsRow = db.prepare("SELECT id FROM metrics WHERE id = 1").get();
  if (!metricsRow) {
    db.prepare("INSERT INTO metrics (id, started_at) VALUES (1, ?)").run(Date.now());
  }
}

export default db;
