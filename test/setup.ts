import "@testing-library/jest-dom";
import { vi } from "vitest";

if (typeof window !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();

  const originalFetch = globalThis.fetch;

  // Mock global fetch for relative API calls in test env while preserving native fetch for http(s)
  global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = input.toString();
    if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
      return originalFetch(input, init);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve("[]"),
    });
  }) as unknown as typeof fetch;
}
