import http, { IncomingMessage, ServerResponse } from "http";
import { SimulatorState } from "./handlers";
import { OpenAPIRouter } from "./router";
import { SimulatorOptions } from "./types";

export function createSimulatorApp() {
  const state = new SimulatorState();
  const router = new OpenAPIRouter();

  const requestListener = (req: IncomingMessage, res: ServerResponse) => {
    let bodyData = "";
    req.on("data", (chunk) => {
      bodyData += chunk;
    });

    req.on("end", () => {
      let parsedBody: Record<string, unknown> = {};
      if (bodyData.trim()) {
        try {
          parsedBody = JSON.parse(bodyData);
        } catch {
          parsedBody = { raw: bodyData };
        }
      }

      router.handleRequest(state, req, res, parsedBody).catch((err) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal Simulator Error", details: String(err) }));
      });
    });
  };

  return { state, router, requestListener };
}

export function startSimulator(options: SimulatorOptions = {}) {
  const port = options.port || 8000;
  const host = options.host || "127.0.0.1";
  const quiet = options.quiet ?? false;

  const { state, router, requestListener } = createSimulatorApp();
  const server = http.createServer(requestListener);

  return new Promise<{
    server: http.Server;
    port: number;
    state: SimulatorState;
    router: OpenAPIRouter;
    stop: () => Promise<void>;
  }>((resolve, reject) => {
    server.listen(port, host, () => {
      if (!quiet) {
        console.log(`AgentOS Simulator running at http://${host}:${port}`);
        console.log(`Loaded ${Object.keys(router.paths).length} OpenAPI paths from data/openapi.json`);
      }

      const stop = () =>
        new Promise<void>((resClose) => {
          server.close(() => resClose());
        });

      resolve({ server, port, state, router, stop });
    });

    server.on("error", reject);
  });
}

// CLI Execution Support
if (require.main === module || process.argv[1]?.endsWith("server.ts")) {
  const portArg = process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1];
  const port = portArg ? parseInt(portArg, 10) : parseInt(process.env.PORT || "8000", 10);

  startSimulator({ port })
    .then(({ port }) => {
      console.log(`Simulator ready to handle Oikos requests on port ${port}`);
    })
    .catch((err) => {
      console.error("Failed to start simulator:", err);
      process.exit(1);
    });
}
