# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Next.js + WebSocket server concurrently)
npm run dev

# Run only the WebSocket server
npm run dev:ws

# Run only Next.js
npm run dev:next

# Build
npm run build

# Start production servers
npm run start        # Next.js
npm run start:ws     # WebSocket server

# Lint
npm run lint

# Tests (vitest)
npm test

# Run a single test file
npx vitest run tests/unit/libs/apiKeyEncryption.test.ts

# Database migrations (Drizzle)
npx drizzle-kit generate
npx drizzle-kit migrate

# Test Redis connection
npm run test:redis
```

Environment variables are loaded from `.env.local`. Validated via Zod schemas in `src/lib/env/`. Required vars include `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, JWT config (`JWT_SECRET`, `JWT_EXPIRY`, `JWT_AUD`, `JWT_ISS`), `ENCRYPTION_KEY`, `REDIS_URL`, and OAuth/email keys.

## Architecture

This is a **SaaS AI chat app** (Next.js 15 + a standalone WebSocket server) that lets users bring their own LLM API keys. Currently supports **OpenAI** and **Anthropic** providers.

### Two-Server Model

- **Next.js app** (`src/`) — UI, REST API routes (`src/app/api/`), auth, and middleware
- **WebSocket server** (`server/server.ts`) — real-time chat streaming; runs as a separate process on `WS_PORT` (default 3002 locally, 8080 in production)

### Production (Railway)

Four Railway services on a private network:
- Next.js app (client)
- WebSocket server
- PostgreSQL
- Redis

### Path Aliases (tsconfig)

- `@/*` -> `./src/*` or `./server/*`
- `@/shared/*` -> `./shared/*`
- `@/server/*` -> `./server/*`
- `@/styles/*` -> `./src/styles/*`
- `@/hooks/*` -> `./src/hooks/*`

### Shared Code (`shared/`)

Code used by both the Next.js app and the WebSocket server:

- `shared/db/schema.ts` — Drizzle ORM schema (PostgreSQL). Tables: `users`, `chats`, `messages`, `summaries`, `api_keys`, `refresh_tokens`, `access_codes`, `token_usage`
- `shared/lib/types.ts` — Core types (`Message`, `ChatContext`, `LLMProvider`, `StateAnnotation` for LangGraph)
- `shared/lib/models.ts` — Model metadata (name, provider, max tokens)
- `shared/lib/container.ts` — Dependency injection container (`AgentDeps`) wiring DB utils and chat context services
- `shared/lib/jwt.ts` — JWT validation (shared between middleware and WebSocket auth)
- `shared/lib/langchain/` — LLM integration:
  - `llmFactory.ts` — Creates LangChain chat models from user's encrypted API keys; Redis-cached (15 min TTL)
  - `llmHandler.ts` — `askQuestion()` async generator that streams LangGraph agent responses
  - `llmHelper.ts` — Workflow graph setup, summarization, token calculation, DB updates
  - `getOrCreateChatContext.ts` — Retrieves or initializes `ChatContext` from the in-memory manager
  - `prompts.ts` — LangChain prompt templates
  - `tools.ts` — LangChain tools for the agent
- `shared/constants.ts` — Enums for login providers, LLM providers, verification types, encryption constants
- `shared/logger.ts` — Winston logger factory
- `shared/redis.ts` — Redis client initialization

### Chat Context Management

`ChatContextManager` (`src/lib/services/chatContextManager.ts`) is a singleton LRU cache (200 entries, 30 min TTL) that stores `ChatContext` in memory. Context includes recent messages + a rolling summary. Summarization runs asynchronously in the background to avoid blocking the response stream.

### Authentication

- JWT-based (jose): short-lived `accessToken` + longer-lived `refreshToken` stored as HttpOnly cookies
- `src/middleware.ts` protects `/chat/*`, `/dashboard/*`, `/api-keys/*`, `/settings/*`, `/profile/*` — on `JWTExpired`, redirects to `/api/auth/refresh-token`
- CSRF protection via Origin header validation on all `/api/*` routes
- WebSocket auth uses ephemeral tokens (30s expiry via Redis) generated at `/api/auth/ws-token`
- Google OAuth supported as an alternative login method
- API keys (for LLM providers) are AES-256-GCM encrypted before storage in the `api_keys` table
- Rate limiting on login (5 req/min per IP) and token refresh endpoints

### Frontend

- `src/context/` — React contexts: `AuthContext`, `ChatContext`, `AllChatsContext`, `ThemeContext`
- `src/hooks/useWebSocket.ts` — Manages WebSocket lifecycle; accumulates `type: "token"` chunks by message ID, finalizes on `type: "done"`
- `src/hooks/useUpload.ts` — File upload handling via S3
- `src/hooks/useChatMenuController.ts` — Chat list sidebar interactions (rename, delete, search)
- `src/components/` — UI components; `Chatbox`, `ChatListPanel`, `ChatListItem`, `Sidebar` are the main chat UI
- Theme toggled via `ThemeContext`; initial theme set by `public/scripts/set-theme.js` to avoid flash

### Testing

Tests live in `tests/unit/`. Vitest is configured with `vite-tsconfig-paths` so `@/*` aliases work. Mock files are co-located at `src/lib/__mocks__/` and `shared/lib/langchain/__mocks__/`. Setup file is `tests/setupEnv.ts` (loads `.env.test`, mocks logger).
