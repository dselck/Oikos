import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentOSRegistryEngine } from "../src/lib/agentos-registry";
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

  it("hydrates all entities into store cache via refresh()", async () => {
    const mockClient = {
      agents: { list: vi.fn().mockResolvedValue([{ id: "agent-1", name: "Agent 1" }]) },
      teams: { list: vi.fn().mockResolvedValue([{ id: "team-1", name: "Team 1" }]) },
      workflows: { list: vi.fn().mockResolvedValue([{ id: "wf-1", name: "Workflow 1" }]) },
      knowledgeBases: { list: vi.fn().mockResolvedValue([{ id: "kb-1", name: "KB 1" }]) },
      sessions: { list: vi.fn().mockResolvedValue([{ id: "sess-1", title: "Session 1" }]) },
    } as unknown as IAgentOSClient;

    const registryEngine = new AgentOSRegistryEngine({ client: mockClient });
    await registryEngine.refresh();

    const store = useOikosStore.getState();
    expect(store.agents).toHaveLength(1);
    expect(store.agents[0].id).toBe("agent-1");
    expect(store.teams[0].id).toBe("team-1");
    expect(store.workflows[0].id).toBe("wf-1");
    expect(store.knowledgeBases[0].id).toBe("kb-1");
    expect(store.sessions[0].id).toBe("sess-1");
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
});
