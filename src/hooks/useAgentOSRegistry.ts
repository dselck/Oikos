"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useOikosStore } from "@/lib/store";
import { IAgentOSClient } from "@/lib/agentos-client";
import {
  AgentOSRegistryEngine,
  EntityType,
  MutateEntityParams,
  SaveAgentInput,
  SaveTeamInput,
  SaveWorkflowInput,
  SaveKnowledgeBaseInput,
} from "@/lib/agentos-registry";
import { Agent, Team, Workflow, KnowledgeBase, Session, IndexContentParams, IngestionResponse } from "@/lib/types";
import { IndexDocumentInput, IndexUrlInput } from "@/lib/rag-engine";

export interface AgentOSRegistryOptions {
  client?: IAgentOSClient;
  autoFetch?: boolean;
  instanceId?: string;
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
  saveKnowledgeBase: (input: SaveKnowledgeBaseInput) => Promise<KnowledgeBase>;
  deleteEntity: (resource: EntityType, id: string) => Promise<boolean>;
  mutateEntity: <T = Record<string, unknown>>(params: MutateEntityParams<T>) => Promise<T | boolean>;
  indexContent: (params: IndexContentParams) => Promise<IngestionResponse>;
  indexDocument: (input: IndexDocumentInput) => Promise<IngestionResponse>;
  indexUrl: (input: IndexUrlInput) => Promise<IngestionResponse>;
}

/**
 * Deep AgentOS Registry Engine React Hook Adapter
 *
 * Provides reactive subscriptions to `useOikosStore` cache while delegating all
 * entity normalization, mutations, RAG indexing, and hydration to the pure `AgentOSRegistryEngine`.
 */
export function useAgentOSRegistry(options: AgentOSRegistryOptions = {}): UseAgentOSRegistryReturn {
  const store = useOikosStore();
  const { activeInstance } = store;
  const targetInstanceId = options.instanceId ?? activeInstance?.id ?? "default";

  const engine = useMemo(() => {
    return new AgentOSRegistryEngine({
      client: options.client,
      instanceId: targetInstanceId,
    });
  }, [options.client, targetInstanceId]);

  const refresh = useCallback(async () => {
    await engine.refresh();
  }, [engine]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      refresh();
    }
  }, [refresh, options.autoFetch, targetInstanceId]);

  const saveAgent = useCallback(
    async (input: SaveAgentInput) => engine.saveAgent(input),
    [engine]
  );

  const saveTeam = useCallback(
    async (input: SaveTeamInput) => engine.saveTeam(input),
    [engine]
  );

  const saveWorkflow = useCallback(
    async (input: SaveWorkflowInput) => engine.saveWorkflow(input),
    [engine]
  );

  const saveKnowledgeBase = useCallback(
    async (input: SaveKnowledgeBaseInput) => engine.saveKnowledgeBase(input),
    [engine]
  );

  const deleteEntity = useCallback(
    async (resource: EntityType, id: string) => engine.deleteEntity(resource, id),
    [engine]
  );

  const mutateEntity = useCallback(
    async <T = Record<string, unknown>>(params: MutateEntityParams<T>) => engine.mutateEntity<T>(params),
    [engine]
  );

  const indexContent = useCallback(
    async (params: IndexContentParams) => engine.indexContent(params),
    [engine]
  );

  const indexDocument = useCallback(
    async (input: IndexDocumentInput) => engine.indexDocument(input),
    [engine]
  );

  const indexUrl = useCallback(
    async (input: IndexUrlInput) => engine.indexUrl(input),
    [engine]
  );

  const pendingMutationsArray = Array.from(store.pendingMutations);
  const isMutating = useCallback((id: string) => store.pendingMutations.has(id), [store.pendingMutations]);

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
    saveKnowledgeBase,
    deleteEntity,
    mutateEntity,
    indexContent,
    indexDocument,
    indexUrl,
  };
}

