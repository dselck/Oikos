import { createAgentOSClient, IAgentOSClient } from "./agentos-client";
import { useOikosStore } from "./store";
import { RagIndexingEngine, IndexDocumentInput, IndexUrlInput } from "./rag-engine";
import {
  Agent,
  Team,
  Workflow,
  KnowledgeBase,
  Session,
  IndexContentParams,
  IngestionResponse,
} from "./types";

export type EntityType = "agents" | "teams" | "workflows" | "knowledgeBases" | "sessions";

export interface AgentOSRegistryOptions {
  client?: IAgentOSClient;
  instanceId?: string;
}

export interface MutateEntityParams<T = Record<string, unknown>> {
  resource: EntityType;
  action: "create" | "update" | "delete";
  id?: string;
  payload?: Partial<T>;
}

export interface SaveAgentInput {
  id?: string;
  name: string;
  description?: string;
  modelProvider?: string;
  modelName?: string;
  systemPrompt?: string;
  instructions?: string[];
  tools?: string[];
}

export interface SaveTeamInput {
  id?: string;
  name: string;
  description?: string | null;
  leaderAgentId?: string;
  memberAgentIds?: string[];
  executionMode?: string;
  instructions?: string[];
  sharedMemory?: boolean;
}

export interface SaveWorkflowInput {
  id?: string;
  name: string;
  description?: string | null;
  steps?: Array<Record<string, unknown>>;
  sessionState?: Record<string, unknown>;
}

/**
 * Pure Deep AgentOS Registry Engine Class
 *
 * Encapsulates entity normalization, mutation optimism, store cache revalidation,
 * payload serialization, and headless CRUD operations across runtime AgentOS entities.
 */
export class AgentOSRegistryEngine {
  private client?: IAgentOSClient;
  private instanceId: string;
  private ragEngine: RagIndexingEngine;

  constructor(options: AgentOSRegistryOptions = {}) {
    this.client = options.client;
    this.instanceId = options.instanceId || "default";
    this.ragEngine = new RagIndexingEngine(this.client);
  }

  public getClient(): IAgentOSClient {
    if (this.client) return this.client;
    const store = useOikosStore.getState();
    const activeId = store.activeInstance?.id || this.instanceId;
    return createAgentOSClient(activeId);
  }

  /**
   * Hydrates all AgentOS entities into the Zustand store cache.
   */
  public async refresh(): Promise<void> {
    const store = useOikosStore.getState();
    store.setRegistryLoading(true);
    store.setRegistryError(null);

    try {
      const client = this.getClient();
      const [agentsData, teamsData, workflowsData, kbData, sessionsData] = await Promise.all([
        client.agents.list(),
        client.teams.list(),
        client.workflows.list(),
        client.knowledgeBases.list(),
        client.sessions.list(),
      ]);

      store.setHydratedEntities({
        agents: agentsData,
        teams: teamsData,
        workflows: workflowsData,
        knowledgeBases: kbData,
        sessions: sessionsData,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      store.setRegistryError(`Failed to load AgentOS Registry: ${errMsg}`);
    }
  }

  /**
   * Revalidates a single resource in the store cache.
   */
  public async revalidateResource(resource: EntityType): Promise<void> {
    const client = this.getClient();
    const store = useOikosStore.getState();

    switch (resource) {
      case "agents": {
        const list = await client.agents.list();
        store.setAgents(list);
        break;
      }
      case "teams": {
        const list = await client.teams.list();
        store.setTeams(list);
        break;
      }
      case "workflows": {
        const list = await client.workflows.list();
        store.setWorkflows(list);
        break;
      }
      case "knowledgeBases": {
        const list = await client.knowledgeBases.list();
        store.setKnowledgeBases(list);
        break;
      }
      case "sessions": {
        const list = await client.sessions.list();
        store.setSessions(list);
        break;
      }
    }
  }

  /**
   * Unified mutation execution seam.
   */
  public async mutateEntity<T = Record<string, unknown>>(
    params: MutateEntityParams<T>
  ): Promise<T | boolean> {
    const { resource, action, id, payload } = params;
    const mutId = id || (payload && (payload as Record<string, unknown>).id as string) || `${resource}-${Date.now()}`;
    const store = useOikosStore.getState();

    store.addPendingMutation(mutId);
    store.setRegistryError(null);

    try {
      const client = this.getClient();

      if (action === "delete") {
        if (!id) throw new Error(`Missing entity ID for delete action on ${resource}`);
        let ok = false;
        switch (resource) {
          case "agents":
            ok = await client.agents.delete(id);
            break;
          case "teams":
            ok = await client.teams.delete(id);
            break;
          case "workflows":
            ok = await client.workflows.delete(id);
            break;
          case "knowledgeBases":
            ok = await client.knowledgeBases.delete(id);
            break;
          case "sessions":
            ok = await client.sessions.delete(id);
            if (ok) {
              const activeId = store.activeInstance?.id || this.instanceId;
              store.evictSessionDetailsCache(`${activeId}:${id}`);
            }
            break;
        }
        if (ok) {
          await this.revalidateResource(resource);
        }
        return ok;
      }

      // Create or Update Action
      if (!payload) throw new Error(`Missing payload for ${action} action on ${resource}`);
      let result: unknown;
      switch (resource) {
        case "agents":
          result = await client.agents.create(payload as Record<string, unknown>);
          break;
        case "teams":
          result = await client.teams.create(payload as Record<string, unknown>);
          break;
        case "workflows":
          result = await client.workflows.create(payload as Record<string, unknown>);
          break;
        case "knowledgeBases":
          result = await client.knowledgeBases.create(payload as Record<string, unknown>);
          break;
        case "sessions":
          throw new Error("Sessions are created via SessionStreamEngine, not direct registry mutation.");
      }

      await this.revalidateResource(resource);
      return result as T;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      store.setRegistryError(`Failed to ${action} ${resource}: ${errMsg}`);
      throw err;
    } finally {
      store.removePendingMutation(mutId);
    }
  }

  public async saveAgent(input: SaveAgentInput): Promise<Agent> {
    const id = input.id || `agent-${Date.now()}`;
    const payload = {
      id,
      name: input.name,
      description: input.description || "",
      modelProvider: input.modelProvider || "openai",
      modelName: input.modelName || "gpt-4o",
      systemPrompt: input.systemPrompt || "",
      instructions: input.instructions || [],
      tools: input.tools || [],
      instructionsJson: JSON.stringify(input.instructions || []),
      toolsJson: JSON.stringify(input.tools || []),
    };
    return this.mutateEntity<Agent>({ resource: "agents", action: "create", id, payload }) as Promise<Agent>;
  }

  public async saveTeam(input: SaveTeamInput): Promise<Team> {
    const id = input.id || `team-${Date.now()}`;
    const payload = {
      id,
      name: input.name,
      description: input.description || "",
      leaderAgentId: input.leaderAgentId,
      memberAgentIds: input.memberAgentIds || [],
      executionMode: input.executionMode || "sequential",
      instructions: input.instructions || [],
      sharedMemory: input.sharedMemory ?? true,
      memberAgentIdsJson: JSON.stringify(input.memberAgentIds || []),
      instructionsJson: JSON.stringify(input.instructions || []),
    };
    return this.mutateEntity<Team>({ resource: "teams", action: "create", id, payload }) as Promise<Team>;
  }

  public async saveWorkflow(input: SaveWorkflowInput): Promise<Workflow> {
    const id = input.id || `wf-${Date.now()}`;
    const payload = {
      id,
      name: input.name,
      description: input.description || "",
      steps: input.steps || [],
      sessionState: input.sessionState || {},
      stepsJson: JSON.stringify(input.steps || []),
      sessionStateJson: JSON.stringify(input.sessionState || {}),
    };
    return this.mutateEntity<Workflow>({ resource: "workflows", action: "create", id, payload }) as Promise<Workflow>;
  }

  public async deleteEntity(resource: EntityType, id: string): Promise<boolean> {
    return this.mutateEntity({ resource, action: "delete", id }) as Promise<boolean>;
  }

  public async indexDocument(input: IndexDocumentInput): Promise<IngestionResponse> {
    const result = await this.ragEngine.indexDocument(input);
    await this.revalidateResource("knowledgeBases");
    return result;
  }

  public async indexUrl(input: IndexUrlInput): Promise<IngestionResponse> {
    const result = await this.ragEngine.indexUrl(input);
    await this.revalidateResource("knowledgeBases");
    return result;
  }

  public async indexContent(params: IndexContentParams): Promise<IngestionResponse> {
    const client = this.getClient();
    const result = await client.knowledgeBases.indexContent(params);
    await this.revalidateResource("knowledgeBases");
    return result;
  }
}

export const agentosRegistryEngine = new AgentOSRegistryEngine();

export function createAgentOSRegistryEngine(options?: AgentOSRegistryOptions): AgentOSRegistryEngine {
  return new AgentOSRegistryEngine(options);
}
