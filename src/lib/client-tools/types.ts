/**
 * Client-side tool execution interfaces for Oikos
 */

export interface ToolExecutionContext {
  instanceId: string;
  agentId: string;
  sessionId?: string;
  runId?: string;
  toolCallId: string;
  headers?: Record<string, string>;
}

export interface ClientToolResult {
  toolCallId: string;
  status: "success" | "error";
  output: unknown;
  error?: string;
  executionLocation: "client";
  durationMs?: number;
}

export type ClientToolHandler = (
  args: Record<string, any>,
  context: ToolExecutionContext
) => Promise<unknown>;

export interface ClientToolDefinition {
  name: string;
  description: string;
  provider: "jira" | "confluence" | "gitlab" | "custom";
  executionLocation: "client";
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  handler: ClientToolHandler;
}




