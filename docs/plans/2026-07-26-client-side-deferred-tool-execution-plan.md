# Implementation Plan: Client-Side (Deferred) Tool Execution Engine

**Date**: 2026-07-26  
**Status**: Proposed  
**Research Reference**: [`docs/research/client-side-deferred-tool-execution.md`](file:///Users/dselck/Documents/Oikos/docs/research/client-side-deferred-tool-execution.md)  
**OpenAPI Spec**: [`data/openapi.json`](file:///Users/dselck/Documents/Oikos/data/openapi.json)

---

## 1. Executive Summary

This plan details the implementation of a **Client-Side (Deferred) Tool Execution Engine** in Oikos.

When an AgentOS agent invokes a tool marked with `"execution_location": "client"`, AgentOS defers server-side execution and emits a `RunPaused` (or `deferred_tool_call`) event over the SSE stream for `POST /agents/{agent_id}/runs`. 

Oikos intercepts this call, executes the tool client-side in the web browser using native `fetch()` over Mutual TLS (mTLS), and posts the result back via the standard AgentOS endpoint **`POST /agents/{agent_id}/runs/{run_id}/continue`** (passing the tool result in the `tools` form body) to resume the LLM generation loop.

Target corporate tools for initial release: **Jira, Confluence, and GitLab**.

---

## 2. OpenAPI Spec Endpoint Mapping

| Action | AgentOS Standard Endpoint (`openapi.json`) |
| :--- | :--- |
| **Start Agent Run** | `POST /agents/{agent_id}/runs` |
| **Continue / Resume Run with Tool Output** | `POST /agents/{agent_id}/runs/{run_id}/continue` (form parameter `tools`) |
| **Register / Update Tool Components** | `POST /components`, `POST /components/{component_id}/configs` |

---

## 3. Proposed File Changes

### Component 1: Client Tool Core & Registry (`src/lib/client-tools/`)

#### [NEW] `src/lib/client-tools/types.ts`
- Define interfaces for `ClientToolDefinition`, `ClientToolHandler`, `ToolExecutionContext`, and `ClientToolResult`.

#### [NEW] `src/lib/client-tools/registry.ts`
- Implement `ClientToolRegistry` singleton with tool registration, lookup, execution dispatch, and fallback handling.

#### [NEW] `src/lib/client-tools/providers/jira.ts`
- Implement client tool handlers for Jira (`jira_get_issue`, `jira_search_issues`, `jira_create_issue`).

#### [NEW] `src/lib/client-tools/providers/confluence.ts`
- Implement client tool handlers for Confluence (`confluence_search`, `confluence_get_page`).

#### [NEW] `src/lib/client-tools/providers/gitlab.ts`
- Implement client tool handlers for GitLab (`gitlab_list_mrs`, `gitlab_get_file`, `gitlab_create_mr`).

---

### Component 2: SSE Event Streaming & Continuation Loop (`src/lib/agentos.ts` & UI)

#### [MODIFY] `src/lib/agentos.ts`
- Update `streamAgentRun` to handle `POST /agents/{agent_id}/runs`.
- Implement `continueAgentRun(params: { instanceId, agentId, runId, tools })` targeting `POST /agents/{agent_id}/runs/{run_id}/continue`.

#### [MODIFY] `src/components/playground/PlaygroundView.tsx`
- Connect tool execution events to `ClientToolRegistry`.
- Render client-side tool execution status in `ToolExecutionTree` with a distinct `[Client: mTLS]` badge.

---

### Component 3: AgentOS Simulator Support (`simulator/handlers.ts` & `simulator/router.ts`)

#### [MODIFY] `simulator/handlers.ts` & `simulator/router.ts`
- Ensure simulator strict compliance with `POST /agents/{agent_id}/runs` and `POST /agents/{agent_id}/runs/{run_id}/continue` as defined in `data/openapi.json`.

---

## 4. Verification Plan

### Automated Tests
- Unit tests in `test/client-tools.test.ts` testing registration, tool dispatch, error handling, and parameter validation.
- Run `npm run test` with Vitest.

### Manual Verification
- Start local dev server and simulator (`npm run dev`).
- Run a test session invoking `jira_get_issue` in the Playground using standard `/agents/{agent_id}/runs` and `/agents/{agent_id}/runs/{run_id}/continue`.
- Verify tool execution is intercepted by frontend, executed over `fetch`, rendered in `ToolExecutionTree`, and resumed back to AgentOS cleanly.
