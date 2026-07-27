import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startSimulator } from "../simulator/server";
import http from "http";

describe("AgentOS Simulator Core Functionality", () => {
  let simulator: Awaited<ReturnType<typeof startSimulator>>;
  let baseUrl: string;

  beforeAll(async () => {
    simulator = await startSimulator({ port: 8990, quiet: true });
    baseUrl = `http://127.0.0.1:${simulator.port}`;
  });

  afterAll(async () => {
    await simulator.stop();
  });

  function makeRequest(path: string, options: http.RequestOptions = {}, body?: unknown): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: unknown }> {
    return new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}${path}`, options, (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let parsed: unknown = rawData;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            // retain raw string if not JSON
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, data: parsed });
        });
      });

      req.on("error", reject);

      if (body) {
        req.setHeader("Content-Type", "application/json");
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  it("returns 200 OK for /health endpoint", async () => {
    const res = await makeRequest("/health");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("status", "healthy");
  });

  it("returns 200 OK for /info and /config", async () => {
    const infoRes = await makeRequest("/info");
    expect(infoRes.status).toBe(200);
    expect(infoRes.data).toHaveProperty("name", "Agno AgentOS Simulator");

    const configRes = await makeRequest("/config");
    expect(configRes.status).toBe(200);
    expect(configRes.data).toHaveProperty("mcp_enabled", true);
  });

  it("lists default agents", async () => {
    const res = await makeRequest("/agents");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    const agents = res.data as Array<{ id: string }>;
    expect(agents.some((a) => a.id === "agent-builder")).toBe(true);
  });

  it("creates a new agent dynamically", async () => {
    const newAgent = {
      name: "Test Agent",
      description: "Simulator Test Agent",
      model: "gpt-4o",
    };
    const res = await makeRequest("/agents", { method: "POST" }, newAgent);
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("name", "Test Agent");
  });

  it("handles agent run with SSE streaming", async () => {
    const runBody = {
      message: "Hello test stream",
      stream: true,
    };

    const res = await makeRequest("/agents/agent-builder/runs", { method: "POST" }, runBody);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(typeof res.data).toBe("string");
    const rawEvents = res.data as string;
    expect(rawEvents).toContain("RunStarted");
    expect(rawEvents).toContain("RunResponse");
    expect(rawEvents).toContain("[DONE]");
  });
});
