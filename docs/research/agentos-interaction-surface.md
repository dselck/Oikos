# Agno AgentOS Interaction Surface

## Overview
Agno AgentOS (formerly Phidata AgentOS) is a specialized, production-ready runtime built on **FastAPI**. It is designed to deploy AI agents as scalable, RESTful services, complete with session persistence, telemetry, tracing, and multi-tenancy.

This document outlines the complete interaction surface exposed by a default AgentOS instance, including REST/WebSocket APIs, the event streaming protocol, memory management, agent/team registry, and telemetry interfaces.

## 1. REST & WebSocket/SSE API Endpoints

Because AgentOS is built on FastAPI, it automatically generates an OpenAPI (Swagger) specification (typically available at `/docs` or `/openapi.json`). 

### Core Endpoints

*   **`GET /docs` & `GET /openapi.json`**
    *   **Description**: Auto-generated interactive API documentation and schema.
*   **`POST /v1/agents/{agent_id}/run` (or `/chat`)**
    *   **Description**: Initiates a synchronous run or chat with a specific agent.
    *   **Request Schema**: JSON containing `message` (string or array of messages), `session_id` (optional, for state continuation), and optional configuration overrides (e.g., model parameters).
    *   **Response Schema**: JSON containing the agent's final response, token usage, and execution metadata.
*   **`GET /v1/agents/{agent_id}/stream`**
    *   **Description**: Establishes an SSE (Server-Sent Events) connection for real-time streaming of an agent's run.
    *   **Protocol**: SSE via HTTP.
*   **`WS /v1/agents/{agent_id}/ws`**
    *   **Description**: WebSocket endpoint for bidirectional real-time communication. Used for continuous chat sessions where both the client and server send asynchronous messages.
*   **`GET /v1/health`**
    *   **Description**: Health check endpoint for container orchestrators (e.g., Kubernetes).

### Event Streaming Protocol (AG-UI)

AgentOS uses the AG-UI (Agent-User Interaction) protocol to standardize how real-time events are streamed (over SSE or WebSockets). 

**Common SSE Event Names and Payloads:**
*   **`event: text_delta`**: Streams chunks of the LLM's text response. Payload contains the string chunk.
*   **`event: tool_call_start`**: Indicates the agent decided to invoke a tool. Payload includes `tool_name` and `arguments`.
*   **`event: tool_call_end`**: Indicates tool completion. Payload includes `result` or `error`.
*   **`event: run_status`**: Provides status deltas (e.g., `running`, `processing_tool`, `completed`).
*   **`event: error`**: Emitted if the run fails mid-stream.

## 2. Session, Memory, and State Management Interfaces

AgentOS abstracts state via its `BaseDb` interface.

*   **Session Management**: Each interaction can be bound to a `session_id`. When an agent is initialized with `add_history_to_context=True`, AgentOS automatically queries the underlying DB to retrieve past messages and tool calls for that session.
*   **Database Implementations**: 
    *   `PostgresDb`: Production standard, supports `PgVector` for RAG/hybrid search.
    *   `SqliteDb`: For edge/local deployments.
    *   `InMemoryDb`: Ephemeral state.
*   **Memory Interfaces**: The framework provides internal APIs for the agent to read/write short-term memory (conversation history) and long-term memory (semantic summaries or user profiles) via the attached storage instance.

## 3. Agent, Team, and Workflow Management Interfaces

AgentOS acts as the central registry and control plane for deployed logic.

*   **Registry**: Agents and Teams are instantiated and registered within the `AgentOS` app configuration. 
    ```python
    agent_os = AgentOS(agents=[agent1, agent2], teams=[team1])
    ```
*   **Dynamic Instantiation**: The AgentOS registry maps incoming requests (e.g., to `/v1/agents/{agent_id}/run`) to the correct agent definition, dynamically injecting the required database connections and tool scopes.
*   **MCP Integration**: AgentOS supports the Model Context Protocol (MCP) as a transport layer to dynamically connect agents to external tools/data at runtime.

## 4. Telemetry, Tracing, and Monitoring Interfaces

AgentOS includes built-in observability out of the box.

*   **Tracing Instrumentation**: Uses OpenTelemetry (`AgnoInstrumentor`) to automatically create trace spans for:
    *   Agent/Workflow initialization.
    *   LLM API calls (tracking latency, token usage, and cost).
    *   Tool executions.
*   **Integrations**: The telemetry surface seamlessly exports to OpenInference-compatible platforms:
    *   Arize Phoenix
    *   LangWatch
    *   OpenLIT
    *   Langfuse
*   **Control Plane Telemetry**: Traces and metrics are streamed back to the Agno Control Plane (or local DB if `setup_tracing(db=...)` is used), where developers can visualize the trace trees.
*   **Usage Telemetry**: Agno collects anonymous usage telemetry by default. This can be controlled via the `AGNO_TELEMETRY=false` environment variable or the `telemetry=False` argument on the `AgentOS` instance.
