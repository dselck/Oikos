import { ClientToolDefinition } from "../types";

export const confluenceSearchTool: ClientToolDefinition = {
  name: "confluence_search",
  description: "Search Confluence pages using CQL (Confluence Query Language)",
  provider: "confluence",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of Confluence instance",
      },
      cql: {
        type: "string",
        description: "CQL search query (e.g. 'siteSearch ~ \"architecture\"')",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
    },
    required: ["cql"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://confluence.corp.internal";
    const cql = args.cql;
    const limit = args.limit || 10;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Confluence Search API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const confluenceGetPageTool: ClientToolDefinition = {
  name: "confluence_get_page",
  description: "Fetch content of a specific Confluence page by ID",
  provider: "confluence",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Base URL of Confluence instance",
      },
      page_id: {
        type: "string",
        description: "Confluence Page ID",
      },
    },
    required: ["page_id"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://confluence.corp.internal";
    const pageId = args.page_id;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/content/${encodeURIComponent(pageId)}?expand=body.storage,version`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Confluence Get Page API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const confluenceCreatePageTool: ClientToolDefinition = {
  name: "confluence_create_page",
  description: "Create a new Confluence documentation page in a space",
  provider: "confluence",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      spaceKey: { type: "string" },
      title: { type: "string" },
      bodyContent: { type: "string" },
    },
    required: ["spaceKey", "title", "bodyContent"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://confluence.corp.internal";
    const { spaceKey, title, bodyContent } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/content`;
    const body = {
      type: "page",
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: bodyContent,
          representation: "storage",
        },
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
      throw new Error(`Confluence Create Page API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const confluenceUpdatePageTool: ClientToolDefinition = {
  name: "confluence_update_page",
  description: "Update an existing Confluence page content or title",
  provider: "confluence",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      page_id: { type: "string" },
      title: { type: "string" },
      bodyContent: { type: "string" },
      version: { type: "number" },
    },
    required: ["page_id", "title", "bodyContent", "version"],
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://confluence.corp.internal";
    const { page_id, title, bodyContent, version } = args;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/content/${encodeURIComponent(page_id)}`;
    const body = {
      type: "page",
      title,
      version: { number: version + 1 },
      body: {
        storage: {
          value: bodyContent,
          representation: "storage",
        },
      },
    };

    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...context.headers,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Confluence Update Page API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};

export const confluenceListSpacesTool: ClientToolDefinition = {
  name: "confluence_list_spaces",
  description: "List available spaces in Confluence",
  provider: "confluence",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string" },
      limit: { type: "number" },
    },
  },
  handler: async (args, context) => {
    const baseUrl = args.baseUrl || "https://confluence.corp.internal";
    const limit = args.limit || 25;

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/rest/api/space?limit=${limit}`;
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...context.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Confluence List Spaces API returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return await res.json();
  },
};
