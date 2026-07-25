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
Storing Agent, Team, and Workflow definitions directly in a database (PostgreSQL/SQLite) allowing dynamic hydration of Agno objects at runtime without filesystem writes.
_Avoid_: Static file config, File-based registry

**Knowledge Base (RAG)**:
A vector database index and document store attached to an Agent to supply semantic search and retrieval context during runs.
_Avoid_: Document folder, Vector store

**Workflow Studio**:
The interface in Oikos to visually create, edit, step-trace, and manage DB-driven deterministic workflows and agent pipelines.
_Avoid_: Flow builder, Pipeline editor
