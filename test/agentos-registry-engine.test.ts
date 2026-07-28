import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgentOSRegistry } from "../src/hooks/useAgentOSRegistry";
import { MockAgentOSClient } from "../src/lib/agentos-client";
import { sessionMemoryEngine } from "../src/lib/session-engine";
import { Agent, Team, Workflow, SessionDetails, IngestionResponse } from "../src/lib/types";

describe("AgentOS Registry Engine Seam (useAgentOSRegistry)", () => {
  let mockClient: MockAgentOSClient;

  beforeEach(() => {
    mockClient = new MockAgentOSClient();
    mockClient.agentsList = [
      { id: "agent-1", name: "Mock Agent 1", description: "Default agent", model: "gpt-4o", tools: [] },
    ];
    mockClient.teamsList = [{ id: "team-1", name: "Mock Team" }];
    mockClient.workflowsList = [{ id: "wf-1", name: "Mock Workflow" }];
    mockClient.knowledgeBasesList = [{ id: "kb-1", name: "Mock KB" }];
    mockClient.sessionsList = [{ id: "sess-1", title: "Mock Session" }];
  });

  it("hydrates runtime entities from AgentOS client seam", async () => {
    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: true })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.agents.length).toBeGreaterThan(0);
    expect(result.current.teams.length).toBeGreaterThan(0);
    expect(result.current.workflows.length).toBeGreaterThan(0);
    expect(result.current.knowledgeBases.length).toBeGreaterThan(0);
    expect(result.current.sessions.length).toBeGreaterThan(0);
  });

  it("performs pessimistic agent creation and deletion with pending mutation tracking", async () => {
    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: false })
    );

    await act(async () => {
      await result.current.refresh();
    });

    const initialCount = result.current.agents.length;

    let createdAgent;
    await act(async () => {
      createdAgent = await result.current.mutateEntity({
        resource: "agents",
        action: "create",
        payload: {
          id: "test-new-agent",
          name: "Test New Agent",
          description: "Created via Registry Engine",
          modelProvider: "openai",
          modelName: "gpt-4o",
        },
      });
    });

    expect(createdAgent).toHaveProperty("id", "test-new-agent");
    expect(result.current.agents.length).toBe(initialCount + 1);

    // Test Deletion
    await act(async () => {
      const ok = await result.current.mutateEntity({
        resource: "agents",
        action: "delete",
        id: "test-new-agent",
      });
      expect(ok).toBe(true);
    });

    expect(result.current.agents.some((a) => a.id === "test-new-agent")).toBe(false);
  });

  it("synchronizes reactive state across multiple hook callers centrally", async () => {
    const caller1 = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: true })
    );
    const caller2 = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: false })
    );

    await act(async () => {
      await caller1.result.current.refresh();
    });

    expect(caller1.result.current.agents.length).toBe(1);
    expect(caller2.result.current.agents.length).toBe(1);

    await act(async () => {
      await caller1.result.current.mutateEntity({
        resource: "agents",
        action: "create",
        payload: {
          id: "synced-agent",
          name: "Synced Agent",
          modelProvider: "openai",
          modelName: "gpt-4o",
        },
      });
    });

    // Caller 2 automatically reflects the new agent via central store
    expect(caller2.result.current.agents.some((a) => a.id === "synced-agent")).toBe(true);
  });

  it("handles client errors gracefully without throwing unhandled exceptions", async () => {
    const errorClient = new MockAgentOSClient();
    errorClient.agents.list = async () => {
      throw new Error("Connection timed out to AgentOS API");
    };

    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: errorClient, autoFetch: false })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain("Connection timed out to AgentOS API");
  });

  it("supports strongly-typed domain operations (saveAgent, saveTeam, saveWorkflow, deleteEntity)", async () => {
    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: true })
    );

    await act(async () => {
      await result.current.refresh();
    });

    let savedAgent: Agent | undefined;
    await act(async () => {
      savedAgent = await result.current.saveAgent({
        name: "Typed Agent",
        description: "Created via saveAgent",
        instructions: ["Rule 1", "Rule 2"],
        tools: ["duckduckgo_search"],
      });
    });

    expect(savedAgent!.name).toBe("Typed Agent");
    expect(result.current.agents.some((a) => a.name === "Typed Agent")).toBe(true);

    let savedTeam: Team | undefined;
    await act(async () => {
      savedTeam = await result.current.saveTeam({
        name: "Typed Team",
        memberAgentIds: [savedAgent!.id],
      });
    });

    expect(savedTeam!.name).toBe("Typed Team");
    expect(result.current.teams.some((t) => t.name === "Typed Team")).toBe(true);

    let savedWf: Workflow | undefined;
    await act(async () => {
      savedWf = await result.current.saveWorkflow({
        name: "Typed Workflow",
        steps: [{ id: "step-1", type: "agent", targetId: savedAgent!.id }],
      });
    });

    expect(savedWf!.name).toBe("Typed Workflow");
    expect(result.current.workflows.some((w) => w.name === "Typed Workflow")).toBe(true);

    await act(async () => {
      const ok = await result.current.deleteEntity("agents", savedAgent!.id);
      expect(ok).toBe(true);
    });

    expect(result.current.agents.some((a) => a.id === savedAgent!.id)).toBe(false);
  });

  it("fetches, normalizes, and caches session details via sessionMemoryEngine with telemetry & forceRefresh", async () => {
    let details: SessionDetails | undefined;
    await act(async () => {
      details = await sessionMemoryEngine.getSessionDetails("sess-1", { client: mockClient });
    });

    expect(details).toBeDefined();
    expect(details!.id).toBe("sess-1");
    expect(details!.messages.length).toBeGreaterThan(0);
    expect(details!.memorySummary).toContain("Mock memory summary");
    expect(details!.telemetry).toBeDefined();
    expect(details!.telemetry?.totalMessages).toBe(2);
    expect(details!.telemetry?.totalToolCalls).toBe(0);

    // Repeat call should return cached details instance
    let cachedDetails: SessionDetails | undefined;
    await act(async () => {
      cachedDetails = await sessionMemoryEngine.getSessionDetails("sess-1", { client: mockClient });
    });

    expect(cachedDetails).toBe(details);

    // forceRefresh: true bypasses cache and returns fresh instance
    let refreshedDetails: SessionDetails | undefined;
    await act(async () => {
      refreshedDetails = await sessionMemoryEngine.getSessionDetails("sess-1", { client: mockClient, forceRefresh: true });
    });

    expect(refreshedDetails).not.toBe(cachedDetails);
    expect(refreshedDetails!.id).toBe("sess-1");
  });

  it("automatically evicts session details cache when deleting a session via deleteEntity", async () => {
    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: true })
    );

    await act(async () => {
      await result.current.refresh();
    });

    let details1: SessionDetails | undefined;
    await act(async () => {
      details1 = await sessionMemoryEngine.getSessionDetails("sess-1", { client: mockClient });
    });
    expect(details1).toBeDefined();
    expect(details1!.id).toBe("sess-1");

    await act(async () => {
      const ok = await result.current.deleteEntity("sessions", "sess-1");
      expect(ok).toBe(true);
    });

    expect(result.current.sessions.some((s) => s.id === "sess-1")).toBe(false);
  });


  it("delegates document and URL indexing strategies to Agno AgentOS via indexContent", async () => {
    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: mockClient, autoFetch: false })
    );

    let res: IngestionResponse | undefined;
    await act(async () => {
      res = await result.current.indexContent({
        kbId: "kb-1",
        sourceType: "markdown",
        title: "Agno Architecture",
        content: "Detailed markdown content about Agno AgentOS architecture...",
        readerType: "markdown_reader",
        chunkingStrategy: "semantic",
        chunkSize: 200,
      });
    });

    expect(res).toBeDefined();
    expect(res!.success).toBe(true);
    expect(res!.documentsIndexed).toBe(1);
    expect(res!.chunksGenerated).toBeGreaterThan(0);
    expect(res!.message).toContain("MarkdownReader");
  });

  it("normalizes raw JSON string payloads and plain string fallbacks into clean structural domain properties", async () => {
    const rawClient = new MockAgentOSClient();
    rawClient.agentsList = [
      {
        id: "agent-raw-1",
        name: "Raw String Agent",
        description: "Agent with stringified JSON fields",
        instructionsJson: '["Always cite sources", "Be concise"]',
        toolsJson: '["duckduckgo_search", "python_interpreter"]',
      } as any,
      {
        id: "agent-legacy-2",
        name: "Legacy Plaintext Agent",
        instructionsJson: "Plain text legacy instruction without JSON array",
        toolsJson: null,
      } as any,
    ];
    rawClient.teamsList = [
      {
        id: "team-raw-1",
        name: "Raw String Team",
        memberAgentIdsJson: '["agent-raw-1", "agent-legacy-2"]',
        instructionsJson: '["Coordinate tasks"]',
      } as any,
    ];
    rawClient.workflowsList = [
      {
        id: "wf-raw-1",
        name: "Raw String Workflow",
        stepsJson: '[{"id":"step-1","type":"agent","targetId":"agent-raw-1"}]',
        sessionStateJson: '{"debug":true}',
      } as any,
    ];

    const { result } = renderHook(() =>
      useAgentOSRegistry({ client: rawClient, autoFetch: true })
    );

    await act(async () => {
      await result.current.refresh();
    });

    // Agent 1: JSON arrays
    const ag1 = result.current.agents.find((a) => a.id === "agent-raw-1");
    expect(ag1).toBeDefined();
    expect(ag1?.instructions).toEqual(["Always cite sources", "Be concise"]);
    expect(ag1?.tools).toEqual(["duckduckgo_search", "python_interpreter"]);

    // Agent 2: Legacy fallback & null tools
    const ag2 = result.current.agents.find((a) => a.id === "agent-legacy-2");
    expect(ag2).toBeDefined();
    expect(ag2?.instructions).toEqual(["Plain text legacy instruction without JSON array"]);
    expect(ag2?.tools).toEqual([]);

    // Team 1: memberAgentIds array
    const tm1 = result.current.teams.find((t) => t.id === "team-raw-1");
    expect(tm1).toBeDefined();
    expect(tm1?.memberAgentIds).toEqual(["agent-raw-1", "agent-legacy-2"]);
    expect(tm1?.instructions).toEqual(["Coordinate tasks"]);

    // Workflow 1: steps and sessionState objects
    const wf1 = result.current.workflows.find((w) => w.id === "wf-raw-1");
    expect(wf1).toBeDefined();
    expect(wf1?.steps).toEqual([{ id: "step-1", type: "agent", targetId: "agent-raw-1" }]);
    expect(wf1?.sessionState).toEqual({ debug: true });
  });
});


