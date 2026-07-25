import { Agent, InstanceConfig, ToolCallExecution } from "./types";

export async function checkInstanceHealth(instance: InstanceConfig): Promise<"connected" | "unreachable"> {
  try {
    const res = await fetch("/api/proxy/health", {
      headers: {
        "x-instance-id": instance.id,
      },
    });
    if (res.ok) return "connected";
    
    const resV1 = await fetch("/api/proxy/v1/health", {
      headers: {
        "x-instance-id": instance.id,
      },
    });
    return resV1.ok ? "connected" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export async function fetchAgents(instanceId: string): Promise<Agent[]> {
  const res = await fetch("/api/proxy/v1/agents", {
    headers: {
      "x-instance-id": instanceId,
    },
  });

  if (!res.ok) {
    throw new Error(`AgentOS API returned status ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((a) => ({
      id: a.agent_id || a.id || "default-agent",
      name: a.name || "Agno Agent",
      description: a.description || "AgentOS Autonomous Agent",
      model: a.model || "gpt-4o",
      tools: a.tools || [],
    }));
  }

  return [];
}

export async function createAgentOnInstance(instanceId: string, agentData: Record<string, unknown>): Promise<Agent> {
  const res = await fetch("/api/proxy/v1/agents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-instance-id": instanceId,
    },
    body: JSON.stringify(agentData),
  });

  if (!res.ok) {
    throw new Error(`Failed to create agent on AgentOS (${res.status})`);
  }

  return await res.json();
}

export async function streamAgentRun(params: {
  instanceId: string;
  agentId: string;
  message: string;
  sessionId?: string;
  onChunk: (text: string) => void;
  onToolCall: (toolCall: ToolCallExecution) => void;
  onRawEvent: (event: Record<string, unknown>) => void;
}) {
  const { instanceId, agentId, message, sessionId, onChunk, onToolCall, onRawEvent } = params;

  const startTime = Date.now();
  const res = await fetch(`/api/proxy/v1/playground/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-instance-id": instanceId,
    },
    body: JSON.stringify({
      agent_id: agentId,
      message,
      session_id: sessionId,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`AgentOS execution failed (${res.status}): ${errorText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;

      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          onRawEvent(parsed);

          if (parsed.content) {
            onChunk(parsed.content);
          }

          if (parsed.event === "RunResponse" && parsed.content) {
            onChunk(parsed.content);
          }

          if (parsed.tool_call) {
            onToolCall({
              id: parsed.tool_call.id || `tool-${Date.now()}`,
              toolName: parsed.tool_call.name || "Tool Execution",
              arguments: parsed.tool_call.args,
              status: "running",
              startTime,
            });
          }

          if (parsed.tool_result) {
            onToolCall({
              id: parsed.tool_result.id || `tool-${Date.now()}`,
              toolName: parsed.tool_result.name || "Tool Execution",
              output: parsed.tool_result.output,
              status: "success",
              startTime,
              durationMs: Date.now() - startTime,
            });
          }
        } catch {
          onChunk(jsonStr);
        }
      }
    }
  }
}
