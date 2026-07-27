import { describe, it, expect } from "vitest";
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

  it("validates sessions when ENABLE_AUTH is enabled", async () => {
    const engine = new AuthEngine({ enableAuth: true });
    // Without token or with unhandled token, returns null when auth is enabled
    const nullUser = await engine.validateSession();
    expect(nullUser).toBeNull();

    const invalidUser = await engine.validateSession("invalid-token");
    expect(invalidUser).toBeNull();
  });
});
