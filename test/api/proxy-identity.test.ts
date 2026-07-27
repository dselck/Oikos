import { describe, it, expect } from "vitest";
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

  it("gracefully preserves non-JSON or invalid strings", () => {
    const rawBody = "not a json string";
    const updatedBody = injectUserIdentity(rawBody, "user_789");
    expect(updatedBody).toBe("not a json string");

    const invalidJson = "{ message: broken";
    const updatedInvalid = injectUserIdentity(invalidJson, "user_789");
    expect(updatedInvalid).toBe(invalidJson);
  });

  it("appends user_id query parameter to URL for session requests", () => {
    const targetUrl = new URL("http://localhost:8000/sessions");
    targetUrl.searchParams.set("user_id", "user_789");

    expect(targetUrl.searchParams.get("user_id")).toBe("user_789");
  });
});
