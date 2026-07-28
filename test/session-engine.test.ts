import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startSimulator } from "../simulator/server";
import { SessionStreamEngine, sessionStreamEngine, StreamEvent } from "../src/lib/session-engine";
import { ClientToolEngine, ToolExecutionResponse } from "../src/lib/client-tools/engine";
import { ClientToolResult, ToolExecutionContext } from "../src/lib/client-tools/types";
import { ChatMessage, ToolCallExecution } from "../src/lib/types";
import { useOikosStore } from "../src/lib/store";

class FakeToolAdapter extends ClientToolEngine {
  public executedTools: string[] = [];

  override hasTool(toolName: string): boolean {
    return toolName === "fake_test_tool";
  }

  override async executeAndContinue(
    toolExecution: ToolCallExecution,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResponse> {
    this.executedTools.push(toolExecution.toolName);
    return {
      isClientHandled: true,
      result: {
        toolCallId: context.toolCallId,
        status: "success",
        output: { result: "fake tool executed successfully" },
        executionLocation: "client",
      },
      continuationPayload: {
        tool_call_id: context.toolCallId,
        output: { result: "fake tool executed successfully" },
      },
    };
  }
}

describe("SessionStreamEngine Unit & Integration Tests", () => {
  let simulator: Awaited<ReturnType<typeof startSimulator>>;
  const nativeFetch = globalThis.fetch;

  beforeAll(async () => {
    simulator = await startSimulator({ port: 8996, quiet: true });

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = input.toString();

      if (urlStr.includes("/api/proxy/")) {
        const pathPart = urlStr.split("/api/proxy/")[1];
        const simUrl = `http://127.0.0.1:${simulator.port}/${pathPart}`;
        return nativeFetch(simUrl, init);
      }
      return nativeFetch(input, init);
    }) as typeof fetch;
  });

  afterAll(async () => {
    await simulator.stop();
  });

  it("yields domain StreamEvents via streamRun AsyncIterable generator", async () => {
    const fakeAdapter = new FakeToolAdapter();
    const engine = new SessionStreamEngine(fakeAdapter);
    const events: StreamEvent[] = [];
    let accumulatedContent = "";

    const generator = engine.streamRun({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Hello from streamRun generator test",
    });

    for await (const event of generator) {
      events.push(event);
      if (event.type === "content_delta") {
        accumulatedContent += event.content;
      }
    }

    expect(events.length).toBeGreaterThan(0);
    expect(accumulatedContent.length).toBeGreaterThan(0);
    expect(accumulatedContent).toContain("Hello from streamRun generator test");

    const contentEvents = events.filter((e) => e.type === "content_delta");
    const metricEvents = events.filter((e) => e.type === "metrics_update");
    const rawEvents = events.filter((e) => e.type === "raw_event");

    expect(contentEvents.length).toBeGreaterThan(0);
    expect(metricEvents.length).toBeGreaterThan(0);
    expect(rawEvents.length).toBeGreaterThan(0);
  });

  it("streamMessage sink fires streaming-state callbacks (onStateChange)", async () => {
    const engine = new SessionStreamEngine();
    const streamingStates: boolean[] = [];
    const addedMessages: ChatMessage[] = [];
    let lastError: string | null | undefined;
    let lastTps: number | null | undefined;

    const summary = await engine.streamMessage({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Hello from sink streaming-state test",
      sink: {
        onMessageAdd: (msg: ChatMessage) => addedMessages.push(msg),
        onMessageUpdate: (updater: (prev: ChatMessage) => ChatMessage) => {
          if (addedMessages.length > 0) {
            const i = addedMessages.length - 1;
            addedMessages[i] = updater(addedMessages[i]);
          }
        },
        onStateChange: (state) => {
          streamingStates.push(state.isStreaming);
          lastError = state.streamError;
          if (state.tokensPerSecond !== null) lastTps = state.tokensPerSecond;
        },
      },
    });

    expect(summary.content).toContain("Hello from sink streaming-state test");
    expect(streamingStates).toContain(true);
    expect(streamingStates[streamingStates.length - 1]).toBe(false);
    expect(lastError).toBe(null);
    expect(addedMessages.length).toBe(2);
    expect(addedMessages[0].role).toBe("user");
    expect(addedMessages[1].role).toBe("assistant");
    expect(lastTps).not.toBeUndefined();
  });

  it("substitutes tool adapter at the seam using FakeToolAdapter", async () => {
    const fakeAdapter = new FakeToolAdapter();
    const engine = new SessionStreamEngine(fakeAdapter);
    expect(fakeAdapter.hasTool("fake_test_tool")).toBe(true);
    expect(fakeAdapter.hasTool("unknown_tool")).toBe(false);
  });

  it("streams message directly through deep streamMessage interface with store updates", async () => {
    const engine = new SessionStreamEngine();
    const summary = await engine.streamMessage({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Direct deep streamMessage test",
    });

    expect(summary.content.length).toBeGreaterThan(0);
    expect(summary.content).toContain("Direct deep streamMessage test");
  });

  it("handles AbortSignal stream cancellation gracefully", async () => {
    const engine = new SessionStreamEngine();
    const controller = new AbortController();

    // Cancel immediately before starting stream loop
    controller.abort();

    const summary = await engine.streamMessage({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Cancelled stream query",
      signal: controller.signal,
    });

    expect(summary).toBeDefined();
  });

  it("streams message cleanly through explicit SessionStreamSink interface seam without global store mutation", async () => {
    const engine = new SessionStreamEngine();
    const addedMessages: ChatMessage[] = [];
    let updatedMessageContent = "";

    const customSink = {
      onMessageAdd: (msg: ChatMessage) => {
        addedMessages.push(msg);
      },
      onMessageUpdate: (updater: (prev: ChatMessage) => ChatMessage) => {
        if (addedMessages.length > 0) {
          const lastIndex = addedMessages.length - 1;
          addedMessages[lastIndex] = updater(addedMessages[lastIndex]);
          updatedMessageContent = addedMessages[lastIndex].content;
        }
      },
    };

    const summary = await engine.streamMessage({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Test streamMessage with explicit sink",
      sink: customSink,
    });

    expect(addedMessages.length).toBe(2); // User message & Assistant placeholder
    expect(addedMessages[0].role).toBe("user");
    expect(addedMessages[0].content).toContain("Test streamMessage with explicit sink");
    expect(addedMessages[1].role).toBe("assistant");
    expect(updatedMessageContent.length).toBeGreaterThan(0);
    expect(summary.content).toBe(updatedMessageContent);
  });

  it("streams via sessionStreamEngine singleton and updates Zustand store messages atomically via sink", async () => {
    useOikosStore.setState({ messages: [] });

    await sessionStreamEngine.streamMessage({
      instanceId: "test-instance",
      entityId: "agent-builder",
      entityType: "agent",
      message: "Hello from sessionStreamEngine singleton test",
      sink: {
        onMessageAdd: (msg) => useOikosStore.getState().addMessage(msg),
        onMessageUpdate: (updater) => useOikosStore.getState().updateLastMessage(updater),
        onStateChange: (state) => useOikosStore.getState().setStreamState(state),
      },
    });

    const storeState = useOikosStore.getState();
    expect(storeState.messages.length).toBe(2);
    expect(storeState.messages[0].role).toBe("user");
    expect(storeState.messages[0].content).toContain("Hello from sessionStreamEngine singleton test");

    expect(storeState.messages[1].role).toBe("assistant");
    expect(storeState.messages[1].content.length).toBeGreaterThan(0);
    expect(storeState.messages[1].content).toContain("Hello from sessionStreamEngine singleton test");
    expect(storeState.streamState.isStreaming).toBe(false);
  });

  it("cancels active run cleanly when sessionStreamEngine.cancelStream() is invoked", async () => {
    useOikosStore.setState({ messages: [] });

    const runPromise = sessionStreamEngine.streamMessage({
      instanceId: "test-instance",
      entityId: "agent-builder",
      entityType: "agent",
      message: "Test cancelStream method",
      sink: {
        onMessageAdd: (msg) => useOikosStore.getState().addMessage(msg),
        onMessageUpdate: (updater) => useOikosStore.getState().updateLastMessage(updater),
        onStateChange: (state) => useOikosStore.getState().setStreamState(state),
      },
    });

    sessionStreamEngine.cancelStream();
    await runPromise;

    const storeState = useOikosStore.getState();
    expect(storeState.streamState.isStreaming).toBe(false);
  });

  it("runs SessionStreamEngine without any store dependency — pure sink interface", async () => {
    const addedMessages: import("../src/lib/types").ChatMessage[] = [];
    let lastContent = "";

    const engine = new SessionStreamEngine();
    const summary = await engine.streamMessage({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Store-free engine test",
      // No store provided — engine must not reference global Zustand
      sink: {
        onMessageAdd: (msg) => addedMessages.push(msg),
        onMessageUpdate: (updater) => {
          if (addedMessages.length > 0) {
            const i = addedMessages.length - 1;
            addedMessages[i] = updater(addedMessages[i]);
            lastContent = addedMessages[i].content;
          }
        },
      },
    });

    expect(addedMessages.length).toBe(2);
    expect(addedMessages[0].role).toBe("user");
    expect(addedMessages[1].role).toBe("assistant");
    expect(lastContent.length).toBeGreaterThan(0);
    expect(summary.content.length).toBeGreaterThan(0);
  });
});
