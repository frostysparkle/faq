# Claude Conversation Log

Session ID: agent-a46a381847d83479b
Date: 2026-05-29 10:06:20

---

## 👤 User

Explore the project at /Users/ravikumark/anshu/faq. Give me a comprehensive overview of:
1. Directory structure (all top-level dirs and key files)
2. What's in the frontend/ folder (tech stack, key files, how it makes API calls)
3. What's in any backend/ folder or server files
4. What's in any LLM server files (look for llm_server, llm-server, or similar)
5. Any config files (package.json, requirements.txt, docker-compose, etc.)
6. README or GEMINI.md for architecture docs
7. How the frontend expects to connect to backend (API base URLs, endpoints called)
8. How the LLM server works and what endpoints it exposes

Be thorough - read actual file contents for key files.

---

## 🤖 Claude

I'll explore this project comprehensively. Let me start by getting the overall structure and then diving into the key components.

---

## 🤖 Claude

Now let me get the directory structure and key files:

---

## 🤖 Claude

Now let me explore each major directory:

---

## 🤖 Claude

Now let me check the backend API contracts and the RAG LLM server:

---

## 🤖 Claude

Now let me check the RAG documentation:

---

## 🤖 Claude

Let me check the frontend structure more deeply:

---

## 🤖 Claude

Let me also check the auth API and the frontend GEMINI documentation:

---

## 🤖 Claude

Let me check some more frontend pages to understand the chatbot integration:

---

## 🤖 Claude

Now let me check the initial implementation doc and look at git status to understand what exists:

---

## 🤖 Claude

Perfect! Now let me create a comprehensive summary of my findings. Let me check if there's a `.env.example` for the backend to understand the full config:

---

## 🤖 Claude

Now let me check the test-llm-server script to understand more about integration:

---

## 🤖 Claude

Perfect! Now I have a comprehensive understanding. Let me provide the final report:

---

## Comprehensive Project Overview: Samagama Internship Portal Enhancement

### 1. Directory Structure

```
/Users/ravikumark/anshu/faq/
├── frontend/                 # React Vite app (port 5173)
├── backend/                  # Express.js orchestrator API (NOT YET IMPLEMENTED - design phase)
├── rag/                      # RAG pipeline & LLM server
│   └── llm-server/          # Stateless compute engine (port 5000)
├── GEMINI.md                # Central project instruction file
├── initial_implementation_doc.md  # Product Requirements Document (PRD)
├── why_this_project.md      # Problem analysis
└── LICENSE
```

**Key Files Summary:**
- `GEMINI.md`: Project overview, tech stack, building/running instructions
- `initial_implementation_doc.md`: Detailed PRD with product goals, scope, specs
- `why_this_project.md`: Context on student support challenges
- `backend/BACKEND_API_CONTRACTS.md`: Complete API specification & MongoDB schemas
- `rag/rag-detailed.md`: RAG architecture blueprint & workflow docs

---

### 2. Frontend (`frontend/`)

**Tech Stack:**
- React 18 + TypeScript + Vite
- TanStack Query (React Query) v5 for server state
- React Hook Form + Zod for forms/validation
- Axios for HTTP calls
- React Router DOM v6
- Lucide React for icons
- Vanilla CSS with design tokens

**Key Architecture:**
- Feature-based structure (`src/features/`) — each feature has `api.ts` and `queries.ts`
- Features include: `auth`, `faq`, `qna`, `admin`, `moderation`, `flag`, `analytics`
- Central Axios instance in `src/lib/api-client.ts` with JWT auth interceptor
- Token storage: `localStorage` keys `samagama:accessToken` and `samagama:refreshToken`

**API Calls:**
- All requests go through `apiClient` with base URL from `VITE_API_URL` env var
- Default: `http://localhost:4000` (backend)
- Bearer token automatically injected from localStorage
- Timeout: 15 seconds
- Credentials enabled (withCredentials: true)

**Key API Endpoints Called:**
```
Auth: /api/auth/login, /api/auth/refresh, /api/auth/me
FAQs: /api/faqs, /api/categories, /api/tags, /api/stats/faqs
Q&A: /api/qna/questions, /api/qna/check-existing, /api/qna/answers
Chat: /api/chat/query, /api/chat/feedback
Admin: /api/users, /api/audit-logs, /api/stats/*, /api/moderation/*
Flags: /api/flags
```

**Chatbot Status:**
- `/chatbot` route exists but currently shows `<ComingSoonPage>` (line 47 in App.tsx)
- ChatbotFab button navigates to `/chatbot`
- ChatbotFeedbackPage exists in admin for feedback review

---

### 3. Backend (`backend/`)

**Current Status:** DESIGN PHASE ONLY — No implementation files yet. Contains only documentation.

**Architecture (From BACKEND_API_CONTRACTS.md):**
- Node.js 20 + Express 5
- MongoDB Atlas with Mongoose ODM
- Acts as ORCHESTRATOR between frontend and LLM server
- Handles: Auth (JWT), RBAC (student/moderator/admin), FAQ CRUD, Q&A moderation, audit logging

**MongoDB Collections:**
- `users`: email, role, tokenVersion, spurtiPoints
- `faqs`: title, answer, embedding (Phase 6), categories, tags, status, feedback counts
- `questions`: title, description, type (personal/community), status, askedBy
- `answers`: questionId, body, embedding (Phase 6), status (pending/approved/rejected)
- `chatfeedbacks`: chatSessionId, rating (helpful/unhelpful/incorrect)
- `systemsettings`: singleton doc with thresholds (confidence, maxSources, etc.)
- `flags`: entityType, entityId, reason, status
- `auditlogs`: all mod/admin actions recorded

**Environment Variables (Expected):**
```env
MONGODB_URI=...
JWT_SECRET=...
BCRYPT_ROUNDS=...
LLM_PROVIDER=local-llama|gemini|mock
EMBEDDING_PROVIDER=gemini|mock
GEMINI_API_KEY=...
LLM_BASE_URL=https://<llm-server>/internal/llm  # Phase 6
LLM_INTERNAL_SECRET=<bearer-token>              # Phase 6
```

**API Routes (Defined):**
```
Auth:       POST /api/auth/{register,login,refresh,logout}, GET /me
FAQs:       GET /api/faqs, POST/PATCH/GET/:id, POST/:id/{view,feedback}, DELETE categories/tags
Q&A:        POST /api/qna/check-existing, POST /questions, GET /answers
Moderation: GET /pending-answers, PATCH /answers/:id/{approve,reject}
Chat:       POST /api/chat/query (Phase 6), GET /feedback
Admin:      /api/users, /api/audit-logs, /api/stats/*, /api/settings
Flags:      /api/flags with review workflow
```

---

### 4. RAG & LLM Server (`rag/llm-server/`)

**Tech Stack:**
- Node.js with Express 5
- Axios for calling LM Studio
- CORS enabled
- Dotenv for config

**Running:**
```bash
cd rag/llm-server
npm install
npm start  # Runs on port 5000 by default
```

**Environment Variables:**
```env
PORT=5000
INTERNAL_SECRET=<bearer-token>  # Shared with backend
LM_STUDIO_URL=http://localhost:1234  # Local LLM endpoint
```

**API Endpoints (Secured with Bearer token auth):**

1. **`POST /internal/llm/generate`** — Standard RAG answer generation
   - Input: system_instruction, rag_context[], conversation_history[], current_message
   - Output: { response_text, fallback_triggered }
   - Detects fallback string: "I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate"

2. **`POST /internal/llm/summarize`** — Escalation summarization
   - Input: escalation_type, force_reason, conversation_history[]
   - Output: { summary, is_general_query } (strict JSON format)
   - Used when user escalates or forces escalation

**Interaction with Backend:**
- Backend calls LLM server for RAG generation & escalation
- LLM server calls LM Studio's `/chat/completions` endpoint
- Response must be JSON (handles markdown code block cleanup)
- Rate: ~0.2 temperature for deterministic answers, 0 for JSON output

---

### 5. Configuration Files

**Frontend (`frontend/package.json`):**
```json
{
  "name": "@samagama/client",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@samagama/shared": "*",
    "@tanstack/react-query": "^5.59.20",
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-router-dom": "^6.28.0"
  }
}
```

**LLM Server (`rag/llm-server/package.json`):**
```json
{
  "name": "llm-server",
  "type": "commonjs",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^5.2.1",
    "axios": "^1.16.1",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2"
  }
}
```

**Frontend `.env.example`:**
```env
VITE_API_URL=http://localhost:4000
```

---

### 6. Architecture Documentation

**Key Docs:**

1. **`GEMINI.md` (Root)** — Central instruction file
   - Project overview: MERN-based student portal
   - Core tech: MongoDB Atlas, Node.js/Express, React/Vite, Gemini API
   - Development conventions & file structure

2. **`initial_implementation_doc.md`** — Comprehensive PRD
   - Problem: 150+ unsorted FAQs, unreliable chatbot, no community Q&A
   - Solution: Categorized FAQs, semantic search, moderated Q&A, RAG chatbot
   - MVP scope: Auth, FAQ CRUD, community Q&A, moderation, basic chatbot
   - Non-goals: Native mobile, custom LLM training, Python services

3. **`backend/BACKEND_API_CONTRACTS.md`** — Complete API specification
   - System architecture & MongoDB schemas
   - All endpoint definitions & auth contracts
   - Phase 6 integration plan (RAG + escalation workflows)
   - LLM team requirements (endpoints, JSON schema, rate limits, embedding dims)

4. **`rag/rag-detailed.md`** — RAG architecture blueprint
   - Single Source of Truth: MongoDB as central DB, LLM as stateless compute
   - Standard chat workflow: user message → vector search → LLM → response
   - Escalation workflow: user escalates → LLM summarizes → ticket created
   - TTL index for 7-day auto-expiry of verified queries

---

### 7. Frontend-to-Backend API Connection

**How Frontend Makes Calls:**
```typescript
// Central Axios client (src/lib/api-client.ts)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',  // Default: http://localhost:4000
  withCredentials: true,
  timeout: 15_000,
});

// Auto-injects Bearer token
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();  // From localStorage
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Feature-based API Organization:**
- `src/features/faq/api.ts`: FAQ CRUD, categories, tags, stats
- `src/features/qna/api.ts`: Community Q&A, moderation, answers
- `src/features/admin/api.ts`: Users, audit logs, intelligence stats
- `src/features/flag/api.ts`: Flag/report functionality
- `src/features/auth/AuthProvider.tsx`: JWT login/refresh/logout

**Expected Backend Base URL:** `http://localhost:4000` (configurable via `VITE_API_URL`)

---

### 8. LLM Server Integration

**Workflow (From BACKEND_API_CONTRACTS.md Phase 6):**

1. **Standard Chat:**
   - User sends message to `/api/chat/query` (backend)
   - Backend generates query embedding
   - Backend searches MongoDB vector index for relevant FAQs + answers
   - Backend assembles payload with system instruction, context, history
   - Backend calls LLM server: `POST /internal/llm/generate`
   - LLM returns response_text + fallback_triggered flag
   - Backend saves to cache, returns to frontend

2. **Escalation (`#escalate` / `#forceescalate`):**
   - Backend intercepts command (never searches MongoDB)
   - Backend calls LLM server: `POST /internal/llm/summarize`
   - LLM returns strict JSON: { summary, is_general_query }
   - Backend creates/merges ticket into MongoDB `tickets` collection
   - Frontend notified of ticket creation

**LLM Server Requirements:**
- Must use HTTP Bearer token: `Authorization: Bearer <LLM_INTERNAL_SECRET>`
- Must return exact JSON structure (no markdown filler)
- Fallback string detection: `"I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate"`
- Temperature: 0.2 for RAG answers, 0 for JSON output
- Max tokens: 500 for generate, structured for summarize

**Embedding Dimensions:**
- Not yet specified in docs (needs coordination with LLM team)
- MongoDB Atlas vector index requires explicit `numDimensions`

---

### 9. Current Project Status

**Implemented:**
✓ Frontend (React + Vite, feature-based, all pages & API clients ready)
✓ LLM Server (Express wrapper, two endpoints, LM Studio integration)
✓ Documentation (GEMINI.md, contracts, RAG blueprint, PRD)

**Not Yet Implemented:**
✗ Backend (Node.js + Express orchestrator — design phase only)
✗ MongoDB connection & schemas
✗ JWT auth & middleware
✗ FAQ/Q&A business logic
✗ Moderation workflows
✗ Chat query endpoint & RAG orchestration
✗ Vector embedding generation & search
✗ Ticket creation system
✗ Audit logging system

**Ready for Integration:**
- Frontend can call backend once `/api/` endpoints are implemented
- LLM server can be started and tested with `test-llm-server.js`
- All API contracts & data models are documented

---

This is a comprehensive full-stack platform where the **frontend** is feature-complete and the **LLM server** is operational, but the **backend orchestrator** remains in the design phase awaiting implementation.

---

