import { create } from "zustand";
import { InstanceConfig, Agent, Team, Workflow, KnowledgeBase, Session, SessionDetails, ChatMessage, ViewMode } from "./types";
import { StreamState } from "./session-engine";

interface OikosState {
  // Views
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Instance Configs
  instances: InstanceConfig[];
  activeInstance: InstanceConfig | null;
  setInstances: (instances: InstanceConfig[]) => void;
  setActiveInstance: (instance: InstanceConfig | null) => void;

  // Entity Registry State
  agents: Agent[];
  teams: Team[];
  workflows: Workflow[];
  knowledgeBases: KnowledgeBase[];
  sessions: Session[];
  isRegistryLoading: boolean;
  registryError: string | null;
  pendingMutations: Set<string>;
  sessionDetailsCache: Map<string, SessionDetails>;

  setAgents: (agents: Agent[]) => void;
  setTeams: (teams: Team[]) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  setKnowledgeBases: (knowledgeBases: KnowledgeBase[]) => void;
  setSessions: (sessions: Session[]) => void;
  setRegistryLoading: (loading: boolean) => void;
  setRegistryError: (error: string | null) => void;
  addPendingMutation: (id: string) => void;
  removePendingMutation: (id: string) => void;
  setHydratedEntities: (data: {
    agents: Agent[];
    teams: Team[];
    workflows: Workflow[];
    knowledgeBases: KnowledgeBase[];
    sessions: Session[];
  }) => void;
  setSessionDetailsCache: (key: string, details: SessionDetails) => void;
  evictSessionDetailsCache: (key: string) => void;

  // Selected Agent / Workflow
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;

  // Sessions & Messages
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (updater: (msg: ChatMessage) => ChatMessage) => void;

  // Theme State
  theme: "dark" | "light";
  toggleTheme: () => void;

  // Session Streaming UI State
  streamState: StreamState;
  setStreamState: (state: StreamState) => void;

  // Trace Inspector Slide-Over Panel
  selectedTraceMessage: ChatMessage | null;
  isTraceOpen: boolean;
  openTraceInspector: (msg: ChatMessage) => void;
  closeTraceInspector: () => void;
}

export const useOikosStore = create<OikosState>((set, get) => ({
  viewMode: "playground",
  setViewMode: (mode) => set({ viewMode: mode }),

  instances: [],
  activeInstance: null,
  setInstances: (instances) => set({ instances }),
  setActiveInstance: (instance) => set({ activeInstance: instance }),

  agents: [],
  teams: [],
  workflows: [],
  knowledgeBases: [],
  sessions: [],
  isRegistryLoading: false,
  registryError: null,
  pendingMutations: new Set(),
  sessionDetailsCache: new Map(),

  setAgents: (agents) => set({ agents }),
  setTeams: (teams) => set({ teams }),
  setWorkflows: (workflows) => set({ workflows }),
  setKnowledgeBases: (knowledgeBases) => set({ knowledgeBases }),
  setSessions: (sessions) => set({ sessions }),
  setRegistryLoading: (isRegistryLoading) => set({ isRegistryLoading }),
  setRegistryError: (registryError) => set({ registryError, isRegistryLoading: false }),

  addPendingMutation: (id) =>
    set((state) => {
      const next = new Set(state.pendingMutations);
      next.add(id);
      return { pendingMutations: next };
    }),

  removePendingMutation: (id) =>
    set((state) => {
      const next = new Set(state.pendingMutations);
      next.delete(id);
      return { pendingMutations: next };
    }),

  setHydratedEntities: (data) =>
    set({
      agents: data.agents,
      teams: data.teams,
      workflows: data.workflows,
      knowledgeBases: data.knowledgeBases,
      sessions: data.sessions,
      isRegistryLoading: false,
      registryError: null,
    }),

  setSessionDetailsCache: (key, details) =>
    set((state) => {
      const next = new Map(state.sessionDetailsCache);
      next.set(key, details);
      return { sessionDetailsCache: next };
    }),

  evictSessionDetailsCache: (key) =>
    set((state) => {
      const next = new Map(state.sessionDetailsCache);
      next.delete(key);
      return { sessionDetailsCache: next };
    }),

  selectedAgent: null,
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (updater) =>
    set((state) => {
      if (state.messages.length === 0) return state;
      const updated = [...state.messages];
      updated[updated.length - 1] = updater(updated[updated.length - 1]);
      return { messages: updated };
    }),

  theme: "dark",
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

  streamState: {
    isStreaming: false,
    tokensPerSecond: null,
    streamError: null,
  },
  setStreamState: (streamState) => set({ streamState }),

  selectedTraceMessage: null,
  isTraceOpen: false,
  openTraceInspector: (msg) => set({ selectedTraceMessage: msg, isTraceOpen: true }),
  closeTraceInspector: () => set({ isTraceOpen: false, selectedTraceMessage: null }),
}));

