export interface InstanceConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isDefault: boolean;
  status: "connected" | "unreachable" | "unknown";
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  model?: string;
  description?: string;
  tools?: string[];
  systemPrompt?: string;
  instructions?: string[];
  modelProvider?: string;
  modelName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  leaderAgentId?: string;
  memberAgentIds?: string[];
  executionMode?: string;
  instructions?: string[];
  sharedMemory?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  steps?: Array<Record<string, unknown>>;
  sessionState?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string | null;
  vectorDbType?: string;
  tableOrCollection?: string;
  embedderModel?: string;
  documentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IndexContentParams {
  kbId: string;
  sourceType: "text" | "markdown" | "url";
  title: string;
  content?: string;
  url?: string;
  readerType?: "text_reader" | "pdf_reader" | "website_reader" | "markdown_reader";
  chunkingStrategy?: "recursive" | "semantic" | "fixed_size";
  chunkSize?: number;
  chunkOverlap?: number;
  recreateVectorDb?: boolean;
}

export interface IngestionResponse {
  success: boolean;
  documentsIndexed: number;
  chunksGenerated: number;
  message: string;
}

export interface Session {
  id: string;
  instanceId?: string;
  agentId?: string;
  title?: string;
  messagesCount?: number;
  lastMessageSnippet?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionTelemetry {
  totalMessages: number;
  totalToolCalls: number;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
}

export interface SessionDetails {
  id: string;
  instanceId?: string;
  agentId?: string;
  title?: string;
  messages: ChatMessage[];
  memorySummary?: string;
  userContext?: Record<string, unknown>;
  telemetry?: SessionTelemetry;
  createdAt?: string;
  updatedAt?: string;
}

export interface ToolCallExecution {
  id: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  output?: unknown;
  status: "running" | "success" | "error" | "paused";
  startTime: number;
  endTime?: number;
  durationMs?: number;
  runId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  toolExecutions?: ToolCallExecution[];
  rawEvents?: Record<string, unknown>[];
  metrics?: {
    timeToFirstTokenMs?: number;
    totalDurationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
}

export type ViewMode = "playground" | "agents" | "control-plane" | "workflows" | "documents" | "sessions";

export const MODEL_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GROQ: "groq",
  OLLAMA: "ollama",
} as const;

export const DEFAULT_MODELS = {
  OPENAI: "gpt-4o",
  ANTHROPIC: "claude-3-5-sonnet",
} as const;

export const EXECUTION_MODES = {
  HIERARCHICAL: "hierarchical",
  PARALLEL: "parallel",
  SEQUENTIAL: "sequential",
} as const;

