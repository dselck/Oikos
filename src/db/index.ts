import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dataDir, "oikos.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for high concurrency
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

let isMigrated = false;

/**
 * Robust Database Initializer & Auto-Migrator
 * Safely applies Drizzle SQL migrations and initializes default instance configuration.
 */
export function initDatabase() {
  if (isMigrated) return;

  try {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    if (fs.existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder });
    }
  } catch (err) {
    console.error("Drizzle migration runner:", err);
  }

  const now = new Date().toISOString();

  // Ensure a default Instance config exists if empty
  try {
    const existingInst = sqlite.prepare("SELECT COUNT(*) as count FROM instances").get() as { count: number };
    if (existingInst.count === 0) {
      const defaultUrl = process.env.AGENTOS_URL || "http://localhost:8000";
      const defaultApiKey = process.env.AGENTOS_API_KEY || "";

      sqlite.prepare(`
        INSERT INTO instances (id, name, base_url, api_key, is_default, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 'unknown', ?, ?)
      `).run(
        "default-instance",
        "Local AgentOS",
        defaultUrl,
        defaultApiKey,
        now,
        now
      );
    }
  } catch (e) {
    console.error("Default instance seed check:", e);
  }

  isMigrated = true;
}
