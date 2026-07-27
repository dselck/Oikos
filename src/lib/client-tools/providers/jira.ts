import { ClientToolDefinition } from "../types";

export const jiraGetIssueTool: ClientToolDefinition = {
  name: "jira_get_issue",
  description: "Fetch details of a Jira issue by issue key (e.g. PROJ-123)",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of the Jira instance (e.g. https://jira.corp.internal)",
      },
      issue_key: {
        type: "string",
        description: "The Jira issue key (e.g. PROJ-123)",
      },
    },
    required: ["issue_key"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const issueKey = args.issue_key;

    if (!issueKey) {
      throw new Error("Missing required argument: issue_key");
    }

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Jira issue '${issueKey}' not found (404)`);
      }
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const jiraSearchIssuesTool: ClientToolDefinition = {
  name: "jira_search_issues",
  description: "Search Jira issues using JQL (Jira Query Language)",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of the Jira instance",
      },
      jql: {
        type: "string",
        description: "JQL query string (e.g. 'project = PROJ AND status = Open')",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of issues to return",
      },
    },
    required: ["jql"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const jql = args.jql;
    const maxResults = args.maxResults || 10;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira Search API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const jiraCreateIssueTool: ClientToolDefinition = {
  name: "jira_create_issue",
  description: "Create a new Jira issue",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of the Jira instance",
      },
      projectKey: {
        type: "string",
        description: "Project key (e.g. PROJ)",
      },
      summary: {
        type: "string",
        description: "Issue summary title",
      },
      issueType: {
        type: "string",
        description: "Issue type (e.g. Task, Bug, Story)",
      },
    },
    required: ["projectKey", "summary"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const { projectKey, summary, issueType = "Task" } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue`;
    const body = {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
      },
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira Create Issue API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const jiraUpdateIssueTool: ClientToolDefinition = {
  name: "jira_update_issue",
  description: "Update fields or summary of an existing Jira issue",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      issue_key: { type: "string" },
      summary: { type: "string" },
      description: { type: "string" },
    },
    required: ["issue_key"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const { issue_key, summary, description } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${encodeURIComponent(issue_key)}`;
    const fields: Record<string, any> = {};
    if (summary) fields.summary = summary;
    if (description) fields.description = description;

    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira Update Issue API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return { status: "updated", issue_key };
  },
};

export const jiraAddCommentTool: ClientToolDefinition = {
  name: "jira_add_comment",
  description: "Add a comment to a Jira issue",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      issue_key: { type: "string" },
      comment: { type: "string" },
    },
    required: ["issue_key", "comment"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const { issue_key, comment } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${encodeURIComponent(issue_key)}/comment`;
    const body = {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: comment }],
          },
        ],
      },
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira Add Comment API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const jiraListProjectsTool: ClientToolDefinition = {
  name: "jira_list_projects",
  description: "List all Jira projects accessible to the user",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
    },
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/project`;

    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira List Projects API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const jiraAssignIssueTool: ClientToolDefinition = {
  name: "jira_assign_issue",
  description: "Assign a Jira issue to a specific account or user",
  provider: "jira",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      issue_key: { type: "string" },
      accountId: { type: "string" },
    },
    required: ["issue_key", "accountId"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://jira.corp.internal";
    const { issue_key, accountId } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${encodeURIComponent(issue_key)}/assignee`;
    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify({ accountId }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Jira Assign Issue API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return { status: "assigned", issue_key, accountId };
  },
};
