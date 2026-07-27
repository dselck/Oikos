"use client";

import { useEffect, useCallback, useRef } from "react";
import { useOikosStore } from "@/lib/store";
import { createAgentOSClient, IAgentOSClient } from "@/lib/agentos-client";
import { Agent, Team, Workflow, KnowledgeBase, Session, IndexContentParams, IngestionResponse } from "@/lib/types";

export type EntityType = "agents" | "teams" | "workflows" | "knowledgeBases" | "sessions";

export interface AgentOSRegistryOptions {
  client?: IAgentOSClient;
  autoFetch?: boolean;
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

export interface UseAgentOSRegistryReturn {
  agents: Agent[];
  teams: Team[];
  workflows: Workflow[];
  knowledgeBases: KnowledgeBase[];
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  pendingMutations: string[];
  isMutating: (id: string) => boolean;
  refresh: () => Promise<void>;
  saveAgent: (input: SaveAgentInput) => Promise<Agent>;
  saveTeam: (input: SaveTeamInput) => Promise<Team>;
  saveWorkflow: (input: SaveWorkflowInput) => Promise<Workflow>;
  deleteEntity: (resource: EntityType, id: string) => Promise<boolean>;
  mutateEntity: <T = Record<string, unknown>>(params: MutateEntityParams<T>) => Promise<T | boolean>;
  indexContent: (params: IndexContentParams) => Promise<IngestionResponse>;
}

/**
 * Deep AgentOS Registry Engine Hook
 *
 * Encapsulates centralized reactive entity hydration directly into useOikosStore,
 * network-first entity mutations via unified `mutateEntity` seam,
 * targeted resource cache revalidation, and error recovery.
 */
export function useAgentOSRegistry(options: AgentOSRegistryOptions = {}): UseAgentOSRegistryReturn {
  const store = useOikosStore();
  const { activeInstance } = store;
  const targetInstanceId = options.instanceId ?? activeInstance?.id ?? "default";

  const clientRef = useRef<IAgentOSClient | null>(options.client || null);

  if (options.client) {
    clientRef.current = options.client;
  }

  const getClient = useCallback((): IAgentOSClient => {
    if (clientRef.current) return clientRef.current;
    return createAgentOSClient(targetInstanceId);
  }, [targetInstanceId]);

  // Targeted Resource Revalidation
  const revalidateResource = useCallback(
    async (resource: EntityType) => {
      const client = getClient();
      const currentStore = useOikosStore.getState();
      switch (resource) {
        case "agents": {
          const list = await client.agents.list();
          currentStore.setAgents(list);
          break;
        }
        case "teams": {
          const list = await client.teams.list();
          currentStore.setTeams(list);
          break;
        }
        case "workflows": {
          const list = await client.workflows.list();
          currentStore.setWorkflows(list);
          break;
        }
        case "knowledgeBases": {
          const list = await client.knowledgeBases.list();
          currentStore.setKnowledgeBases(list);
          break;
        }
        case "sessions": {
          const list = await client.sessions.list();
          currentStore.setSessions(list);
          break;
        }
      }
    },
    [getClient]
  );

  // Full Refresh / Hydrate from AgentOS into useOikosStore
  const refresh = useCallback(async () => {
    const currentStore = useOikosStore.getState();
    currentStore.setRegistryLoading(true);
    currentStore.setRegistryError(null);

    try {
      const client = getClient();
      const [agentsData, teamsData, workflowsData, kbData, sessionsData] = await Promise.all([
        client.agents.list(),
        client.teams.list(),
        client.workflows.list(),
        client.knowledgeBases.list(),
        client.sessions.list(),
      ]);

      currentStore.setHydratedEntities({
        agents: agentsData,
        teams: teamsData,
        workflows: workflowsData,
        knowledgeBases: kbData,
        sessions: sessionsData,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      currentStore.setRegistryError(`Failed to load AgentOS Registry: ${errMsg}`);
    }
  }, [getClient]);

  // Auto-fetch on mount / instance change
  useEffect(() => {
    if (options.autoFetch !== false) {
      refresh();
    }
  }, [refresh, options.autoFetch, targetInstanceId]);

  // Unified Deep Mutation Seam
  const mutateEntity = async <T = Record<string, unknown>>(
    params: MutateEntityParams<T>
  ): Promise<T | boolean> => {
    const { resource, action, id, payload } = params;
    const mutId = id || (payload && (payload as Record<string, unknown>).id as string) || `${resource}-${Date.now()}`;
    const currentStore = useOikosStore.getState();

    currentStore.addPendingMutation(mutId);
    currentStore.setRegistryError(null);

    try {
      const client = getClient();

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
              currentStore.evictSessionDetailsCache(`${targetInstanceId}:${id}`);
            }
            break;
        }
        if (ok) {
          await revalidateResource(resource);
        }
        return ok;
      }

      // Action: create or update
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

      await revalidateResource(resource);
      return result as T;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      currentStore.setRegistryError(`Failed to ${action} ${resource}: ${errMsg}`);
      throw err;
    } finally {
      currentStore.removePendingMutation(mutId);
    }
  };

  const saveAgent = async (input: SaveAgentInput): Promise<Agent> => {
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
    return mutateEntity<Agent>({ resource: "agents", action: "create", id, payload }) as Promise<Agent>;
  };

  const saveTeam = async (input: SaveTeamInput): Promise<Team> => {
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
    return mutateEntity<Team>({ resource: "teams", action: "create", id, payload }) as Promise<Team>;
  };

  const saveWorkflow = async (input: SaveWorkflowInput): Promise<Workflow> => {
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
    return mutateEntity<Workflow>({ resource: "workflows", action: "create", id, payload }) as Promise<Workflow>;
  };

  const deleteEntity = async (resource: EntityType, id: string): Promise<boolean> => {
    return mutateEntity({ resource, action: "delete", id }) as Promise<boolean>;
  };

  const pendingMutationsArray = Array.from(store.pendingMutations);
  const isMutating = (id: string) => store.pendingMutations.has(id);

  const indexContent = useCallback(
    async (params: IndexContentParams): Promise<IngestionResponse> => {
      const client = getClient();
      const result = await client.knowledgeBases.indexContent(params);
      await revalidateResource("knowledgeBases");
      return result;
    },
    [getClient, revalidateResource]
  );

  return {
    agents: store.agents,
    teams: store.teams,
    workflows: store.workflows,
    knowledgeBases: store.knowledgeBases,
    sessions: store.sessions,
    isLoading: store.isRegistryLoading,
    error: store.registryError,
    pendingMutations: pendingMutationsArray,
    isMutating,
    refresh,
    saveAgent,
    saveTeam,
    saveWorkflow,
    deleteEntity,
    mutateEntity,
    indexContent,
  };
}
