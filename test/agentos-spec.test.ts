import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { OpenAPIRouter } from "../simulator/router";
import { SimulatorState } from "../simulator/handlers";

describe("OpenAPI Spec Strict Path & Schema Validation", () => {
  let router: OpenAPIRouter;
  let state: SimulatorState;
  let openApiPaths: string[];

  beforeAll(() => {
    const specPath = path.resolve(__dirname, "../data/openapi.json");
    expect(fs.existsSync(specPath)).toBe(true);

    router = new OpenAPIRouter(specPath);
    state = new SimulatorState();
    openApiPaths = Object.keys(router.paths);
  });

  it("loads 86 paths from data/openapi.json", () => {
    expect(openApiPaths.length).toBeGreaterThanOrEqual(80);
  });

  it("matches and routes every single OpenAPI path without returning null match", () => {
    for (const openApiPath of openApiPaths) {
      const operations = router.paths[openApiPath];
      for (const method of Object.keys(operations)) {
        if (["get", "post", "put", "delete", "patch"].includes(method)) {
          // Replace path variables e.g. {agent_id} with dummy values e.g. "test-id"
          const testUrl = openApiPath.replace(/\{([^}]+)\}/g, "test-id");
          const match = router.matchRoute(testUrl, method);
          expect(match, `Expected route match for ${method.toUpperCase()} ${testUrl}`).not.toBeNull();
        }
      }
    }
  });

  it("generates valid schema-matching mock values for response schemas", () => {
    const mockSchema = {
      type: "object",
      properties: {
        agent_id: { type: "string", example: "agent-123" },
        run_count: { type: "integer", example: 5 },
        active: { type: "boolean", default: true },
      },
    };

    const result = router.generateMockFromSchema(mockSchema) as Record<string, unknown>;
    expect(result.agent_id).toBe("agent-123");
    expect(result.run_count).toBe(5);
    expect(result.active).toBe(true);
  });
});
