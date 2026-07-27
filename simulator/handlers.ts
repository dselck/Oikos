import { IncomingMessage, ServerResponse } from "http";
import { MockAgent, MockSession, MockWorkflow, MockMemory, MockTrace } from "./types";

export class SimulatorState {
  agents: Map<string, MockAgent> = new Map();
  sessions: Map<string, MockSession> = new Map();
  workflows: Map<string, MockWorkflow> = new Map();
  memories: Map<string, MockMemory> = new Map();
  traces: Map<string, MockTrace> = new Map();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // Seed default agents
    const defaultAgent: MockAgent = {
      id: "agent-builder",
      name: "Agent Builder",
      description: "Autonomous Agent for building and orchestrating Agno agents",
      model: "gpt-4o",
      tools: [{ name: "search_code" }, { name: "generate_agent" }],
      created_at: Date.now(),
    };

    const webAgent: MockAgent = {
      id: "web-search-agent",
      name: "Web Search Agent",
      description: "Agent for searching web sources and summarizing technical docs",
      model: "claude-3-5-sonnet",
      tools: [{ name: "duckduckgo_search" }, { name: "jira_get_issue" }],
      created_at: Date.now(),
    };

    this.agents.set(defaultAgent.id, defaultAgent);
    this.agents.set(webAgent.id, webAgent);

    // Seed default sessions
    const defaultSession: MockSession = {
      session_id: "sess-default-1",
      agent_id: "agent-builder",
      title: "Initial Exploration Session",
      created_at: Date.now() - 3600000,
      updated_at: Date.now(),
    };
    this.sessions.set(defaultSession.session_id, defaultSession);

    // Seed default workflow
    const defaultWorkflow: MockWorkflow = {
      id: "eval-workflow",
      name: "Run Evals Workflow",
      description: "Automated benchmark evaluation workflow",
      steps: ["fetch_dataset", "evaluate_agent", "aggregate_results"],
    };
    this.workflows.set(defaultWorkflow.id, defaultWorkflow);

    // Seed default trace
    const defaultTrace: MockTrace = {
      trace_id: "trace-init-1",
      name: "Agent Run: agent-builder",
      status: "COMPLETED",
      duration_ms: 450,
      timestamp: Date.now(),
      spans: [
        { name: "llm_call", duration: 320 },
        { name: "tool_execution", duration: 110 },
      ],
    };
    this.traces.set(defaultTrace.trace_id, defaultTrace);
  }
}

export function sendJSON(res: ServerResponse, data: unknown, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function handleHealth(_req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, { status: "healthy", timestamp: new Date().toISOString() });
}

export function handleInfo(_req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, {
    name: "Agno AgentOS Simulator",
    version: "1.0.0",
    status: "running",
    environment: "simulation",
  });
}

export function handleConfig(_req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, {
    version: "1.0.0",
    auth_enabled: false,
    mcp_enabled: true,
    telemetry_enabled: true,
  });
}

export function handleModels(_req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, [
    { id: "gpt-4o", provider: "openai" },
    { id: "claude-3-5-sonnet", provider: "anthropic" },
    { id: "gemini-2.0-flash", provider: "google" },
  ]);
}

export function handleListAgents(state: SimulatorState, _req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, Array.from(state.agents.values()));
}

export function handleGetAgent(state: SimulatorState, agentId: string, res: ServerResponse) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    sendJSON(res, { detail: `Agent '${agentId}' not found` }, 404);
    return;
  }
  sendJSON(res, agent);
}

export function handleCreateAgent(state: SimulatorState, body: Record<string, unknown>, res: ServerResponse) {
  const agentId = (body.id || body.agent_id || `agent-${Date.now()}`) as string;
  const newAgent: MockAgent = {
    id: agentId,
    name: (body.name as string) || "Custom Agent",
    description: (body.description as string) || "Agent created in simulation",
    model: (body.model as string) || "gpt-4o",
    tools: (body.tools as Array<Record<string, unknown>>) || [],
    created_at: Date.now(),
  };

  state.agents.set(agentId, newAgent);
  sendJSON(res, newAgent, 201);
}

export async function handleAgentRun(
  state: SimulatorState,
  agentId: string,
  body: Record<string, unknown>,
  res: ServerResponse
) {
  const isStream = Boolean(body.stream);
  const message = (body.message as string) || "Hello agent";
  const sessionId = (body.session_id as string) || `sess-${Date.now()}`;
  const runId = `run-${Date.now()}`;

  // Ensure session exists
  if (!state.sessions.has(sessionId)) {
    state.sessions.set(sessionId, {
      session_id: sessionId,
      agent_id: agentId,
      title: message.length > 30 ? message.slice(0, 30) + "..." : message,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  const isJiraQuery = message.toLowerCase().includes("jira");

  if (isStream) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (isJiraQuery) {
      // Simulate a deferred client tool call event
      const events = [
        { event: "RunStarted", run_id: runId, session_id: sessionId, agent_id: agentId },
        { event: "RunResponse", content: `Processing request for Jira ticket... ` },
        { tool_call: { id: `call-${Date.now()}`, name: "jira_get_issue", args: { issue_key: "PROJ-101" } } },
      ];
      for (const evt of events) {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      res.end();
    } else {
      const events = [
        { event: "RunStarted", run_id: runId, session_id: sessionId, agent_id: agentId },
        { event: "RunResponse", content: `Simulated response for: "${message}". ` },
        { tool_call: { id: `tool-${Date.now()}`, name: "system_search", args: { query: message } } },
        { tool_result: { id: `tool-${Date.now()}`, name: "system_search", output: "Simulation data retrieved successfully." } },
        { event: "RunResponse", content: `Execution complete with run ID ${runId}.` },
      ];

      for (const evt of events) {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      res.write("data: [DONE]\n\n");
      res.end();
    }
  } else {
    sendJSON(res, {
      run_id: runId,
      session_id: sessionId,
      agent_id: agentId,
      status: "COMPLETED",
      content: `Simulated non-stream response for: "${message}"`,
      created_at: Date.now(),
    });
  }
}

/**
 * Handle POST /agents/{agent_id}/runs/{run_id}/continue per openapi.json
 */
export async function handleContinueAgentRun(
  _state: SimulatorState,
  agentId: string,
  runId: string,
  _body: Record<string, unknown>,
  res: ServerResponse
) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const events = [
    { event: "RunContent", content: `Received client tool result for run ${runId}. ` },
    { event: "RunResponse", content: `Successfully processed client-side mTLS tool response for agent ${agentId}!` },
  ];

  for (const evt of events) {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

export function handleListSessions(state: SimulatorState, _req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, Array.from(state.sessions.values()));
}

export function handleGetSession(state: SimulatorState, sessionId: string, res: ServerResponse) {
  const session = state.sessions.get(sessionId);
  if (!session) {
    sendJSON(res, { detail: `Session '${sessionId}' not found` }, 404);
    return;
  }
  sendJSON(res, session);
}

export function handleListWorkflows(state: SimulatorState, _req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, Array.from(state.workflows.values()));
}

export function handleListMemories(state: SimulatorState, _req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, Array.from(state.memories.values()));
}

export function handleListTraces(state: SimulatorState, _req: IncomingMessage, res: ServerResponse) {
  sendJSON(res, Array.from(state.traces.values()));
}
