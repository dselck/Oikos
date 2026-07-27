import { Agent, Team, Workflow, KnowledgeBase, Session, SessionDetails, SessionTelemetry, ChatMessage, InstanceConfig, IndexContentParams, IngestionResponse } from "./types";

export interface AgentOSClientOptions {
  instanceId?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface StreamRunOptions {
  entityType?: "agent" | "team" | "workflow";
  entityId: string;
  message: string;
  sessionId?: string;
  userId?: string;
  files?: string[];
  version?: string;
}

export interface ContinueRunParams {
  entityType?: "agent" | "team" | "workflow";
  entityId: string;
  runId: string;
  sessionId?: string;
  tools: Array<Record<string, unknown>>;
  input?: string;
}

export interface IAgentOSClient {
  agents: {
    list(): Promise<Agent[]>;
    create(data: Record<string, unknown>): Promise<Agent>;
    delete(id: string): Promise<boolean>;
  };
  teams: {
    list(): Promise<Team[]>;
    create(data: Record<string, unknown>): Promise<Team>;
    delete(id: string): Promise<boolean>;
  };
  workflows: {
    list(): Promise<Workflow[]>;
    create(data: Record<string, unknown>): Promise<Workflow>;
    delete(id: string): Promise<boolean>;
  };
  knowledgeBases: {
    list(): Promise<KnowledgeBase[]>;
    create(data: Record<string, unknown>): Promise<KnowledgeBase>;
    delete(id: string): Promise<boolean>;
    indexContent(params: IndexContentParams): Promise<IngestionResponse>;
  };
  sessions: {
    list(userId?: string): Promise<Session[]>;
    get(id: string): Promise<SessionDetails>;
    delete(id: string): Promise<boolean>;
  };
  health: {
    check(): Promise<"connected" | "unreachable">;
  };
  runs: {
    stream(options: StreamRunOptions): Promise<Response>;
    continue(params: ContinueRunParams): Promise<Response>;
  };
}

export function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [trimmed];
    }
  }
  return [];
}

export function parseObjectField<T extends Record<string, unknown>>(value: unknown): T {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {} as T;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

export function parseStepsField(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "object" && v !== null) as Array<Record<string, unknown>>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === "object" && v !== null) as Array<Record<string, unknown>>;
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeAgent(a: Record<string, unknown>): Agent {
  const tools = parseArrayField(a.tools || a.toolsJson);
  const instructions = parseArrayField(a.instructions || a.instructionsJson);
  return {
    id: (a.agent_id || a.id || "default-agent") as string,
    name: (a.name || "Agno Agent") as string,
    description: (a.description || "AgentOS Autonomous Agent") as string,
    model: (a.model || "gpt-4o") as string,
    tools,
    systemPrompt: (a.systemPrompt || a.system_prompt || "") as string,
    instructions,
    modelProvider: (a.modelProvider || "openai") as string,
    modelName: (a.modelName || a.model || "gpt-4o") as string,
    createdAt: a.createdAt as string | undefined,
    updatedAt: a.updatedAt as string | undefined,
  };
}

export function normalizeTeam(t: Record<string, unknown>): Team {
  const memberAgentIds = parseArrayField(t.memberAgentIds || t.memberAgentIdsJson);
  const instructions = parseArrayField(t.instructions || t.instructionsJson);
  return {
    id: (t.id || `team-${Date.now()}`) as string,
    name: (t.name || "Agno Team") as string,
    description: t.description !== undefined ? (t.description as string | null) : null,
    leaderAgentId: (t.leaderAgentId || undefined) as string | undefined,
    memberAgentIds,
    executionMode: (t.executionMode || "sequential") as string,
    instructions,
    sharedMemory: typeof t.sharedMemory === "boolean" ? t.sharedMemory : true,
    createdAt: t.createdAt as string | undefined,
    updatedAt: t.updatedAt as string | undefined,
  };
}

export function normalizeWorkflow(w: Record<string, unknown>): Workflow {
  const steps = parseStepsField(w.steps || w.stepsJson);
  const sessionState = parseObjectField(w.sessionState || w.sessionStateJson);
  return {
    id: (w.id || `wf-${Date.now()}`) as string,
    name: (w.name || "Agno Workflow") as string,
    description: w.description !== undefined ? (w.description as string | null) : null,
    steps,
    sessionState,
    createdAt: w.createdAt as string | undefined,
    updatedAt: w.updatedAt as string | undefined,
  };
}

export function normalizeSession(s: Record<string, unknown>): Session {
  return {
    id: (s.session_id || s.id || `session-${Date.now()}`) as string,
    instanceId: (s.instanceId || s.instance_id || "default") as string,
    agentId: (s.agent_id || s.agentId || "default") as string,
    title: (s.title || s.session_name || s.name || `Session ${(s.session_id || s.id || "")}`) as string,
    messagesCount: typeof s.messages_count === "number" ? s.messages_count : Array.isArray(s.messages) ? s.messages.length : undefined,
    lastMessageSnippet: typeof s.last_message === "string" ? s.last_message : undefined,
    createdAt: (s.created_at || s.createdAt) as string | undefined,
    updatedAt: (s.updated_at || s.updatedAt) as string | undefined,
  };
}

export function normalizeSessionDetails(data: Record<string, unknown>, fallbackId: string): SessionDetails {
  const rawMessages = Array.isArray(data.messages) ? data.messages : Array.isArray(data.runs) ? data.runs : [];
  const messages: ChatMessage[] = rawMessages.map((m: Record<string, unknown>, idx: number) => ({
    id: (m.id || m.message_id || `msg-${idx}`) as string,
    role: (m.role || "assistant") as "user" | "assistant" | "system" | "tool",
    content: (m.content || m.message || "") as string,
    timestamp: (m.timestamp || m.created_at || new Date().toISOString()) as string,
    toolExecutions: Array.isArray(m.tool_calls)
      ? m.tool_calls
      : Array.isArray(m.toolExecutions)
      ? m.toolExecutions
      : undefined,
    metrics: m.metrics as ChatMessage["metrics"],
  }));

  // Memory Summary Normalization Seam
  let memorySummary: string | undefined = undefined;
  if (typeof data.memory_summary === "string" && data.memory_summary.trim()) {
    memorySummary = data.memory_summary;
  } else if (typeof data.memory === "string" && data.memory.trim()) {
    memorySummary = data.memory;
  } else if (typeof data.session_memory === "string" && data.session_memory.trim()) {
    memorySummary = data.session_memory;
  } else if (typeof data.summary === "string" && data.summary.trim()) {
    memorySummary = data.summary;
  }

  // User Context Normalization Seam
  let userContext: Record<string, unknown> | undefined = undefined;
  if (typeof data.user_context === "object" && data.user_context !== null) {
    userContext = data.user_context as Record<string, unknown>;
  } else if (typeof data.user_data === "object" && data.user_data !== null) {
    userContext = data.user_data as Record<string, unknown>;
  } else if (typeof data.user_context_json === "string") {
    try {
      userContext = JSON.parse(data.user_context_json);
    } catch {
      // fallback
    }
  }

  // Compute Aggregate Telemetry Metrics
  const totalToolCalls = messages.reduce((acc, m) => acc + (m.toolExecutions?.length || 0), 0);
  const estimatedPromptTokens = messages
    .filter((m) => m.role === "user")
    .reduce((acc, m) => acc + (m.metrics?.promptTokens || Math.floor((m.content || "").length / 4) + 10), 0);
  const estimatedCompletionTokens = messages
    .filter((m) => m.role === "assistant")
    .reduce((acc, m) => acc + (m.metrics?.completionTokens || Math.floor((m.content || "").length / 4)), 0);

  const telemetry: SessionTelemetry = {
    totalMessages: messages.length,
    totalToolCalls,
    estimatedPromptTokens,
    estimatedCompletionTokens,
  };

  return {
    id: (data.session_id || data.id || fallbackId) as string,
    instanceId: (data.instance_id || data.instanceId) as string | undefined,
    agentId: (data.agent_id || data.agentId || "default") as string,
    title: (data.title || data.session_name || `Session ${fallbackId}`) as string,
    messages,
    memorySummary,
    userContext,
    telemetry,
    createdAt: (data.created_at || data.createdAt) as string | undefined,
    updatedAt: (data.updated_at || data.updatedAt) as string | undefined,
  };
}

export class HttpAgentOSClient implements IAgentOSClient {
  private instanceId?: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(options: AgentOSClientOptions = {}) {
    this.instanceId = options.instanceId;
    this.baseUrl = options.baseUrl || "/api/proxy/v1";
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  private async request(endpointPath: string, init?: RequestInit): Promise<Response> {
    const cleanPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const headers = new Headers(init?.headers);
    if (this.instanceId) {
      headers.set("x-instance-id", this.instanceId);
    }

    return this.fetchImpl(url, {
      ...init,
      headers,
    });
  }

  public agents = {
    list: async (): Promise<Agent[]> => {
      const res = await this.request("/agents");
      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((a: Record<string, unknown>) => normalizeAgent(a));
    },

    create: async (agentData: Record<string, unknown>): Promise<Agent> => {
      const isUpdate = Boolean(agentData.id);
      const method = isUpdate ? "PUT" : "POST";
      const res = await this.request("/agents", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentData),
      });

      if (!res.ok) {
        throw new Error(`Failed to save agent on AgentOS (${res.status})`);
      }

      const raw = await res.json();
      return normalizeAgent(raw);
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await this.request(`/agents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.ok;
    },
  };

  public teams = {
    list: async (): Promise<Team[]> => {
      const res = await this.request("/teams");
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((t: Record<string, unknown>) => normalizeTeam(t));
    },

    create: async (teamData: Record<string, unknown>): Promise<Team> => {
      const res = await this.request("/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamData),
      });
      if (!res.ok) throw new Error(`Failed to save team (${res.status})`);
      const raw = await res.json();
      return normalizeTeam(raw);
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await this.request(`/teams?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.ok;
    },
  };

  public workflows = {
    list: async (): Promise<Workflow[]> => {
      const res = await this.request("/workflows");
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((w: Record<string, unknown>) => normalizeWorkflow(w));
    },

    create: async (wfData: Record<string, unknown>): Promise<Workflow> => {
      const res = await this.request("/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wfData),
      });
      if (!res.ok) throw new Error(`Failed to save workflow (${res.status})`);
      const raw = await res.json();
      return normalizeWorkflow(raw);
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await this.request(`/workflows?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.ok;
    },
  };

  public knowledgeBases = {
    list: async (): Promise<KnowledgeBase[]> => {
      const res = await this.request("/knowledge-bases");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },

    create: async (kbData: Record<string, unknown>): Promise<KnowledgeBase> => {
      const res = await this.request("/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kbData),
      });
      if (!res.ok) throw new Error(`Failed to save knowledge base (${res.status})`);
      return res.json();
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await this.request(`/knowledge-bases?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.ok;
    },

    indexContent: async (params: IndexContentParams): Promise<IngestionResponse> => {
      const { kbId, ...bodyPayload } = params;

      // Deep Module Reader Strategy Inferencing Seam
      let resolvedReaderType = params.readerType;
      if (!resolvedReaderType) {
        if (params.sourceType === "url" || params.url) {
          resolvedReaderType = "website_reader";
        } else if (params.sourceType === "markdown" || (params.content && /^#+/m.test(params.content))) {
          resolvedReaderType = "markdown_reader";
        } else if (params.title.toLowerCase().endsWith(".pdf")) {
          resolvedReaderType = "pdf_reader";
        } else {
          resolvedReaderType = "text_reader";
        }
      }

      const finalPayload = {
        readerType: resolvedReaderType,
        chunkingStrategy: params.chunkingStrategy || "recursive",
        chunkSize: params.chunkSize || 500,
        chunkOverlap: params.chunkOverlap || 50,
        ...bodyPayload,
      };

      const res = await this.request(`/knowledge-bases/${encodeURIComponent(kbId)}/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) {
        throw new Error(`Failed to index content into Agno Knowledge Base '${kbId}' (${res.status})`);
      }

      const data = await res.json();
      return {
        success: Boolean(data.success ?? true),
        documentsIndexed: Number(data.documents_indexed || data.documentsIndexed || 1),
        chunksGenerated: Number(data.chunks_generated || data.chunksGenerated || 1),
        message: (data.message || `Successfully indexed '${params.title}' into Agno Knowledge Base using ${resolvedReaderType}`) as string,
      };
    },
  };

  public sessions = {
    list: async (userId?: string): Promise<Session[]> => {
      const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
      const res = await this.request(`/sessions${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((s: Record<string, unknown>) => normalizeSession(s));
    },

    get: async (id: string): Promise<SessionDetails> => {
      const res = await this.request(`/sessions/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch session details for '${id}' (${res.status})`);
      }
      const data = await res.json();
      return normalizeSessionDetails(data, id);
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await this.request(`/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.ok;
    },
  };

  public health = {
    check: async (): Promise<"connected" | "unreachable"> => {
      try {
        const headers = new Headers();
        if (this.instanceId) headers.set("x-instance-id", this.instanceId);

        const res = await this.fetchImpl("/api/proxy/health", { headers });
        if (res.ok) return "connected";

        const resV1 = await this.fetchImpl("/api/proxy/v1/health", { headers });
        return resV1.ok ? "connected" : "unreachable";
      } catch {
        return "unreachable";
      }
    },
  };

  public runs = {
    stream: async (options: StreamRunOptions): Promise<Response> => {
      const { entityType = "agent", entityId, message, sessionId, userId } = options;
      const endpoint = `/${entityType}s/${encodeURIComponent(entityId)}/runs`;

      let res = await this.request(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          session_id: sessionId || undefined,
          user_id: userId || undefined,
          stream: true,
        }),
      });

      if (!res.ok && entityType === "agent") {
        res = await this.request(`/playground/agent/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: entityId,
            message,
            session_id: sessionId || undefined,
            user_id: userId || undefined,
            stream: true,
          }),
        });
      }

      return res;
    },

    continue: async (params: ContinueRunParams): Promise<Response> => {
      const { entityType = "agent", entityId, runId, sessionId, tools, input } = params;
      const formData = new URLSearchParams();
      formData.append("tools", JSON.stringify(tools));
      if (input) formData.append("input", input);
      if (sessionId) formData.append("session_id", sessionId);

      const endpoint = `/${entityType}s/${encodeURIComponent(entityId)}/runs/${encodeURIComponent(runId)}/continue`;
      return this.request(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
    },
  };
}

export class MockAgentOSClient implements IAgentOSClient {
  public agentsList: Agent[] = [];
  public teamsList: Team[] = [];
  public workflowsList: Workflow[] = [];
  public knowledgeBasesList: KnowledgeBase[] = [];
  public sessionsList: Session[] = [];
  public isHealthy = true;

  public agents = {
    list: async (): Promise<Agent[]> => this.agentsList.map((a) => normalizeAgent(a as unknown as Record<string, unknown>)),
    create: async (data: Record<string, unknown>): Promise<Agent> => {
      const agent = normalizeAgent({
        id: (data.id || `agent-${Date.now()}`) as string,
        name: (data.name || "Mock Agent") as string,
        description: (data.description || "") as string,
        model: (data.model || `${data.modelProvider || "openai"}:${data.modelName || "gpt-4o"}`) as string,
        tools: data.tools,
        systemPrompt: (data.systemPrompt || "") as string,
        instructions: data.instructions,
        modelProvider: (data.modelProvider || "openai") as string,
        modelName: (data.modelName || "gpt-4o") as string,
        ...data,
      });
      this.agentsList.push(agent);
      return agent;
    },
    delete: async (id: string): Promise<boolean> => {
      this.agentsList = this.agentsList.filter((a) => a.id !== id);
      return true;
    },
  };

  public teams = {
    list: async (): Promise<Team[]> => this.teamsList.map((t) => normalizeTeam(t as unknown as Record<string, unknown>)),
    create: async (data: Record<string, unknown>): Promise<Team> => {
      const team = normalizeTeam(data);
      this.teamsList.push(team);
      return team;
    },
    delete: async (id: string): Promise<boolean> => {
      this.teamsList = this.teamsList.filter((t) => t.id !== id);
      return true;
    },
  };

  public workflows = {
    list: async (): Promise<Workflow[]> => this.workflowsList.map((w) => normalizeWorkflow(w as unknown as Record<string, unknown>)),
    create: async (data: Record<string, unknown>): Promise<Workflow> => {
      const wf = normalizeWorkflow(data);
      this.workflowsList.push(wf);
      return wf;
    },
    delete: async (id: string): Promise<boolean> => {
      this.workflowsList = this.workflowsList.filter((w) => w.id !== id);
      return true;
    },
  };

  public knowledgeBases = {
    list: async (): Promise<KnowledgeBase[]> => [...this.knowledgeBasesList],
    create: async (data: Record<string, unknown>): Promise<KnowledgeBase> => {
      const kb = data as unknown as KnowledgeBase;
      this.knowledgeBasesList.push(kb);
      return kb;
    },
    delete: async (id: string): Promise<boolean> => {
      this.knowledgeBasesList = this.knowledgeBasesList.filter((k) => k.id !== id);
      return true;
    },

    indexContent: async (params: IndexContentParams): Promise<IngestionResponse> => {
      let resolvedReaderType = params.readerType;
      if (!resolvedReaderType) {
        if (params.sourceType === "url" || params.url) {
          resolvedReaderType = "website_reader";
        } else if (params.sourceType === "markdown" || (params.content && /^#+/m.test(params.content))) {
          resolvedReaderType = "markdown_reader";
        } else if (params.title.toLowerCase().endsWith(".pdf")) {
          resolvedReaderType = "pdf_reader";
        } else {
          resolvedReaderType = "text_reader";
        }
      }

      const textLength = (params.content || params.url || params.title).length;
      const chunkSize = params.chunkSize || 500;
      const chunksGenerated = Math.max(1, Math.ceil(textLength / chunkSize));

      const readerName =
        resolvedReaderType === "markdown_reader"
          ? "MarkdownReader"
          : resolvedReaderType === "pdf_reader"
          ? "PDFReader"
          : resolvedReaderType === "website_reader"
          ? "WebsiteReader"
          : "TextReader";

      return {
        success: true,
        documentsIndexed: 1,
        chunksGenerated,
        message: `Successfully indexed '${params.title}' using Agno ${readerName}!`,
      };
    },
  };

  public sessions = {
    list: async (_userId?: string): Promise<Session[]> => [...this.sessionsList],
    get: async (id: string): Promise<SessionDetails> => {
      const found = this.sessionsList.find((s) => s.id === id);
      const messages: ChatMessage[] = [
        {
          id: `mock-msg-1`,
          role: "user",
          content: `Mock prompt for session ${id}`,
          timestamp: new Date().toISOString(),
        },
        {
          id: `mock-msg-2`,
          role: "assistant",
          content: `Mock AgentOS response for session ${id}`,
          timestamp: new Date().toISOString(),
        },
      ];
      return {
        id: found?.id || id,
        agentId: found?.agentId || "default-agent",
        title: found?.title || `Mock Session ${id}`,
        messages,
        memorySummary: `Mock memory summary context for session ${id}`,
        telemetry: {
          totalMessages: messages.length,
          totalToolCalls: 0,
          estimatedPromptTokens: Math.floor(`Mock prompt for session ${id}`.length / 4) + 10,
          estimatedCompletionTokens: Math.floor(`Mock AgentOS response for session ${id}`.length / 4),
        },
        createdAt: found?.createdAt,
        updatedAt: found?.updatedAt,
      };
    },
    delete: async (id: string): Promise<boolean> => {
      this.sessionsList = this.sessionsList.filter((s) => s.id !== id);
      return true;
    },
  };

  public health = {
    check: async (): Promise<"connected" | "unreachable"> => {
      return this.isHealthy ? "connected" : "unreachable";
    },
  };

  public runs = {
    stream: async (options: StreamRunOptions): Promise<Response> => {
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: `Mock response for: ${options.message}` })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    },
    continue: async (): Promise<Response> => {
      return new Response("data: [DONE]\n\n", { status: 200 });
    },
  };
}

export function createAgentOSClient(instanceId?: string, options: AgentOSClientOptions = {}): IAgentOSClient {
  return new HttpAgentOSClient({ instanceId, ...options });
}
