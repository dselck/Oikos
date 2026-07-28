# Oikos

Oikos is an open-source web frontend for Agno AgentOS, providing a user interface for interacting with, orchestrating, and monitoring AI agents, agent teams, and workflows.

## Language

**AgentOS**:
The backend runtime and API platform (Agno AgentOS) that executes agents, teams, workflows, and manages state, session storage, and memory.
_Avoid_: Backend server, Agno Backend, AI Engine

**Agent**:
An autonomous AI entity managed by AgentOS that processes inputs, executes tools, and returns responses.
_Avoid_: Bot, AI worker, Assistant

**Workflow**:
A multi-step, deterministic or autonomous execution flow connecting agents, tools, and programmatic tasks within AgentOS.
_Avoid_: Pipeline, Chain, Process

**Playground**:
The interactive user interface mode for real-time conversation, multi-modal input, tool-call visualization, and message streaming with Agents.
_Avoid_: Chat window, Interaction view

**Control Plane**:
The administrative interface mode for managing AgentOS connections, reviewing telemetry, inspecting execution traces, and configuring Agent teams.
_Avoid_: Admin panel, Dashboard

**Session**:
A stateful conversation thread between a user and an Agent or Workflow maintained in AgentOS.
_Avoid_: Thread, Chat log

**Session Memory Engine**:
The deep module class in `src/lib/session-engine.ts` (`SessionMemoryEngine`) that encapsulates session transcript fetching from `AgentOS Client`, user memory context extraction, response payload normalization into standard `ChatMessage` domain models, instance-scoped session state caching, and session cache eviction (`evictSession`).
_Avoid_: Session memory hook, History reader, Message list fetcher

**Instance Config**:
The server-managed settings defining target AgentOS endpoints, API authentication tokens, and default connections for Oikos.
_Avoid_: Connection string, Server settings

**Trace Inspector**:
A slide-over panel displaying raw execution traces, tool call parameters, HTTP/SSE payloads, and telemetry for a specific agent step.
_Avoid_: Log viewer, Trace drawer

**Tool Execution Tree**:
An inline collapsible hierarchy representing step-by-step tool invocations and sub-agent delegations during a session run.
_Avoid_: Tool log list, Function call list

**AgentOS Workspace**:
The project filesystem structure (containing `agents/`, `teams/`, `workflows/`, `run.py`, and `.env`) mounted into an AgentOS Docker/local runtime.
_Avoid_: Code directory, Project folder

**Workspace Authoring**:
The capability in Oikos to inspect, create, edit, and hot-reload Agent, Team, and Workflow code/configurations directly within an AgentOS Workspace.
_Avoid_: Code editing, Config editor

**Database-Driven Registry**:
Storing Agent, Team, Workflow, and Tool definitions directly in the AgentOS database schema managed via the AgentOS REST API proxied through `/api/proxy/v1/...`, allowing dynamic hydration and versioning of Agno objects at runtime without filesystem writes or server restarts.
_Avoid_: Static file config, File-based registry, Local registry routes

**Knowledge Base (RAG)**:
A vector database index and document store attached to an Agent to supply semantic search and retrieval context during runs.
_Avoid_: Document folder, Vector store

**RAG Document Indexing Engine**:
The deep module class in `src/lib/rag-engine.ts` (`RagIndexingEngine`) and `useAgentOSRegistry` (`indexDocument`, `indexUrl`) that encapsulates document and URL ingestion, format auto-detection, reader strategy resolution (`MarkdownReader`, `WebsiteReader`, `PDFReader`, `TextReader`), chunking default derivation (`recursive`, size, overlap), vector DB embedding execution, and ingestion telemetry.
_Avoid_: Document embedder, Chunking hook, File uploader

**Workflow Studio**:
The interface in Oikos to visually create, edit, step-trace, and manage DB-driven deterministic workflows and agent pipelines.
_Avoid_: Flow builder, Pipeline editor

**Session Stream Engine**:
The deep module in Oikos that encapsulates Server-Sent Events (SSE) stream decoding, session lifecycle, tool execution state transitions, run continuations, and trace event buffering across Agents, Teams, and Workflows. Its external seam is the `SessionStreamSink` interface — a set of callbacks (`onMessageAdd`, `onMessageUpdate`, `onStateChange`) through which it reports all state changes to callers. The engine has no dependency on Zustand or React; `useSessionStream` is the sole adapter that bridges the sink and active instance/entity context to the UI store.
_Avoid_: SSE hook, Stream listener, Chat runner

**AgentOS Client**:
The deep module interface in Oikos that encapsulates all HTTP REST requests, SSE stream initialization, health checking, and proxy routing to connected AgentOS instances.
_Avoid_: Fetch helper, Proxy wrapper, API utils

**AgentOS Registry Engine**:
The deep module in Oikos (`src/hooks/useAgentOSRegistry.ts` / `src/lib/agentos-registry.ts`) that encapsulates headless entity hydration into state sinks via `RegistryStateSink` (`ZustandRegistrySink`, `MemoryRegistrySink`), entity record normalization, JSON payload stringification, and domain-level mutations (`saveAgent`, `saveTeam`, `saveWorkflow`, `saveKnowledgeBase`, `deleteEntity`) across runtime AgentOS entities.
_Avoid_: Entity fetcher, Registry helper, Studio store

**Client Tool Engine**:
The deep module in Oikos (`src/lib/client-tools`) that encapsulates client-side tool registration, execution timing, security header sanitization, fallback routing (e.g. `generic_http_tool`), and run continuation payload construction for AgentOS sessions.
_Avoid_: Tool adapter, Client tool wrapper, Function executor

**Oikos Auth Engine**:
The deep module in Oikos that encapsulates local authentication (username/password credentials & OAuth/OIDC providers), session cookie management, and user identity persistence in the Oikos database schema (`src/db/schema.ts`).
_Avoid_: Login helper, Auth hook, User store

**Proxy Identity Seam**:
The server-side security boundary in `src/app/api/proxy/[...path]/route.ts` that validates incoming authenticated Oikos user sessions, enforces role-based endpoint permissions, and injects/overrides the verified `user_id` into outbound request JSON bodies and query parameters sent to AgentOS.
_Avoid_: Proxy filter, Header wrapper, Request interceptor

**Oikos User Role**:
The authorization scope assigned to an Oikos user account — strictly partitioned into `Admin` (full system configuration, instance management, registry authoring, user administration, and global session access) and `Member` (scoped to Playground interaction, self-owned session filtering, and self-owned memory management).
_Avoid_: Access level, Permission flag, User type
