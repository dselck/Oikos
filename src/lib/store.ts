import { create } from "zustand";
import { InstanceConfig, Agent, ChatMessage, ViewMode } from "./types";

interface OikosState {
  // Views
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Instance Configs
  instances: InstanceConfig[];
  activeInstance: InstanceConfig | null;
  setInstances: (instances: InstanceConfig[]) => void;
  setActiveInstance: (instance: InstanceConfig | null) => void;

  // Selected Agent / Workflow
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
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

  // Trace Inspector Slide-Over Panel
  selectedTraceMessage: ChatMessage | null;
  isTraceOpen: boolean;
  openTraceInspector: (msg: ChatMessage) => void;
  closeTraceInspector: () => void;
}

export const useOikosStore = create<OikosState>((set) => ({
  viewMode: "playground",
  setViewMode: (mode) => set({ viewMode: mode }),

  instances: [],
  activeInstance: null,
  setInstances: (instances) => set({ instances }),
  setActiveInstance: (instance) => set({ activeInstance: instance }),

  agents: [],
  setAgents: (agents) => set({ agents }),
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

  selectedTraceMessage: null,
  isTraceOpen: false,
  openTraceInspector: (msg) => set({ selectedTraceMessage: msg, isTraceOpen: true }),
  closeTraceInspector: () => set({ isTraceOpen: false, selectedTraceMessage: null }),
}));
