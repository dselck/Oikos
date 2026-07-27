export interface MockAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  tools?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  created_at?: number;
}

export interface MockSession {
  session_id: string;
  agent_id?: string;
  team_id?: string;
  workflow_id?: string;
  title: string;
  created_at: number;
  updated_at: number;
  metadata?: Record<string, unknown>;
}

export interface MockWorkflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
}

export interface MockMemory {
  id: string;
  user_id?: string;
  memory: string;
  created_at: number;
}

export interface MockTrace {
  trace_id: string;
  name: string;
  status: string;
  duration_ms: number;
  timestamp: number;
  spans: Array<Record<string, unknown>>;
}

export interface SimulatorOptions {
  port?: number;
  host?: string;
  quiet?: boolean;
}

export interface RouteMatchResult {
  pathPattern: string;
  params: Record<string, string>;
  operation: Record<string, unknown>;
}
