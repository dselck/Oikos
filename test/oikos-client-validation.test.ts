import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startSimulator } from "../simulator/server";
import { createAgentOSClient } from "../src/lib/agentos-client";
import { SessionStreamEngine } from "../src/lib/session-engine";
import { ToolCallExecution } from "../src/lib/types";

describe("Oikos Client Integration against AgentOS Simulator", () => {
  let simulator: Awaited<ReturnType<typeof startSimulator>>;
  const nativeFetch = globalThis.fetch;

  beforeAll(async () => {
    simulator = await startSimulator({ port: 8995, quiet: true });

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

  it("fetches agents from simulator", async () => {
    const client = createAgentOSClient("test-instance");
    const agents = await client.agents.list();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toHaveProperty("id");
    expect(agents[0]).toHaveProperty("name");
  });

  it("creates a new agent on simulator", async () => {
    const client = createAgentOSClient("test-instance");
    const created = await client.agents.create({
      name: "Oikos Integration Agent",
      description: "Testing AgentOS proxy",
      model: "gpt-4o",
    });

    expect(created).toHaveProperty("name", "Oikos Integration Agent");
    expect(created).toHaveProperty("model", "gpt-4o");
  });

  it("streams agent run events with text chunks and tool execution callbacks", async () => {
    const receivedChunks: string[] = [];
    const receivedToolCalls: ToolCallExecution[] = [];
    const receivedRawEvents: Record<string, unknown>[] = [];

    const engine = new SessionStreamEngine();
    const generator = engine.streamRun({
      instanceId: "test-instance",
      entityType: "agent",
      entityId: "agent-builder",
      message: "Build a web scraper agent",
    });

    for await (const event of generator) {
      if (event.type === "content_delta") {
        receivedChunks.push(event.content);
      } else if (event.type === "raw_event") {
        receivedRawEvents.push(event.event);
      } else if (
        event.type === "tool_execution_start" ||
        event.type === "tool_execution_update" ||
        event.type === "tool_execution_end"
      ) {
        receivedToolCalls.push(event.toolExecution);
      }
    }

    expect(receivedChunks.length).toBeGreaterThan(0);
    expect(receivedChunks.join("")).toContain("Simulated response for: \"Build a web scraper agent\"");
    expect(receivedToolCalls.length).toBeGreaterThan(0);
    expect(receivedRawEvents.length).toBeGreaterThan(0);
  });
});
