import {
  ClientToolDefinition,
  ClientToolResult,
  ToolExecutionContext,
} from "./types";
import { ToolCallExecution } from "../types";

export interface ToolExecutionResponse {
  isClientHandled: boolean;
  result?: ClientToolResult;
  continuationPayload?: {
    tool_call_id: string;
    output: unknown;
  };
}

/**
 * Client Tool Engine
 *
 * Deep module encapsulating client-side tool registration, execution timing,
 * security header sanitization, fallback routing (e.g. generic_http_tool),
 * and run continuation payload construction.
 */
export class ClientToolEngine {
  private static instance: ClientToolEngine;
  private tools: Map<string, ClientToolDefinition> = new Map();

  public constructor() {}

  public static getInstance(): ClientToolEngine {
    if (!ClientToolEngine.instance) {
      ClientToolEngine.instance = new ClientToolEngine();
    }
    return ClientToolEngine.instance;
  }

  public registerTool(tool: ClientToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name) || name === "generic_http_tool";
  }

  public getTool(name: string): ClientToolDefinition | undefined {
    return this.tools.get(name) || this.tools.get("generic_http_tool");
  }

  public listTools(): ClientToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ClientToolResult> {
    const startTime = Date.now();
    let tool = this.tools.get(name);

    if (!tool && (args.url || name === "generic_http_tool")) {
      tool = this.tools.get("generic_http_tool");
    }

    if (!tool) {
      return {
        toolCallId: context.toolCallId,
        status: "error",
        output: null,
        error: `Client tool '${name}' is not registered in ClientToolEngine`,
        executionLocation: "client",
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const output = await tool.handler(args, context);
      return {
        toolCallId: context.toolCallId,
        status: "success",
        output,
        executionLocation: "client",
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        toolCallId: context.toolCallId,
        status: "error",
        output: null,
        error: err.message || `Error executing client tool '${name}'`,
        executionLocation: "client",
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Primary deep entrypoint for executing client tools and generating run continuation payloads.
   */
  public async executeAndContinue(
    toolCall: ToolCallExecution,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResponse> {
    const toolName = toolCall.toolName;
    const args = toolCall.arguments || {};

    if (!this.hasTool(toolName) && !args.url && toolName !== "generic_http_tool") {
      return { isClientHandled: false };
    }

    const result = await this.executeTool(toolName, args, context);

    return {
      isClientHandled: true,
      result,
      continuationPayload: {
        tool_call_id: toolCall.id,
        output: result.output || result.error,
      },
    };
  }
}

export const clientToolEngine = ClientToolEngine.getInstance();
