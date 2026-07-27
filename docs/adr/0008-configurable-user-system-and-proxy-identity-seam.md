# ADR-0008: Configurable User System & Proxy Identity Seam Architecture

## Status
Accepted

## Context
Agno AgentOS natively supports `user_id` across run endpoints (`POST /agents/{id}/runs`), session queries (`GET /sessions?user_id=...`), user learnings/memories (`/learnings?user_id=...`), and execution traces (`/traces/search`). However, AgentOS treats `user_id` as an untrusted state-partitioning key rather than executing user authentication itself.

Oikos requires a user system supporting both local credentials (username/password) and OAuth/OIDC providers, role-based authorization (`Admin` vs `Member`), and user-level memory/session isolation, while preserving a zero-friction "zero-config" developer experience when running locally.

## Decisions

### 1. Oikos Auth Engine (Local Database)
Oikos manages user accounts (`users`, `sessions`, `accounts`, `verifications`) in its embedded SQLite database (`src/db/schema.ts`) via Drizzle ORM and Auth.js / NextAuth v5. Oikos handles user authentication, password hashing, OAuth/OIDC provider callbacks, and session cookie issuance.

### 2. Proxy Identity Seam (`src/app/api/proxy/[...path]/route.ts`)
The Next.js API proxy route serves as the enforcement seam between Oikos and AgentOS:
- Verifies the incoming authenticated Oikos user session.
- Enforces endpoint permissions based on the user's role.
- Injects and overrides `user_id: authenticatedUser.id` into outbound request JSON bodies (`POST /runs`) and query parameters (`GET /sessions?user_id=...`) sent to AgentOS.
- Prevents browser-side payload tampering and enforces strict user memory and session isolation.

### 3. Binary User Roles (`Admin` vs `Member`)
- **Admin**: Has unrestricted access to Instance Configuration, Database-Driven Registry authoring (Agents/Teams/Workflows), Trace Inspector, User Administration, and global session listing across connected AgentOS instances.
- **Member**: Has access to Playground interactions, self-owned session filtering (`user_id = member.id`), and self-owned memory/learnings management.

### 4. Configurable Auth Mode (`ENABLE_AUTH`)
- **`ENABLE_AUTH=false` (Default Local Mode)**: Auth screens, login prompts, and setup wizards are completely bypassed. Oikos transparently operates as a default local `Admin` user (`user_id = "default_user"`), maintaining zero-friction offline developer workflows.
- **`ENABLE_AUTH=true` (Secure Multi-User Mode)**: Auth middleware, login/signup routes, initial setup wizard (first registered user becomes `Admin`), and proxy identity injection are strictly enforced.

### 5. AgentOS Client `user_id` Payload & Query Fixes
`HttpAgentOSClient.runs.stream` and `HttpAgentOSClient.sessions.list` in `src/lib/agentos-client.ts` are updated to properly serialize `user_id` in POST request body payloads and `?user_id=` URL query parameters.

## Consequences
- **Security & Decoupling**: End-user credentials and authentication logic remain securely encapsulated in Oikos, while AgentOS receives verified `user_id` values on every run and query.
- **Backward Compatibility**: Developers can continue using Oikos locally without login prompts, while multi-tenant/production deployments can enable `ENABLE_AUTH=true` for full RBAC and multi-user isolation.
- **ADR-0006 Alignment**: AgentOS remains the single source of truth for runtime entities, sessions, and memories, while Oikos manages user identity and proxy enforcement locally.
