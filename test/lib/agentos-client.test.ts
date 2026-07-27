import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpAgentOSClient } from "../../src/lib/agentos-client";

describe("HttpAgentOSClient user_id serialization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("includes user_id in run stream JSON payload when provided in options", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    });
    global.fetch = fetchMock;

    const client = new HttpAgentOSClient({ baseUrl: "http://localhost:8000" });
    await client.runs.stream({
      entityId: "agent-123",
      message: "Hello world",
      userId: "user_456",
    });

    expect(fetchMock).toHaveBeenCalled();
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/agents/agent-123/runs");
    const bodyJson = JSON.parse(requestInit.body as string);
    expect(bodyJson).toHaveProperty("user_id", "user_456");
  });

  it("appends user_id query parameter when listing sessions with userId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = fetchMock;

    const client = new HttpAgentOSClient({ baseUrl: "http://localhost:8000" });
    await client.sessions.list("user_456");

    expect(fetchMock).toHaveBeenCalled();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/sessions?user_id=user_456");
  });
});
