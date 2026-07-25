import "@testing-library/jest-dom";
import { vi } from "vitest";

if (typeof window !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();

  // Mock global fetch for relative API calls in test env
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  ) as unknown as typeof fetch;
}
