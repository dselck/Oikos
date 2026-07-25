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
 * Agno Native Agent Registry Table
 * Stored definitions for Agno Agent instances (compatible with agent.save() & get_agent_by_id)
 */
export const agnoAgents = sqliteTable("agno_agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  modelProvider: text("model_provider").notNull().default("openai"), // openai, anthropic, ollama, groq
  modelName: text("model_name").notNull().default("gpt-4o"),
  instructionsJson: text("instructions_json"), // JSON string array of instructions
  systemPrompt: text("system_prompt"),
  toolsJson: text("tools_json"), // JSON string array of tool IDs
  memoryConfigJson: text("memory_config_json"), // JSON string memory settings
  knowledgeBaseId: text("knowledge_base_id"), // Optional attached RAG knowledge base
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Agno Native Team Registry Table
 * Stored definitions for Agno multi-agent Teams
 */
export const agnoTeams = sqliteTable("agno_teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leaderAgentId: text("leader_agent_id").notNull(),
  memberAgentIdsJson: text("member_agent_ids_json").notNull(), // JSON string array of member agent IDs
  executionMode: text("execution_mode").notNull().default("hierarchical"), // hierarchical, autonomous, round_robin, sequential
  instructionsJson: text("instructions_json"),
  sharedMemory: integer("shared_memory", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Agno Native Workflow Registry Table
 * Stored definitions for DB-driven deterministic Workflows
 */
export const agnoWorkflows = sqliteTable("agno_workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  stepsJson: text("steps_json").notNull(), // JSON string array of step definitions
  sessionStateJson: text("session_state_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Agno Native Knowledge Base Registry Table (RAG)
 * Vector database document stores and embeddings
 */
export const agnoKnowledgeBases = sqliteTable("agno_knowledge_bases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  vectorDbType: text("vector_db_type").notNull().default("sqlite_vec"), // pgvector, sqlite_vec, qdrant, lancedb
  tableOrCollection: text("table_or_collection").notNull(),
  embedderModel: text("embedder_model").notNull().default("text-embedding-3-small"),
  documentCount: integer("document_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Session History & Metadata
 */
export const savedSessions = sqliteTable("saved_sessions", {
  id: text("id").primaryKey(),
  instanceId: text("instance_id").notNull(),
  agentId: text("agent_id").notNull(),
  title: text("title").notNull(),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Key-Value Settings
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
