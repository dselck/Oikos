import { ClientToolDefinition } from "../types";

export const gitlabListMRsTool: ClientToolDefinition = {
  name: "gitlab_list_mrs",
  description: "List Merge Requests for a GitLab project",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of GitLab instance",
      },
      project_id: {
        type: "string",
        description: "GitLab Project ID or URL-encoded path (e.g. 'group/project')",
      },
      state: {
        type: "string",
        description: "State of MRs (opened, closed, merged, all)",
      },
    },
    required: ["project_id"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const projectId = args.project_id;
    const state = args.state || "opened";

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests?state=${state}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab List MRs API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabGetFileTool: ClientToolDefinition = {
  name: "gitlab_get_file",
  description: "Fetch a raw file from a GitLab project repository",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of GitLab instance",
      },
      project_id: {
        type: "string",
        description: "GitLab Project ID or URL-encoded path",
      },
      file_path: {
        type: "string",
        description: "Path to file in repo (e.g. 'src/index.ts')",
      },
      ref: {
        type: "string",
        description: "Branch or commit ref (default: main)",
      },
    },
    required: ["project_id", "file_path"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id, file_path, ref = "main" } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/repository/files/${encodeURIComponent(file_path)}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab Get File API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabCreateMRTool: ClientToolDefinition = {
  name: "gitlab_create_mr",
  description: "Create a Merge Request in a GitLab project",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of GitLab instance",
      },
      project_id: {
        type: "string",
        description: "GitLab Project ID or URL-encoded path",
      },
      source_branch: {
        type: "string",
        description: "Source feature branch",
      },
      target_branch: {
        type: "string",
        description: "Target branch (e.g. main)",
      },
      title: {
        type: "string",
        description: "Title of Merge Request",
      },
    },
    required: ["project_id", "source_branch", "target_branch", "title"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id, source_branch, target_branch, title } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/merge_requests`;
    const body = {
      source_branch,
      target_branch,
      title,
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
      throw new Error(`GitLab Create MR API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabGetIssueTool: ClientToolDefinition = {
  name: "gitlab_get_issue",
  description: "Fetch a specific GitLab issue details",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      project_id: { type: "string" },
      issue_iid: { type: "number" },
    },
    required: ["project_id", "issue_iid"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id, issue_iid } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/issues/${issue_iid}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab Get Issue API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabCreateIssueTool: ClientToolDefinition = {
  name: "gitlab_create_issue",
  description: "Create a new issue in a GitLab project",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      project_id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
    },
    required: ["project_id", "title"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id, title, description } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/issues`;
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify({ title, description }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab Create Issue API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabListBranchesTool: ClientToolDefinition = {
  name: "gitlab_list_branches",
  description: "List branches in a GitLab project repository",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      project_id: { type: "string" },
    },
    required: ["project_id"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/repository/branches`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab List Branches API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabCreateBranchTool: ClientToolDefinition = {
  name: "gitlab_create_branch",
  description: "Create a new branch in a GitLab project repository",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      project_id: { type: "string" },
      branch: { type: "string" },
      ref: { type: "string" },
    },
    required: ["project_id", "branch", "ref"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id, branch, ref } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/repository/branches`;
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify({ branch, ref }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab Create Branch API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const gitlabGetCommitTool: ClientToolDefinition = {
  name: "gitlab_get_commit",
  description: "Fetch commit details and diff for a specific commit SHA",
  provider: "gitlab",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      project_id: { type: "string" },
      sha: { type: "string" },
    },
    required: ["project_id", "sha"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://gitlab.corp.internal";
    const { project_id, sha } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(project_id)}/repository/commits/${encodeURIComponent(sha)}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`GitLab Get Commit API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};
