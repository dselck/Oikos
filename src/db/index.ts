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
 * Safely applies Drizzle SQL migrations whether database is virgin or pre-existing.
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

  // Seed default Instance if empty
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

    // Seed starter Agno Agents if empty
    const existingAgents = sqlite.prepare("SELECT COUNT(*) as count FROM agno_agents").get() as { count: number };
    if (existingAgents.count === 0) {
      sqlite.prepare(`
        INSERT INTO agno_agents (id, name, description, model_provider, model_name, instructions_json, system_prompt, tools_json, is_published, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        "agent",
        "General Agent",
        "General-purpose Agno agent with Web Search & Python Code Tools",
        "openai",
        "gpt-4o",
        JSON.stringify(["Be helpful, concise, and accurate."]),
        "You are a helpful autonomous agent powered by Agno AgentOS.",
        JSON.stringify(["duckduckgo_search", "python_interpreter"]),
        now,
        now
      );

      sqlite.prepare(`
        INSERT INTO agno_agents (id, name, description, model_provider, model_name, instructions_json, system_prompt, tools_json, is_published, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        "researcher",
        "Deep Researcher",
        "Autonomous researcher agent for multi-step information gathering",
        "anthropic",
        "claude-3-5-sonnet",
        JSON.stringify(["Research thoroughly", "Cite all primary sources"]),
        "You are an expert research analyst agent.",
        JSON.stringify(["web_search", "arxiv_reader", "summarizer"]),
        now,
        now
      );
    }

    // Seed starter Agno Team if empty
    const existingTeams = sqlite.prepare("SELECT COUNT(*) as count FROM agno_teams").get() as { count: number };
    if (existingTeams.count === 0) {
      sqlite.prepare(`
        INSERT INTO agno_teams (id, name, description, leader_agent_id, member_agent_ids_json, execution_mode, instructions_json, shared_memory, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        "research-synthesis-team",
        "Research & Synthesis Team",
        "Multi-agent team coordinating deep research and publishing",
        "agent",
        JSON.stringify(["agent", "researcher"]),
        "hierarchical",
        JSON.stringify(["Leader delegates research tasks and synthesizes final output"]),
        now,
        now
      );
    }
  } catch (e) {
    console.error("Seeding status check:", e);
  }

  isMigrated = true;
}
