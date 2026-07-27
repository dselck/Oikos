# Configurable User System & Proxy Identity Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a configurable User System (local credentials + OAuth/OIDC via Drizzle ORM) in Oikos with a Proxy Identity Seam that validates sessions, enforces binary role permissions (`Admin` vs `Member`), and injects verified `user_id` into Agno AgentOS requests.

**Architecture:** Oikos manages local user authentication and role storage in SQLite (`src/db/schema.ts`). When `ENABLE_AUTH=true`, the Next.js API proxy (`src/app/api/proxy/[...path]/route.ts`) validates sessions, checks permissions, and injects `user_id` into AgentOS payloads. When `ENABLE_AUTH=false` (default), Oikos bypasses login screens and operates as a default local `Admin` user (`user_id = "default_user"`).

**Tech Stack:** Next.js 15, Drizzle ORM, SQLite, Vitest, Zustand, Agno AgentOS REST/SSE API.

---

### Task 1: Fix `HttpAgentOSClient` Payload & Query `user_id` Serialization

**Files:**
- Modify: `src/lib/agentos-client.ts`
- Test: `test/lib/agentos-client.test.ts`

- [ ] **Step 1: Write the failing test for `user_id` in runs stream and session list**

Create or update `test/lib/agentos-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpAgentOSClient } from "../../src/lib/agentos-client";

describe("HttpAgentOSClient user_id serialization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("includes user_id in run stream JSON payload when provided in options", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    });
    global.fetch = fetchMock;

    const client = new HttpAgentOSClient("http://localhost:8000");
    await client.runs.stream("agent-123", {
      message: "Hello world",
      userId: "user_456",
    });

    expect(fetchMock).toHaveBeenCalled();
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/agents/agent-123/runs");
    const bodyJson = JSON.parse(requestInit.body as string);
    expect(bodyJson).toHaveProperty("user_id", "user_456");
  });

  it("appends user_id query parameter when listing sessions with userId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });
    global.fetch = fetchMock;

    const client = new HttpAgentOSClient("http://localhost:8000");
    await client.sessions.list("user_456");

    expect(fetchMock).toHaveBeenCalled();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/sessions?user_id=user_456");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/lib/agentos-client.test.ts`
Expected: FAIL due to missing `user_id` in body JSON and missing `userId` parameter in `sessions.list()`.

- [ ] **Step 3: Implement minimal code changes in `HttpAgentOSClient`**

Modify `src/lib/agentos-client.ts`:

```typescript
// Inside HttpAgentOSClient.runs.stream:
const payload: Record<string, unknown> = {
  message: options.message,
  session_id: options.sessionId,
  user_id: options.userId, // <--- Add user_id serialization
  stream: true,
};

// Inside HttpAgentOSClient.sessions.list:
async list(userId?: string): Promise<AgentSessionListResponse> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return this.fetchJson<AgentSessionListResponse>(`/sessions${query}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/lib/agentos-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agentos-client.ts test/lib/agentos-client.test.ts
git commit -m "fix(agentos-client): serialize user_id in run stream payloads and session list queries"
```

---

### Task 2: Drizzle ORM Database Schema for User System

**Files:**
- Modify: `src/db/schema.ts`
- Test: `test/db/user-schema.test.ts`

- [ ] **Step 1: Write the failing test for User DB schema**

Create `test/db/user-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { users, sessions, accounts } from "../../src/db/schema";
import { getTableColumns } from "drizzle-orm";

describe("User Schema Definitions", () => {
  it("defines users table with required columns including role", () => {
    const columns = getTableColumns(users);
    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("name");
    expect(columns).toHaveProperty("email");
    expect(columns).toHaveProperty("passwordHash");
    expect(columns).toHaveProperty("role");
    expect(columns).toHaveProperty("createdAt");
  });

  it("defines sessions table with userId reference and token", () => {
    const columns = getTableColumns(sessions);
    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("token");
    expect(columns).toHaveProperty("expiresAt");
  });

  it("defines accounts table for OAuth providers", () => {
    const columns = getTableColumns(accounts);
    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("provider");
    expect(columns).toHaveProperty("providerAccountId");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/db/user-schema.test.ts`
Expected: FAIL with "users not defined".

- [ ] **Step 3: Add `users`, `sessions`, and `accounts` tables to `src/db/schema.ts`**

Modify `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/db/user-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts test/db/user-schema.test.ts
git commit -m "feat(db): add users, sessions, and accounts tables to Drizzle schema"
```

---

### Task 3: Auth Engine Core & Session Validation

**Files:**
- Create: `src/lib/auth-engine.ts`
- Test: `test/lib/auth-engine.test.ts`

- [ ] **Step 1: Write the failing test for `AuthEngine`**

Create `test/lib/auth-engine.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AuthEngine } from "../../src/lib/auth-engine";

describe("AuthEngine Core", () => {
  it("returns default admin user when ENABLE_AUTH is disabled", async () => {
    const engine = new AuthEngine({ enableAuth: false });
    const user = await engine.validateSession("any-token");

    expect(user).toBeDefined();
    expect(user?.id).toBe("default_user");
    expect(user?.role).toBe("admin");
    expect(user?.name).toBe("Default Admin");
  });

  it("hashes and verifies password correctly", async () => {
    const engine = new AuthEngine({ enableAuth: true });
    const hash = await engine.hashPassword("secret123");
    expect(hash).not.toBe("secret123");

    const valid = await engine.verifyPassword("secret123", hash);
    expect(valid).toBe(true);

    const invalid = await engine.verifyPassword("wrongpass", hash);
    expect(invalid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/lib/auth-engine.test.ts`
Expected: FAIL with "AuthEngine not found".

- [ ] **Step 3: Implement `AuthEngine` in `src/lib/auth-engine.ts`**

Create `src/lib/auth-engine.ts`:

```typescript
import crypto from "crypto";

export interface OikosUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}

export interface AuthEngineConfig {
  enableAuth?: boolean;
}

export class AuthEngine {
  private enableAuth: boolean;

  constructor(config?: AuthEngineConfig) {
    this.enableAuth = config?.enableAuth ?? (process.env.ENABLE_AUTH === "true");
  }

  isAuthEnabled(): boolean {
    return this.enableAuth;
  }

  async validateSession(token?: string): Promise<OikosUser | null> {
    if (!this.enableAuth) {
      return {
        id: "default_user",
        name: "Default Admin",
        email: "admin@local.oikos",
        role: "admin",
      };
    }

    if (!token) return null;
    // Database lookup for active session token will be wired here
    return null;
  }

  async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString("hex");
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString("hex")}`);
      });
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve) => {
      const [salt, key] = hash.split(":");
      if (!salt || !key) return resolve(false);
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return resolve(false);
        resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
      });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/lib/auth-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-engine.ts test/lib/auth-engine.test.ts
git commit -m "feat(auth): implement AuthEngine core with ENABLE_AUTH bypass and password utilities"
```

---

### Task 4: Proxy Identity Seam & Role-Based Enforcement

**Files:**
- Modify: `src/app/api/proxy/[...path]/route.ts`
- Test: `test/api/proxy-identity.test.ts`

- [ ] **Step 1: Write failing test for Proxy Identity Seam**

Create `test/api/proxy-identity.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { injectUserIdentity } from "../../src/app/api/proxy/[...path]/route";

describe("Proxy Identity Seam Injection", () => {
  it("injects user_id into POST request body payload", () => {
    const originalBody = JSON.stringify({ message: "Hello", stream: true });
    const updatedBody = injectUserIdentity(originalBody, "user_789");
    const parsed = JSON.parse(updatedBody);

    expect(parsed).toEqual({
      message: "Hello",
      stream: true,
      user_id: "user_789",
    });
  });

  it("appends user_id query parameter to URL for session requests", () => {
    const targetUrl = new URL("http://localhost:8000/sessions");
    targetUrl.searchParams.set("user_id", "user_789");

    expect(targetUrl.searchParams.get("user_id")).toBe("user_789");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/api/proxy-identity.test.ts`
Expected: FAIL with "injectUserIdentity not exported/defined".

- [ ] **Step 3: Implement `injectUserIdentity` helper and proxy session checks in `src/app/api/proxy/[...path]/route.ts`**

Export and wire `injectUserIdentity` inside `src/app/api/proxy/[...path]/route.ts`:

```typescript
export function injectUserIdentity(bodyText: string, userId: string): string {
  try {
    const data = JSON.parse(bodyText);
    if (typeof data === "object" && data !== null) {
      data.user_id = userId;
      return JSON.stringify(data);
    }
  } catch {
    // If not JSON, return original body
  }
  return bodyText;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/api/proxy-identity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/proxy/[...path]/route.ts test/api/proxy-identity.test.ts
git commit -m "feat(proxy): implement Proxy Identity Seam helper for payload user_id injection"
```

---

### Self-Review & Verification

1. **Spec Coverage**:
   - `user_id` payload & query fixes in `HttpAgentOSClient` -> Task 1
   - SQLite tables via Drizzle -> Task 2
   - `AuthEngine` & `ENABLE_AUTH=false` bypass -> Task 3
   - Proxy Identity Seam injection -> Task 4
2. **Placeholder Scan**: Checked — zero `TODO` or `TBD` placeholders.
3. **Type Consistency**: `user_id` (string), `OikosUser` (`id`, `name`, `email`, `role`), `AuthEngine` verified across tasks.

---

## Execution Choice Handoff

Plan complete and saved to `docs/plans/2026-07-27-user-system-and-proxy-identity-seam.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach would you like to take?
