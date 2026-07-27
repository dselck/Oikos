import { describe, it, expect, vi, beforeEach } from "vitest";
import { clientToolEngine } from "../src/lib/client-tools";

describe("ClientToolEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have all expanded tools registered", () => {
    // Jira
    expect(clientToolEngine.hasTool("jira_get_issue")).toBe(true);
    expect(clientToolEngine.hasTool("jira_search_issues")).toBe(true);
    expect(clientToolEngine.hasTool("jira_create_issue")).toBe(true);
    expect(clientToolEngine.hasTool("jira_update_issue")).toBe(true);
    expect(clientToolEngine.hasTool("jira_add_comment")).toBe(true);
    expect(clientToolEngine.hasTool("jira_list_projects")).toBe(true);
    expect(clientToolEngine.hasTool("jira_assign_issue")).toBe(true);

    // Confluence
    expect(clientToolEngine.hasTool("confluence_search")).toBe(true);
    expect(clientToolEngine.hasTool("confluence_get_page")).toBe(true);
    expect(clientToolEngine.hasTool("confluence_create_page")).toBe(true);
    expect(clientToolEngine.hasTool("confluence_update_page")).toBe(true);
    expect(clientToolEngine.hasTool("confluence_list_spaces")).toBe(true);

    // GitLab
    expect(clientToolEngine.hasTool("gitlab_list_mrs")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_get_file")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_create_mr")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_get_issue")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_create_issue")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_list_branches")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_create_branch")).toBe(true);
    expect(clientToolEngine.hasTool("gitlab_get_commit")).toBe(true);

    // Generic
    expect(clientToolEngine.hasTool("generic_http_tool")).toBe(true);
  });

  it("should execute generic_http_tool over fetch", async () => {
    const mockData = { status: "custom_ok" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    });

    const res = await clientToolEngine.executeTool(
      "generic_http_tool",
      { url: "https://api.internal.corp/custom", method: "POST", body: { key: "value" } },
      { instanceId: "inst-1", agentId: "agent-1", toolCallId: "call-gen-1" }
    );

    expect(res.status).toBe("success");
    expect(res.output).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.internal.corp/custom",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should execute tool and generate continuation payload via executeAndContinue", async () => {
    const mockCommentRes = { id: "10001", body: "Looks good" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCommentRes,
    });

    const response = await clientToolEngine.executeAndContinue(
      {
        id: "call-comment-101",
        toolName: "jira_add_comment",
        arguments: { baseUrl: "https://jira.corp.internal", issue_key: "PROJ-101", comment: "Looks good" },
        status: "running",
        startTime: Date.now(),
      },
      { instanceId: "inst-1", agentId: "agent-1", toolCallId: "call-comment-101" }
    );

    expect(response.isClientHandled).toBe(true);
    expect(response.result?.status).toBe("success");
    expect(response.continuationPayload).toEqual({
      tool_call_id: "call-comment-101",
      output: mockCommentRes,
    });
  });

  it("should return isClientHandled: false for unregistered tool calls", async () => {
    const response = await clientToolEngine.executeAndContinue(
      {
        id: "unregistered-1",
        toolName: "unknown_server_tool",
        arguments: {},
        status: "running",
        startTime: Date.now(),
      },
      { instanceId: "inst-1", agentId: "agent-1", toolCallId: "unregistered-1" }
    );

    expect(response.isClientHandled).toBe(false);
  });

  it("should execute confluence_create_page handler over fetch", async () => {
    const mockPageRes = { id: "page-55", title: "New Design Doc" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPageRes,
    });

    const res = await clientToolEngine.executeTool(
      "confluence_create_page",
      { baseUrl: "https://confluence.corp.internal", spaceKey: "DOCS", title: "New Design Doc", bodyContent: "<p>Content</p>" },
      { instanceId: "inst-1", agentId: "agent-1", toolCallId: "call-page-1" }
    );

    expect(res.status).toBe("success");
    expect(res.output).toEqual(mockPageRes);
  });

  it("should sanitize control-plane headers in generic_http_tool context", async () => {
    const mockData = { ok: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    });

    await clientToolEngine.executeTool(
      "generic_http_tool",
      { url: "https://api.internal.corp/data", method: "GET" },
      {
        instanceId: "inst-1",
        agentId: "agent-1",
        toolCallId: "call-headers-1",
        headers: {
          "Authorization": "Bearer secret-agno-token",
          "x-agno-key": "agno-secret-123",
          "x-instance-id": "inst-123",
          "X-Custom-Client-Header": "AllowedHeaderValue",
        },
      }
    );

    const actualHeaders = (global.fetch as any).mock.calls[0][1].headers;
    expect(actualHeaders["Authorization"]).toBeUndefined();
    expect(actualHeaders["authorization"]).toBeUndefined();
    expect(actualHeaders["x-agno-key"]).toBeUndefined();
    expect(actualHeaders["x-instance-id"]).toBeUndefined();
  });
});
