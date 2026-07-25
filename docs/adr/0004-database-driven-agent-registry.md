# Database-Driven Agent Registry and Dynamic Hydration

Oikos uses Agno's native **Database-Driven Agent Registry** pattern (`PostgresDb` / `SqliteDb`) to store, author, and dynamically hydrate Agent, Team, and Workflow configurations.

## Context & Decision
Rather than writing and hot-reloading Python files (`agents/*.py`) on disk, Oikos manages Agent, Team, and Workflow definitions directly in a shared database schema.

We chose this pattern because:
1. **Agno Native Support**: Agno provides native `agent.save()` and `get_agent_by_id(id, db)` methods, allowing AgentOS to hydrate agent instances directly from DB records.
2. **Instant Zero-Latency Updates**: Updating an agent in Oikos takes effect immediately on the next run invocation without waiting for filesystem watchers or Uvicorn reloads.
3. **Atomic Operations & Multi-User Editing**: Avoids Docker volume permission issues and file overwrite conflicts.
