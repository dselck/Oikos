# AgentOS API as Single Source of Truth for Runtime Entities

Oikos designates the connected **Agno AgentOS instance API** as the single source of truth for all runtime entities, including Agents, Teams, Workflows, Knowledge Bases (RAG), and Sessions. 

*This ADR supersedes [ADR-0004: Database-Driven Agent Registry and Dynamic Hydration](0004-database-driven-agent-registry.md).*

## Context & Decision

Previously, Oikos defined local SQLite tables (`agno_agents`, `agno_teams`, `agno_workflows`, `agno_knowledge_bases`) in `src/db/schema.ts`. Storing agent and team definitions in Oikos's isolated local database created an architectural disconnect: the actual Agno AgentOS instance running in Python/Docker had no visibility into or access to entities created inside Oikos.

To fix this disconnect and ensure absolute runtime consistency:

1. **AgentOS Ownership**: AgentOS is the authoritative owner and execution engine for all runtime entities. Oikos will fetch, create, update, and invoke entities directly via AgentOS API endpoints (or proxy routes).
2. **Local Storage Scope**: Oikos's embedded SQLite database (`data/oikos.db`) is strictly limited to **Instance Configurations** (saved `AGENTOS_URL` endpoints, API keys, proxy headers) and local user UI preferences.
3. **Frontend Role**: Oikos operates purely as a Control Plane and Playground UI, interacting with AgentOS statelessly via REST/SSE streaming endpoints.
