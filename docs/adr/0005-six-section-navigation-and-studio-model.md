# 6-Section Navigation & Authoring Studio Model

Oikos is structured into 6 primary navigation sections to support full-lifecycle authoring, management, and interaction with Agno AgentOS instances.

## Context & Decision
To support complete control over Agno AgentOS without leaving Oikos, the application interface is organized into 6 core studios:

1. **Playground**: Real-time chat streaming, inline Tool Execution Trees, and slide-over Trace Inspector.
2. **Agent & Team Studio**: Visual creator and editor for Agents and Teams backed by the Database Registry (`agent.save()`).
3. **Workflow Studio**: Builder for DB-driven deterministic Workflows and step pipelines.
4. **Knowledge & Documents**: RAG document indexing, vector store management (`PgVector`, Qdrant), and Knowledge Base attachments.
5. **Sessions & Memory**: History logs, user memories, and session state inspection.
6. **Control Plane**: AgentOS server instance management, API credentials, and telemetry.
