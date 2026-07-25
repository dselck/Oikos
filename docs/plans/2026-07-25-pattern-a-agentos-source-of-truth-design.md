# Design Spec: Pattern A — AgentOS API as Single Source of Truth

**Date:** 2026-07-25  
**Architectural Decision:** Replaces local SQLite entity tables with stateless API proxy operations directed to the connected Agno AgentOS instance API ([ADR-0006](file:///Users/dselck/Documents/Oikos/docs/adr/0006-agentos-api-as-single-source-of-truth.md)).

---

## 1. Goal & Objectives

Refactor Oikos to treat the active Agno AgentOS instance API as the sole authoritative source of truth for Agents, Teams, Workflows, Knowledge Bases, and Sessions.

- **Eliminate Disconnects**: Remove duplicate local entity tables in Oikos's SQLite database so entity state never drifts from AgentOS.
- **Stateless Proxy Architecture**: All Studio operations (Create Agent, Update Team, Trigger Workflow, Fetch Sessions) proxy directly to the connected AgentOS instance via HTTP/SSE.
- **Strict Oikos Scope**: Limit local Oikos SQLite persistence (`data/oikos.db`) to target AgentOS server credentials (`instances` table) and local UI preferences.

---

## 2. Target Architecture & Components

```
┌─────────────────────────────────────────────────────────┐
│                      Oikos Frontend                     │
│  (Playground, Agent/Team Studio, Workflow Studio, etc.)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                Next.js Proxy API Layer                  │
│       (`/api/proxy/v1/*` & `/api/registry/*`)           │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
  Reads/Writes │ Saved Instance Configs    │ Proxies REST/SSE
               ▼                           ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│     Local SQLite DB      │    │    Agno AgentOS         │
│     (`data/oikos.db`)    │    │    (Python / Docker)    │
│  - Target Instances      │    │  - Agents & Teams       │
│  - User Preferences      │    │  - Workflows & Memory   │
└──────────────────────────┘    │  - Knowledge Bases      │
                                └─────────────────────────┘
```

---

## 3. Detailed Component Plan

### 3.1 Database Schema Cleanup (`src/db/schema.ts`)
- **Keep**:
  - `instances`: Manages saved AgentOS endpoints (`base_url`, `api_key`, `name`, `status`).
  - `settings`: Key-value user preferences (e.g. active instance ID, UI flags).
- **Remove**:
  - `agnoAgents`
  - `agnoTeams`
  - `agnoWorkflows`
  - `agnoKnowledgeBases`
  - `savedSessions`

### 3.2 AgentOS Client SDK Refactoring (`src/lib/agentos.ts`)
- Expand `agentos.ts` to implement full REST CRUD against AgentOS:
  - `fetchAgents(instanceId)` -> `GET /api/proxy/v1/agents`
  - `createAgent(instanceId, payload)` -> `POST /api/proxy/v1/agents`
  - `updateAgent(instanceId, agentId, payload)` -> `PUT /api/proxy/v1/agents/{id}`
  - `deleteAgent(instanceId, agentId)` -> `DELETE /api/proxy/v1/agents/{id}`
  - `fetchTeams(instanceId)` / `createTeam(instanceId, payload)` -> `/api/proxy/v1/teams`
  - `fetchWorkflows(instanceId)` -> `/api/proxy/v1/workflows`
  - `fetchKnowledgeBases(instanceId)` -> `/api/proxy/v1/knowledge-bases`
  - `fetchSessions(instanceId, agentId)` -> `/api/proxy/v1/sessions`

### 3.3 API Route Refactoring (`src/app/api/registry/*`)
- Update `/api/registry/agents`, `/api/registry/teams`, etc. to act as proxy forwarders:
  - Extract target `x-instance-id` from request headers.
  - Resolve the active `InstanceConfig` from `instances` table.
  - Forward the request to the target AgentOS URL (`${baseUrl}/v1/...`) appending authorization headers if `apiKey` is provided.

### 3.4 Studio Components Updates
- **`AgentTeamStudio.tsx`**: Replace direct local DB calls with `agentos.ts` proxy hooks to load, create, and update agents/teams on the active AgentOS instance.
- **`PlaygroundView.tsx`**: Load agents list and session history directly from AgentOS for the active instance.
- **`ControlPlaneView.tsx`**: Display connected AgentOS health status and instance configurations without relying on local entity tables.

---

## 4. Verification & Testing

1. **DB Schema Validation**: Ensure migrations run cleanly and local DB contains only `instances` and `settings`.
2. **API Proxy Tests**: Verify that CRUD operations against `/api/registry/agents` forward correctly to AgentOS without touching SQLite.
3. **End-to-End Test**: Connect Oikos to an AgentOS instance, verify that created/updated agents are immediately visible and runnable by AgentOS.
