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
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps?: string[];
}

export interface Session {
  id: string;
  instanceId: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCallExecution {
  id: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  output?: unknown;
  status: "running" | "success" | "error";
  startTime: number;
  endTime?: number;
  durationMs?: number;
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

