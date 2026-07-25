# Full-Stack Architecture with Persistent Config Management

Oikos is designed as a full-stack web application (e.g. Next.js / Node-assisted) with a lightweight server component and persistent local configuration storage (such as SQLite or file-based `oikos.config.json`). 

This architecture allows Oikos to:
1. Load default AgentOS instances automatically via environment variables (`AGENTOS_URL`) or configuration files.
2. Persist saved AgentOS connections, API credentials, and user preferences server-side across browser sessions and devices.
3. Optionally proxy API requests to AgentOS instances to bypass browser CORS limitations.
