import { clientToolEngine, ClientToolEngine } from "./engine";

export * from "./engine";

/**
 * Backward compatibility aliases.
 * Prefer `clientToolEngine` and `ClientToolEngine`.
 */
export const registry = clientToolEngine;
export const ClientToolRegistry = ClientToolEngine;
