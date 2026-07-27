import fs from "fs";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";
import {
  SimulatorState,
  handleHealth,
  handleInfo,
  handleConfig,
  handleModels,
  handleListAgents,
  handleGetAgent,
  handleCreateAgent,
  handleAgentRun,
  handleContinueAgentRun,
  handleListSessions,
  handleGetSession,
  handleListWorkflows,
  handleListMemories,
  handleListTraces,
  sendJSON,
} from "./handlers";

export class OpenAPIRouter {
  openApiSpec: Record<string, unknown> = {};
  paths: Record<string, Record<string, unknown>> = {};

  constructor(specPath?: string) {
    const defaultSpecPath = path.resolve(__dirname, "../data/openapi.json");
    const targetPath = specPath || defaultSpecPath;
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf-8");
      this.openApiSpec = JSON.parse(content);
      this.paths = (this.openApiSpec.paths as Record<string, Record<string, unknown>>) || {};
    }
  }

  // Convert openapi pattern e.g. /agents/{agent_id}/runs to regex pattern
  matchRoute(requestPath: string, method: string) {
    // Strip optional prefix e.g. /v1 or /api/proxy or /api/proxy/v1
    let cleanPath = requestPath.split("?")[0];
    cleanPath = cleanPath.replace(/^\/api\/proxy(\/v1)?/, "");
    cleanPath = cleanPath.replace(/^\/v1/, "");
    if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;

    const lowerMethod = method.toLowerCase();

    for (const [openApiPath, operations] of Object.entries(this.paths)) {
      const operation = operations[lowerMethod] as Record<string, unknown> | undefined;
      if (!operation) continue;

      // Replace {param} with regex matcher
      const paramNames: string[] = [];
      const regexPattern = openApiPath.replace(/\{([^}]+)\}/g, (_, paramName) => {
        paramNames.push(paramName);
        return "([^/]+)";
      });

      const fullRegex = new RegExp(`^${regexPattern}$`);
      const match = cleanPath.match(fullRegex);

      if (match) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, idx) => {
          params[name] = match[idx + 1];
        });

        return {
          openApiPath,
          params,
          operation,
        };
      }
    }

    return null;
  }

  generateMockFromSchema(schema: Record<string, unknown>): unknown {
    if (!schema) return { status: "success" };

    if (schema.$ref && typeof schema.$ref === "string") {
      const refPath = schema.$ref.replace("#/components/schemas/", "");
      const components = (this.openApiSpec.components as Record<string, unknown>)?.schemas as Record<string, unknown>;
      if (components && components[refPath]) {
        return this.generateMockFromSchema(components[refPath] as Record<string, unknown>);
      }
    }

    const type = schema.type;
    if (type === "array") {
      const items = schema.items as Record<string, unknown>;
      return [items ? this.generateMockFromSchema(items) : {}];
    }

    if (type === "object" || schema.properties) {
      const result: Record<string, unknown> = {};
      const props = (schema.properties as Record<string, Record<string, unknown>>) || {};
      for (const [key, propSchema] of Object.entries(props)) {
        result[key] = this.generateMockFromSchema(propSchema);
      }
      return result;
    }

    if (type === "string") return schema.default || schema.example || "simulated-string";
    if (type === "integer" || type === "number") return schema.default || schema.example || 1;
    if (type === "boolean") return schema.default !== undefined ? schema.default : true;

    return { status: "ok" };
  }

  async handleRequest(
    state: SimulatorState,
    req: IncomingMessage,
    res: ServerResponse,
    body: Record<string, unknown> = {}
  ) {
    const method = req.method || "GET";
    const rawUrl = req.url || "/";
    let cleanUrl = rawUrl.split("?")[0];
    cleanUrl = cleanUrl.replace(/^\/api\/proxy(\/v1)?/, "");
    cleanUrl = cleanUrl.replace(/^\/v1/, "");
    if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;

    // Exact Core System Routes
    if (cleanUrl === "/" || cleanUrl === "/health") {
      return handleHealth(req, res);
    }
    if (cleanUrl === "/info") {
      return handleInfo(req, res);
    }
    if (cleanUrl === "/config") {
      return handleConfig(req, res);
    }
    if (cleanUrl === "/models") {
      return handleModels(req, res);
    }

    // Exact Agents Routes
    if (cleanUrl === "/agents" && method === "GET") {
      return handleListAgents(state, req, res);
    }
    if (cleanUrl === "/agents" && method === "POST") {
      return handleCreateAgent(state, body, res);
    }

    // Agents Parameterized Routes & Playground
    if (cleanUrl === "/playground/agent/run" && method === "POST") {
      const agentId = (body.agent_id as string) || "default-agent";
      return handleAgentRun(state, agentId, body, res);
    }

    const agentContinueMatch = cleanUrl.match(/^\/agents\/([^/]+)\/runs\/([^/]+)\/continue$/);
    if (agentContinueMatch && method === "POST") {
      const agentId = agentContinueMatch[1];
      const runId = agentContinueMatch[2];
      return handleContinueAgentRun(state, agentId, runId, body, res);
    }

    const agentRunMatch = cleanUrl.match(/^\/agents\/([^/]+)\/runs$/);
    if (agentRunMatch && method === "POST") {
      const agentId = agentRunMatch[1];
      return handleAgentRun(state, agentId, body, res);
    }

    const teamRunMatch = cleanUrl.match(/^\/teams\/([^/]+)\/runs$/);
    if (teamRunMatch && method === "POST") {
      const teamId = teamRunMatch[1];
      return handleAgentRun(state, teamId, body, res);
    }

    const workflowRunMatch = cleanUrl.match(/^\/workflows\/([^/]+)\/runs$/);
    if (workflowRunMatch && method === "POST") {
      const workflowId = workflowRunMatch[1];
      return handleAgentRun(state, workflowId, body, res);
    }

    const agentGetMatch = cleanUrl.match(/^\/agents\/([^/]+)$/);
    if (agentGetMatch && method === "GET") {
      const agentId = agentGetMatch[1];
      return handleGetAgent(state, agentId, res);
    }

    // Sessions Routes
    if (cleanUrl === "/sessions" && method === "GET") {
      return handleListSessions(state, req, res);
    }
    const sessionGetMatch = cleanUrl.match(/^\/sessions\/([^/]+)$/);
    if (sessionGetMatch && method === "GET") {
      const sessionId = sessionGetMatch[1];
      return handleGetSession(state, sessionId, res);
    }

    // Workflows, Memories, Traces
    if (cleanUrl === "/workflows" && method === "GET") {
      return handleListWorkflows(state, req, res);
    }
    if (cleanUrl === "/memories" && method === "GET") {
      return handleListMemories(state, req, res);
    }
    if (cleanUrl === "/traces" && method === "GET") {
      return handleListTraces(state, req, res);
    }

    // Check OpenAPI spec matching
    const match = this.matchRoute(rawUrl, method);
    if (match) {
      const responses = (match.operation.responses as Record<string, Record<string, unknown>>) || {};
      const successResponse = responses["200"] || responses["201"] || responses["202"];
      if (successResponse) {
        const content = successResponse.content as Record<string, Record<string, unknown>> | undefined;
        const jsonSchema = content?.["application/json"]?.schema as Record<string, unknown> | undefined;

        const mockedData = jsonSchema ? this.generateMockFromSchema(jsonSchema) : { status: "simulated_success" };
        sendJSON(res, mockedData, 200);
        return;
      }
      sendJSON(res, { status: "simulated_success" }, 200);
      return;
    }

    // Fallback 404
    sendJSON(res, { detail: `Route ${method} ${cleanUrl} not found in OpenAPI spec` }, 404);
  }
}
