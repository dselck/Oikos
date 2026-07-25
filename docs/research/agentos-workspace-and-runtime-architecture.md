# Agno AgentOS Workspace & Runtime Architecture

This document presents comprehensive research into the Agno AgentOS (formerly Phidata AgentOS) framework, specifically focusing on its Docker deployment structure, Python object definitions, tool/MCP integrations, and the official control plane feature set. The information is drawn from primary sources such as the official documentation (`docs.agno.com`), the `agno-agi/agno` and `agentos-docker-template` GitHub repositories, and associated schemas.

---

## 1. Docker Architecture & Template Structure

Agno provides standard templates for deploying AgentOS using Docker (`agentos-docker-template` or `ag infra create --template agent-infra-docker`). The goal is to provide a unified, reproducible backend for agent operations.

### Component Layout
1. **API Service (FastAPI / Uvicorn)**
   - **Role:** Exposes agents, teams, and workflows as REST endpoints and SSE (Server-Sent Events) streams for real-time inference.
   - **Hot-Reloading:** During development, the service runs via Uvicorn with the `--reload` flag enabled. The Docker volumes map local directories (like `agents/`, `teams/`, `workflows/`, and `tools/`) into the container. Any file modification triggers Uvicorn to restart the application, allowing for rapid iteration on prompts or tool logic without rebuilding the container.
2. **Persistence Layer (PostgreSQL)**
   - **Role:** Typically, a `postgres` container (often augmented with `pgvector` for RAG capabilities) is included in the `docker-compose.yml`.
   - **Usage:** It stores session history, long-term memory, knowledge bases, evaluation results, and trace logs.
3. **Environment & Network**
   - **`.env` Configuration:** A `.env` file handles injection of API keys (e.g., `OPENAI_API_KEY`) and database connection URIs. Docker Compose passes these via the `environment` directive.
   - **Ports:** The FastAPI service usually maps port `8000` to the host, while PostgreSQL maps port `5432`.

### Initialization
When executing `docker compose up -d --build`, the `Dockerfile` installs dependencies (such as the `agno` package and required LLM SDKs) and sets up the entry point to the FastAPI server, effectively launching the AgentOS platform securely and statelessly.

---

## 2. Python Object Models & Construction

At its core, Agno relies on primitive Python classes to construct the execution graphs.

### a) Agent
The fundamental executor.
* **Schema/Parameters:**
  * `name` (str): Identifier.
  * `model` (Model): The underlying LLM (e.g., `OpenAIChat`).
  * `instructions` (str | List[str]): Operational directives.
  * `system_prompt` (str): Low-level system instructions.
  * `tools` (List[Callable | Tool]): Available functions.
  * `memory` (Memory): Short-term context/session management.
  * `storage` (Storage): Persistent session storage (e.g., DbSessionStorage).
  * `knowledge` (KnowledgeBase): Connected vector store for RAG.
  * `show_tool_calls` (bool): If true, renders intermediate tool steps.

### b) Team
A coordinated group of `Agent` objects.
* **Schema/Parameters:**
  * `leader_agent` / `team_leader` (Agent): The primary agent responsible for delegation and synthesis.
  * `members` (List[Agent]): Sub-agents with specialized tools or instructions.
  * `execution_mode` / `strategy`: How tasks are delegated (e.g., hierarchical, autonomous).
  * `instructions` (str): Guidelines on how the team should collaborate.
  * `shared_memory` (bool/Memory): Ensures context is synchronized across the entire team.

### c) Workflow
A mechanism for controlled, deterministic orchestration.
* **Schema/Parameters:**
  * `name` (str): Workflow identifier.
  * `steps` (List[Agent | Team | Callable]): Sequential or parallel steps. Each step executes deterministically.
  * `session_state` (dict): Shared variables maintained across the pipeline.
* **Usage:** Best for repeatable pipelines or assembly-line tasks where strict control flow is needed over autonomous delegation.

### d) AgentOS Initialization
To expose these primitives via the API, they are registered with the `AgentOS` application class:
```python
from agno.agentos import AgentOS

app = AgentOS(
    agents=[researcher_agent, writer_agent],
    teams=[content_team],
    workflows=[publishing_workflow]
)
```
This registration binds them to specific REST routes and WebSocket/SSE endpoints for streaming generation.

---

## 3. Tool, MCP, and Storage Systems

### Custom Tools
Tools are pure Python functions wrapped or directly passed to the `tools` list. Agno parses type hints and docstrings into JSON schemas expected by the LLM tool-calling APIs.

### MCP (Model Context Protocol) Servers
AgentOS supports MCP to connect to standardized external data sources and tools. MCP servers run as independent processes or containers. AgentOS connects to them via standard protocols, translating the MCP specification into executable tools available to the `Agent`.

### Storage and Databases
* **Session Storage:** Implemented using classes like `PgMemoryDb` or `SqlAlchemyStorage`. The database URI is sourced from the `.env` file. These systems serialize messages and tool histories to maintain multi-turn context.
* **Vector DBs (Knowledge):** Tools like `PgVector` or `Qdrant` are integrated by instantiating a `KnowledgeBase` object linked to a vector database connection. This knowledge is attached to the `knowledge` parameter of an Agent, which handles chunking, embedding, and semantic search internally.

---

## 4. Official Agno UI / Control Plane Feature Set

The AgentOS UI (accessible locally or via `os.agno.com`) acts as a comprehensive control plane connected directly to the AgentOS backend.

### Key Features
1. **Playground / Chat Interface:** A rich UI to interact with your agents, teams, and workflows in real-time, displaying streaming text and markdown formatting.
2. **Session Management:** View, resume, or delete historical multi-turn sessions stored in the connected PostgreSQL database.
3. **Trace Inspector / Observability:** A detailed view of execution graphs, showing the exact latency, token usage, tool invocations, and reasoning steps (like tool inputs/outputs and internal sub-agent delegation).
4. **Evaluations:** Tools to score and monitor agent performance against predefined metrics.
5. **Workspace Management:** Configuration views to manage environment variables, connected MCP servers, and active knowledge bases.

---
**References:**
* Agno Documentation: [docs.agno.com](https://docs.agno.com)
* Agno GitHub Repository: [github.com/agno-agi/agno](https://github.com/agno-agi/agno)
* AgentOS Docker Template: [github.com/agno-agi/agentos-docker-template](https://github.com/agno-agi/agentos-docker-template)
