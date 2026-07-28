import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentOSRegistryEngine, MemoryRegistrySink } from "../src/lib/agentos-registry";
import { IAgentOSClient } from "../src/lib/agentos-client";
import { useOikosStore } from "../src/lib/store";

describe("AgentOSRegistryEngine Headless Seam", () => {
  beforeEach(() => {
    const store = useOikosStore.getState();
    store.setHydratedEntities({
      agents: [],
      teams: [],
      workflows: [],
      knowledgeBases: [],
      sessions: [],
    });
  });

  it("hydrates all entities into state sink via refresh()", async () => {
    const mockClient = {
      agents: { list: vi.fn().mockResolvedValue([{ id: "agent-1", name: "Agent 1" }]) },
      teams: { list: vi.fn().mockResolvedValue([{ id: "team-1", name: "Team 1" }]) },
      workflows: { list: vi.fn().mockResolvedValue([{ id: "wf-1", name: "Workflow 1" }]) },
      knowledgeBases: { list: vi.fn().mockResolvedValue([{ id: "kb-1", name: "KB 1" }]) },
      sessions: { list: vi.fn().mockResolvedValue([{ id: "sess-1", title: "Session 1" }]) },
    } as unknown as IAgentOSClient;

    const memorySink = new MemoryRegistrySink();
    const registryEngine = new AgentOSRegistryEngine({ client: mockClient, sink: memorySink });
    await registryEngine.refresh();

    expect(memorySink.agents).toHaveLength(1);
    expect(memorySink.agents[0].id).toBe("agent-1");
    expect(memorySink.teams[0].id).toBe("team-1");
    expect(memorySink.workflows[0].id).toBe("wf-1");
    expect(memorySink.knowledgeBases[0].id).toBe("kb-1");
    expect(memorySink.sessions[0].id).toBe("sess-1");
  });

  it("operates headlessly with MemoryRegistrySink without touching Zustand store", async () => {
    const mockClient = {
      agents: { list: vi.fn().mockResolvedValue([{ id: "agent-99", name: "Headless Agent" }]) },
      teams: { list: vi.fn().mockResolvedValue([]) },
      workflows: { list: vi.fn().mockResolvedValue([]) },
      knowledgeBases: { list: vi.fn().mockResolvedValue([]) },
      sessions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as IAgentOSClient;

    const memorySink = new MemoryRegistrySink();
    const engine = new AgentOSRegistryEngine({ client: mockClient, sink: memorySink });
    await engine.refresh();

    expect(memorySink.agents).toHaveLength(1);
    expect(memorySink.agents[0].id).toBe("agent-99");

    // Verify Zustand store was untouched
    const store = useOikosStore.getState();
    expect(store.agents).toHaveLength(0);
  });

  it("normalizes and serializes saveAgent input", async () => {
    const mockCreateAgent = vi.fn().mockResolvedValue({ id: "agent-100", name: "Coder Agent" });
    const mockClient = {
      agents: {
        create: mockCreateAgent,
        list: vi.fn().mockResolvedValue([{ id: "agent-100", name: "Coder Agent" }]),
      },
    } as unknown as IAgentOSClient;

    const registryEngine = new AgentOSRegistryEngine({ client: mockClient });
    await registryEngine.saveAgent({
      name: "Coder Agent",
      instructions: ["Write clean code", "Add unit tests"],
      tools: ["github_tool", "python_interpreter"],
    });

    expect(mockCreateAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Coder Agent",
        instructionsJson: JSON.stringify(["Write clean code", "Add unit tests"]),
        toolsJson: JSON.stringify(["github_tool", "python_interpreter"]),
      })
    );
  });

  it("creates knowledge base via saveKnowledgeBase seam", async () => {
    const mockCreateKb = vi.fn().mockResolvedValue({ id: "kb-100", name: "Doc Index" });
    const mockClient = {
      knowledgeBases: {
        create: mockCreateKb,
        list: vi.fn().mockResolvedValue([{ id: "kb-100", name: "Doc Index" }]),
      },
    } as unknown as IAgentOSClient;

    const memorySink = new MemoryRegistrySink();
    const engine = new AgentOSRegistryEngine({ client: mockClient, sink: memorySink });
    await engine.saveKnowledgeBase({
      name: "Doc Index",
      vectorDbType: "sqlite_vec",
      tableOrCollection: "documents_vec",
    });

    expect(mockCreateKb).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Doc Index",
        vectorDbType: "sqlite_vec",
        tableOrCollection: "documents_vec",
      })
    );
    expect(memorySink.knowledgeBases).toHaveLength(1);
  });
});

