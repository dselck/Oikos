# Implementation Plan: Expanded Client-Side Tool Coverage & Generic Dynamic mTLS Handler

**Date**: 2026-07-26  
**Status**: Proposed  

---

## 1. Rationale for Initial Tool Selection

The initial set of 8 tools (**Jira**: `jira_get_issue`, `jira_search_issues`, `jira_create_issue`; **Confluence**: `confluence_search`, `confluence_get_page`; **GitLab**: `gitlab_list_mrs`, `gitlab_get_file`, `gitlab_create_mr`) was selected for two reasons:

1. **Primary Read/Write Primitives**: They covered the most common enterprise tasks (fetching issues, searching docs, reading repo files, creating tickets/MRs).
2. **Protocol Verification Baseline**: They provided a clean, minimal set to verify the `ClientToolRegistry`, browser `fetch()` mTLS authentication, and `POST /agents/{id}/runs/{id}/continue` OpenAPI execution loop.

---

## 2. Proposed Expansions

### Expansion 1: Full Agno Toolkit Parity
Implement remaining actions from Agno's Python `JiraTools`, `ConfluenceTools`, and `GitLabTools`:
- **Jira**: `jira_update_issue`, `jira_add_comment`, `jira_list_projects`, `jira_assign_issue`
- **Confluence**: `confluence_create_page`, `confluence_update_page`, `confluence_list_spaces`
- **GitLab**: `gitlab_get_issue`, `gitlab_create_issue`, `gitlab_list_branches`, `gitlab_create_branch`, `gitlab_get_commit`

### Expansion 2: Generic Dynamic mTLS HTTP Tool (`generic_http_tool`)
Introduce a fallback handler in `ClientToolRegistry` that can execute **any** client-side HTTP request over mTLS. This allows AgentOS to register arbitrary dynamic OpenAPI tools via `/components` without needing pre-written TypeScript files for every endpoint.

---

## 3. Verification Plan

- Run unit tests in `test/client-tools.test.ts` for all expanded tools and generic HTTP fallback.
- Execute `npm run test`.
