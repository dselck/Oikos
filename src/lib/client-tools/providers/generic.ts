import { ClientToolDefinition } from "../types";

export const genericHTTPTool: ClientToolDefinition = {
  name: "generic_http_tool",
  description: "Execute arbitrary HTTP request client-side over mTLS for custom AgentOS components",
  provider: "custom",
  executionLocation: "client",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Target URL (e.g. https://api.internal.corp/v1/resource)",
      },
      method: {
        type: "string",
        description: "HTTP Method (GET, POST, PUT, DELETE, PATCH)",
      },
      headers: {
        type: "object",
        description: "Optional custom HTTP headers",
      },
      body: {
        type: "object",
        description: "Optional request body JSON object",
      },
    },
    required: ["url", "method"],
  },
  handler: async (args, context) => {
    const { url, method = "GET", headers = {}, body } = args;

    if (!url) {
      throw new Error("Missing required argument 'url' for generic_http_tool");
    }

    // Sanitize context.headers to avoid leaking control-plane keys (e.g. Authorization, x-agno-key)
    const safeContextHeaders: Record<string, string> = {};
    if (context.headers) {
      for (const [key, value] of Object.entries(context.headers)) {
        const lower = key.toLowerCase();
        if (!lower.startsWith("x-agno-") && lower !== "authorization" && lower !== "x-instance-id") {
          safeContextHeaders[key] = value;
        }
      }
    }

    const requestOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        Accept: "application/json",
        ...safeContextHeaders,
        ...headers,
      },
    };

    if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      requestOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      (requestOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    const res = await fetch(url, requestOptions);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Generic HTTP tool returned status ${res.status}: ${errText || res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  },
};
