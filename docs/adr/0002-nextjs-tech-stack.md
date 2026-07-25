# Next.js Full-Stack Application Framework

Oikos is built using **Next.js (App Router, React 19, TypeScript)** as its unified full-stack framework. 

## Context & Decision
We evaluated a unified TypeScript stack (Next.js) versus a Python-backed stack (FastAPI + React) or compiled binary (Go + React). 

We chose Next.js because:
1. **Single-Language Developer Experience**: End-to-end TypeScript across the React UI components, state management, and server API routes.
2. **Unified Development & Deployment**: A single command (`npm run dev`) for local development and a single Docker runtime container for production.
3. **API & Streaming Proxying**: Next.js Route Handlers support Server-Sent Events (SSE) streaming and request proxying to Agno AgentOS instances without requiring a separate backend service.
