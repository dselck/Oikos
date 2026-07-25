import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Oikos Instance Configurations
 * Manages target Agno AgentOS endpoints and authentication
 */
export const instances = sqliteTable("instances", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("unknown"), // connected, unreachable, unknown
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Key-Value Settings & UI Preferences
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
