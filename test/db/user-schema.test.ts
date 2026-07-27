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
