# ADR-0007: AgentOS Components & Registry Authoring Architecture

## Status
Accepted

## Context
In Agno AgentOS, runtime entities (Agents, Teams, Workflows, Tools, Models, Knowledge Bases) are exposed via a dual API architecture:
1. **Discovery & Run Endpoints (`/agents`, `/teams`, `/workflows`)**: Read-only endpoints for listing available entities and executing runs (streaming SSE or synchronous JSON responses).
2. **Dynamic Component & Registry Endpoints (`/components`, `/registry`)**: Database-driven CRUD and configuration versioning API.

## Decisions

### 1. Read-Only Discovery vs. Dynamic Component Authoring
- Top-level endpoints (`GET /agents`, `GET /teams`, `GET /workflows`) are read-only discovery routes used by Oikos to populate selection lists and execute runs.
- All dynamic entity creation, configuration editing, and version promotion are performed via `/components`:
  - `POST /components`: Create component definition (`component_type`: `'agent'`, `'team'`, or `'workflow'`).
  - `POST /components/{component_id}/configs` / `PATCH /components/{component_id}/configs/{version}`: Create/update configuration versions.
  - `POST /components/{component_id}/configs/{version}/set-current`: Promote a configuration version to current active runtime state.

### 2. Skill & Tool Registration Architecture
- **Skills and Tools** (Custom Functions, RAG Knowledge Bases, MCP Servers, Models, Memory Managers) are registered in the AgentOS **Registry (`/registry`)** under resource types: `tool`, `function`, `knowledge`, `model`, `db`, `memory_manager`.
- Agents and Teams reference registered tools and skills inside their `/components` configuration payload (`config.tools`, `config.knowledge`).
- **Declarative Tools**: Tools do not always require custom Python code. AgentOS supports declarative component configs for:
  - **REST / Webhooks**: Target URL, HTTP headers, request body templates via generic `RESTTool`.
  - **MCP Servers**: Remote MCP endpoint URLs auto-discovered via Model Context Protocol (`mcp_server=True`).
  - **Sandboxed Python Code**: Executable Python code strings stored in DB records and executed via isolated code interpreters (`PythonTools`).

### 3. Local Mock AgentOS Simulator
- Oikos maintains a zero-dependency TypeScript Node simulator (`simulator/server.ts` / `npm run simulator`) backed by `data/openapi.json` (86 paths).
- The simulator mimics stateful `/components`, `/registry`, `/agents`, `/teams`, `/workflows`, and SSE stream runs (`/agents/{agent_id}/runs` & `/playground/agent/run`) for offline development and automated testing with Vitest.

## Consequences
- **Single Source of Truth**: All dynamic component changes take effect in the AgentOS DB registry immediately without requiring server restarts or file watcher polling.
- **Frontend Independence**: Oikos UI frontends (Playground, Control Plane, Studio) can query, configure, and connect tools and agents statelessly via standard REST/SSE endpoints.
