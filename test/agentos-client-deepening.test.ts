import { describe, it, expect } from "vitest";
import { createAgentOSClient, HttpAgentOSClient, MockAgentOSClient } from "../src/lib/agentos-client";
import { SessionStreamEngine } from "../src/lib/session-engine";

describe("AgentOSClient Deep Module Interface", () => {
  it("instantiates HttpAgentOSClient with instance-scoped parameters", () => {
    const client = createAgentOSClient("test-inst-123");
    expect(client).toBeInstanceOf(HttpAgentOSClient);
    expect(client.agents).toBeDefined();
    expect(client.teams).toBeDefined();
    expect(client.workflows).toBeDefined();
    expect(client.knowledgeBases).toBeDefined();
    expect(client.sessions).toBeDefined();
    expect(client.health).toBeDefined();
    expect(client.runs).toBeDefined();
  });

  it("operates in-memory cleanly via MockAgentOSClient without network dependencies", async () => {
    const mockClient = new MockAgentOSClient();

    // Create Agent
    const agent = await mockClient.agents.create({
      name: "Mocked Analyst",
      description: "In-memory test agent",
      modelProvider: "openai",
      modelName: "gpt-4o",
    });

    expect(agent.name).toBe("Mocked Analyst");

    // List Agents
    const agents = await mockClient.agents.list();
    expect(agents.length).toBe(1);
    expect(agents[0].id).toBe(agent.id);

    // Delete Agent
    const deleted = await mockClient.agents.delete(agent.id);
    expect(deleted).toBe(true);
    const afterDelete = await mockClient.agents.list();
    expect(afterDelete.length).toBe(0);

    // Health check
    const health = await mockClient.health.check();
    expect(health).toBe("connected");
  });

  it("injects MockAgentOSClient seamlessly into SessionStreamEngine", async () => {
    const mockClient = new MockAgentOSClient();
    const engine = new SessionStreamEngine(undefined, mockClient);

    const events: string[] = [];
    for await (const event of engine.streamRun({
      instanceId: "mock-instance",
      entityId: "test-agent",
      message: "Hello world via MockAgentOSClient",
    })) {
      if (event.type === "content_delta") {
        events.push(event.content);
      }
    }

    expect(events.join("")).toContain("Mock response for: Hello world via MockAgentOSClient");
  });

  it("normalizes raw HTTP session payloads, user context, memory summary, and computes telemetry", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          session_id: "raw-sess-100",
          agent_id: "financial-analyst",
          title: "Quarterly Analysis",
          memory_summary: "User requested Q3 financial analysis and revenue forecasting.",
          user_context: { preferredCurrency: "USD", role: "CFO" },
          messages: [
            {
              id: "m-1",
              role: "user",
              content: "What was Q3 revenue?",
              timestamp: "2026-07-27T10:00:00Z",
            },
            {
              id: "m-2",
              role: "assistant",
              content: "Let me check the database.",
              timestamp: "2026-07-27T10:00:02Z",
              tool_calls: [
                {
                  id: "t-1",
                  toolName: "fetch_sql",
                  status: "success",
                  startTime: Date.now(),
                },
              ],
            },
          ],
        }),
        { status: 200 }
      );

    const client = new HttpAgentOSClient({ fetchImpl: mockFetch as unknown as typeof fetch });
    const details = await client.sessions.get("raw-sess-100");

    expect(details.id).toBe("raw-sess-100");
    expect(details.agentId).toBe("financial-analyst");
    expect(details.title).toBe("Quarterly Analysis");
    expect(details.memorySummary).toBe("User requested Q3 financial analysis and revenue forecasting.");
    expect(details.userContext).toEqual({ preferredCurrency: "USD", role: "CFO" });
    expect(details.messages.length).toBe(2);
    expect(details.messages[1].toolExecutions?.length).toBe(1);

    expect(details.telemetry).toBeDefined();
    expect(details.telemetry?.totalMessages).toBe(2);
    expect(details.telemetry?.totalToolCalls).toBe(1);
    expect(details.telemetry?.estimatedPromptTokens).toBeGreaterThan(0);
    expect(details.telemetry?.estimatedCompletionTokens).toBeGreaterThan(0);
  });

  it("infers reader strategy automatically when readerType is omitted in indexContent", async () => {
    const mockClient = new MockAgentOSClient();

    // 1. URL Source -> WebsiteReader
    const urlRes = await mockClient.knowledgeBases.indexContent({
      kbId: "kb-1",
      sourceType: "url",
      title: "Agno Documentation",
      url: "https://docs.agno.com",
    });
    expect(urlRes.message).toContain("WebsiteReader");

    // 2. Markdown Source -> MarkdownReader
    const mdRes = await mockClient.knowledgeBases.indexContent({
      kbId: "kb-1",
      sourceType: "markdown",
      title: "Architecture Guide",
      content: "# Agno Architecture\n\nDeep modules documentation.",
    });
    expect(mdRes.message).toContain("MarkdownReader");

    // 3. PDF File Title -> PDFReader
    const pdfRes = await mockClient.knowledgeBases.indexContent({
      kbId: "kb-1",
      sourceType: "text",
      title: "annual_report_2026.pdf",
      content: "Financial figures...",
    });
    expect(pdfRes.message).toContain("PDFReader");
  });
});
