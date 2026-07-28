import { ChatMessage, ToolCallExecution, SessionDetails } from "./types";
import { ClientToolEngine, clientToolEngine } from "./client-tools";
import { createAgentOSClient, IAgentOSClient } from "./agentos-client";
import { useOikosStore } from "./store";


export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

export interface StreamRunOptions {
  instanceId: string;
  entityType?: "agent" | "team" | "workflow";
  entityId: string;
  message: string;
  sessionId?: string;
  userId?: string;
  files?: string[];
  version?: string;
  onChunk?: (chunk: string, metrics: { tokensPerSecond: number; timeToFirstTokenMs: number; totalDurationMs: number }) => void;
  onToolCall?: (toolCall: ToolCallExecution) => void;
  onRawEvent?: (event: Record<string, unknown>) => void;
}

export interface StreamState {
  isStreaming: boolean;
  tokensPerSecond: number | null;
  streamError: string | null;
}

export interface SessionStreamSink {
  onMessageAdd?: (message: ChatMessage) => void;
  onMessageUpdate?: (updater: (prev: ChatMessage) => ChatMessage) => void;
  onStateChange?: (state: StreamState) => void;
}

export interface StreamMessageOptions extends StreamRunOptions {
  attachedFiles?: AttachedFile[];
  sink?: SessionStreamSink;
  signal?: AbortSignal;
  toolEngine?: ClientToolEngine;
  client?: IAgentOSClient;
}

export interface ContinueRunParams {
  instanceId: string;
  entityType?: "agent" | "team" | "workflow";
  entityId: string;
  runId: string;
  sessionId?: string;
  tools: Array<Record<string, unknown>>;
  input?: string;
}

export type StreamEvent =
  | { type: "content_delta"; content: string }
  | { type: "metrics_update"; metrics: { timeToFirstTokenMs: number; totalDurationMs: number; tokensPerSecond: number } }
  | { type: "tool_execution_start"; toolExecution: ToolCallExecution }
  | { type: "tool_execution_update"; toolExecution: ToolCallExecution }
  | { type: "tool_execution_end"; toolExecution: ToolCallExecution }
  | { type: "raw_event"; event: Record<string, unknown> };

export interface SessionRunSummary {
  content: string;
  metrics: { timeToFirstTokenMs: number; totalDurationMs: number; tokensPerSecond: number };
  toolExecutions: ToolCallExecution[];
  rawEvents: Record<string, unknown>[];
}

export class SessionStreamEngine {
  private startTime: number = 0;
  private firstTokenTime: number | null = null;
  private chunkCount: number = 0;
  private toolExecMap: Map<string, ToolCallExecution> = new Map();
  private rawEvents: Record<string, unknown>[] = [];
  private accumulatedContent: string = "";
  private toolEngine: ClientToolEngine;
  private client?: IAgentOSClient;
  private currentAbortController: AbortController | null = null;

  constructor(toolEngine?: ClientToolEngine, client?: IAgentOSClient) {
    this.toolEngine = toolEngine || clientToolEngine;
    this.client = client;
  }

  /**
   * Cancels any active streaming run managed by this engine.
   */
  public cancelStream(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Primary deep entrypoint for streaming session messages.
   * Manages user & assistant ChatMessages, token metrics, store state updates,
   * cancellation via AbortSignal, and connection error handling.
   */
  public async streamMessage(options: StreamMessageOptions): Promise<SessionRunSummary> {
    const {
      instanceId,
      entityId,
      entityType = "agent",
      message,
      attachedFiles = [],
      sessionId,
      signal,
    } = options;

    const sink: SessionStreamSink = options.sink ?? {};

    if ((!message.trim() && attachedFiles.length === 0) || !instanceId) {
      return {
        content: "",
        metrics: { timeToFirstTokenMs: 0, totalDurationMs: 0, tokensPerSecond: 0 },
        toolExecutions: [],
        rawEvents: [],
      };
    }

    const userQuery = message.trim();

    const controller = new AbortController();
    this.currentAbortController = controller;

    sink.onStateChange?.({ isStreaming: true, tokensPerSecond: null, streamError: null });

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content:
        userQuery +
        (attachedFiles.length > 0
          ? `\n\n📎 Attached files: ${attachedFiles.map((f) => f.name).join(", ")}`
          : ""),
      timestamp: new Date().toISOString(),
    };
    sink.onMessageAdd?.(userMsg);

    // 2. Add Assistant Message Placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      toolExecutions: [],
      rawEvents: [],
      metrics: {
        timeToFirstTokenMs: 0,
        totalDurationMs: 0,
        promptTokens: Math.floor(userQuery.length / 4) + 50,
        completionTokens: 0,
      },
    };
    sink.onMessageAdd?.(assistantMsg);

    try {
      const generator = this.streamRun({
        instanceId,
        entityType,
        entityId,
        message: userQuery,
        sessionId,
        userId: options.userId,
        files: options.files,
        version: options.version,
      });

      for await (const event of generator) {
        if (signal?.aborted || controller.signal.aborted) {
          sink.onMessageUpdate?.((prev) => ({
            ...prev,
            content: prev.content + "\n\n*(Stream cancelled)*",
          }));
          break;
        }

        if (event.type === "content_delta") {
          sink.onMessageUpdate?.((prev) => ({
            ...prev,
            content: prev.content + event.content,
          }));
        } else if (event.type === "metrics_update") {
          sink.onStateChange?.({ isStreaming: true, tokensPerSecond: event.metrics.tokensPerSecond, streamError: null });
          sink.onMessageUpdate?.((prev) => ({
            ...prev,
            metrics: {
              ...prev.metrics,
              timeToFirstTokenMs: event.metrics.timeToFirstTokenMs,
              totalDurationMs: event.metrics.totalDurationMs,
              completionTokens: Math.floor(prev.content.length / 4),
            },
          }));
        } else if (event.type === "raw_event") {
          sink.onMessageUpdate?.((prev) => ({
            ...prev,
            rawEvents: [...(prev.rawEvents || []), event.event],
          }));
        } else if (
          event.type === "tool_execution_start" ||
          event.type === "tool_execution_update" ||
          event.type === "tool_execution_end"
        ) {
          sink.onMessageUpdate?.((prev) => ({
            ...prev,
            toolExecutions: [
              ...(prev.toolExecutions || []).filter((t) => t.id !== event.toolExecution.id),
              event.toolExecution,
            ],
          }));
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sink.onStateChange?.({ isStreaming: false, tokensPerSecond: null, streamError: errMsg });
      sink.onMessageUpdate?.((prev) => ({
        ...prev,
        content: prev.content + `\n\n⚠️ **Error connecting to AgentOS**: ${errMsg}`,
      }));
    } finally {
      sink.onStateChange?.({ isStreaming: false, tokensPerSecond: null, streamError: null });
      if (this.currentAbortController === controller) {
        this.currentAbortController = null;
      }
    }

    return {
      content: this.accumulatedContent,
      metrics: {
        timeToFirstTokenMs: this.firstTokenTime ? this.firstTokenTime - this.startTime : 0,
        totalDurationMs: Date.now() - this.startTime,
        tokensPerSecond:
          this.startTime > 0 && Date.now() > this.startTime
            ? Number((this.chunkCount / ((Date.now() - this.startTime) / 1000)).toFixed(1))
            : 0,
      },
      toolExecutions: Array.from(this.toolExecMap.values()),
      rawEvents: this.rawEvents,
    };
  }


  /**
   * Main entrypoint for streaming session runs. Yields domain StreamEvents.
   */
  public async *streamRun(
    options: StreamRunOptions
  ): AsyncGenerator<StreamEvent, SessionRunSummary, void> {
    const {
      instanceId,
      entityType = "agent",
      entityId,
      message,
      sessionId,
      onChunk,
      onToolCall,
      onRawEvent,
    } = options;

    this.startTime = Date.now();
    this.firstTokenTime = null;
    this.chunkCount = 0;
    this.toolExecMap.clear();
    this.rawEvents = [];
    this.accumulatedContent = "";

    const activeClient = this.client || createAgentOSClient(instanceId);
    const res = await activeClient.runs.stream({
      entityType,
      entityId,
      message,
      sessionId,
      userId: options.userId,
      files: options.files,
      version: options.version,
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`AgentOS execution failed (${res.status}): ${errorText}`);
    }

    for await (const event of this.processStream(
      res.body,
      instanceId,
      entityId,
      entityType,
      onChunk,
      onToolCall,
      onRawEvent
    )) {
      yield event;
    }

    const totalDurationMs = Date.now() - this.startTime;
    const timeToFirstTokenMs = this.firstTokenTime ? this.firstTokenTime - this.startTime : 0;
    const elapsedSec = totalDurationMs / 1000;
    const tokensPerSecond = elapsedSec > 0 ? Number((this.chunkCount / elapsedSec).toFixed(1)) : 0;

    return {
      content: this.accumulatedContent,
      metrics: { timeToFirstTokenMs, totalDurationMs, tokensPerSecond },
      toolExecutions: Array.from(this.toolExecMap.values()),
      rawEvents: this.rawEvents,
    };
  }

  /**
   * Resumes a paused session run after human-in-the-loop or client tool execution.
   */
  public async *continueSession(
    params: ContinueRunParams,
    onChunk?: (chunk: string, metrics: { tokensPerSecond: number; timeToFirstTokenMs: number; totalDurationMs: number }) => void,
    onToolCall?: (toolCall: ToolCallExecution) => void,
    onRawEvent?: (event: Record<string, unknown>) => void
  ): AsyncGenerator<StreamEvent, void, void> {
    const { instanceId, entityType = "agent", entityId, runId, sessionId, tools, input } = params;

    const activeClient = this.client || createAgentOSClient(instanceId);
    const res = await activeClient.runs.continue({
      instanceId,
      entityType: entityType as "agent" | "team" | "workflow",
      entityId,
      runId,
      sessionId,
      tools,
      input,
    } as any);

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Failed to continue AgentOS run (${res.status}): ${errorText}`);
    }

    for await (const event of this.processStream(
      res.body,
      instanceId,
      entityId,
      entityType,
      onChunk,
      onToolCall,
      onRawEvent
    )) {
      yield event;
    }
  }


  private async *processStream(
    body: ReadableStream<Uint8Array>,
    instanceId: string,
    entityId: string,
    entityType: string,
    onChunk?: (chunk: string, metrics: { tokensPerSecond: number; timeToFirstTokenMs: number; totalDurationMs: number }) => void,
    onToolCall?: (toolCall: ToolCallExecution) => void,
    onRawEvent?: (event: Record<string, unknown>) => void
  ): AsyncGenerator<StreamEvent, void, void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            this.rawEvents.push(parsed);
            yield { type: "raw_event", event: parsed };
            if (onRawEvent) onRawEvent(parsed);

            const chunkContent =
              parsed.content ||
              (parsed.event === "RunResponse" || parsed.event === "RunContent" ? parsed.content : null);

            if (chunkContent && typeof chunkContent === "string") {
              if (!this.firstTokenTime) {
                this.firstTokenTime = Date.now();
              }
              this.chunkCount += 1;
              this.accumulatedContent += chunkContent;

              const totalDurationMs = Date.now() - this.startTime;
              const timeToFirstTokenMs = this.firstTokenTime - this.startTime;
              const elapsedSec = totalDurationMs / 1000;
              const tokensPerSecond = elapsedSec > 0 ? Number((this.chunkCount / elapsedSec).toFixed(1)) : 0;

              const metrics = { tokensPerSecond, timeToFirstTokenMs, totalDurationMs };

              yield { type: "content_delta", content: chunkContent };
              yield { type: "metrics_update", metrics };

              if (onChunk) {
                onChunk(chunkContent, metrics);
              }
            }

            // Handle Tool Execution & Deferred Client Tool Calls via ClientToolEngine
            if (parsed.tool_call || parsed.event === "RunPaused") {
              const tc = parsed.tool_call || (parsed.data && parsed.data.tool_call);
              const runId = parsed.run_id || (parsed.data && parsed.data.run_id);
              if (tc) {
                const toolExecution: ToolCallExecution = {
                  id: tc.id || `tool-${Date.now()}`,
                  toolName: tc.name || "Tool Execution",
                  arguments: tc.args,
                  status: "running",
                  startTime: this.startTime,
                  runId,
                };
                this.toolExecMap.set(toolExecution.id, toolExecution);

                yield { type: "tool_execution_start", toolExecution };
                if (onToolCall) onToolCall(toolExecution);

                if (runId) {
                  const response = await this.toolEngine.executeAndContinue(toolExecution, {
                    instanceId,
                    agentId: entityId,
                    toolCallId: toolExecution.id,
                  });

                  if (response.isClientHandled && response.result && response.continuationPayload) {
                    const updatedExecution: ToolCallExecution = {
                      ...toolExecution,
                      status: response.result.status === "success" ? "success" : "error",
                      output: response.result.output || response.result.error,
                      durationMs: response.result.durationMs,
                    };
                    this.toolExecMap.set(toolExecution.id, updatedExecution);

                    yield { type: "tool_execution_end", toolExecution: updatedExecution };

                    // Continue run via continueSession
                    for await (const contEvent of this.continueSession(
                      {
                        instanceId,
                        entityType: entityType as "agent" | "team" | "workflow",
                        entityId,
                        runId,
                        sessionId: parsed.session_id || (parsed.data && parsed.data.session_id),
                        tools: [response.continuationPayload],
                      },
                      onChunk,
                      onToolCall,
                      onRawEvent
                    )) {
                      yield contEvent;
                    }
                  } else {
                    const pausedExecution: ToolCallExecution = {
                      ...toolExecution,
                      status: "paused",
                    };
                    this.toolExecMap.set(toolExecution.id, pausedExecution);
                  }
                }
              }
            }

            if (parsed.tool_result) {
              const toolResult: ToolCallExecution = {
                id: parsed.tool_result.id || `tool-${Date.now()}`,
                toolName: parsed.tool_result.name || "Tool Execution",
                output: parsed.tool_result.output,
                status: "success",
                startTime: this.startTime,
                durationMs: Date.now() - this.startTime,
              };
              this.toolExecMap.set(toolResult.id, toolResult);

              yield { type: "tool_execution_end", toolExecution: toolResult };
            }
          } catch {
            if (onChunk && typeof jsonStr === "string") {
              onChunk(jsonStr, { tokensPerSecond: 0, timeToFirstTokenMs: 0, totalDurationMs: Date.now() - this.startTime });
            }
          }
        }
      }
    }
  }
}

export class SessionMemoryEngine {
  private client?: IAgentOSClient;

  constructor(client?: IAgentOSClient) {
    this.client = client;
  }

  /**
   * Fetches full session details, transcript messages, and user memory context.
   * Leverages useOikosStore sessionDetailsCache for high performance locality.
   */
  public async getSessionDetails(
    id: string,
    options?: { instanceId?: string; forceRefresh?: boolean; client?: IAgentOSClient }
  ): Promise<SessionDetails> {
    const activeClient = options?.client || this.client || createAgentOSClient(options?.instanceId || "default");
    const instanceId = options?.instanceId || "default";
    const cacheKey = `${instanceId}:${id}`;

    const { sessionDetailsCache, setSessionDetailsCache } = useOikosStore.getState();

    if (!options?.forceRefresh) {
      const cached = sessionDetailsCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const details = await activeClient.sessions.get(id);
    setSessionDetailsCache(cacheKey, details);
    return details;
  }

  /**
   * Evicts a session from the memory cache.
   */
  public evictSession(id: string, instanceId: string = "default"): void {
    const cacheKey = `${instanceId}:${id}`;
    useOikosStore.getState().evictSessionDetailsCache(cacheKey);
  }
}

export const sessionStreamEngine = new SessionStreamEngine();
export const sessionMemoryEngine = new SessionMemoryEngine();

