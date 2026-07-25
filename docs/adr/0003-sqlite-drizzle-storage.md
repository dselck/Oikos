# SQLite with Drizzle ORM for Local Storage

Oikos uses **SQLite** embedded database managed via **Drizzle ORM** for server-side persistence of instance configurations, user preferences, agent presets, and connection settings.

## Context & Decision
We needed a local storage engine for Oikos server settings and instance configurations that:
1. Requires zero external database server setup.
2. Supports type-safe, schema-driven queries.
3. Easily persists across restarts using a local file mount (`data/oikos.db`).

SQLite + Drizzle ORM provides a lightweight, reliable, type-safe storage foundation while seamlessly falling back to environment variable defaults (`AGENTOS_URL`) when uninitialized.
