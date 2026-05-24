# Samagama Internship Portal Enhancement - Project Context

## Product Mission

Build a MERN-based Samagama portal enhancement that helps internship students discover verified FAQs, ask community questions, get moderator-approved answers, and use a source-grounded Yaksha chatbot backed by MongoDB Vector Search.

## Authoritative Sources

- `README.md` is the product requirements, architecture, acceptance criteria, and constraints source.
- `samagama_portal_prototype.html` is the UX hierarchy and role-flow source.
- `/Users/ravikumark/Downloads/samagama_prototype (1).jsx` was used as the current prototype replacement reference for the client shell.

## Core Architecture

This repository uses an npm workspace monorepo:

```txt
apps/
  client/   React + Vite frontend
  server/   Node.js + Express API
packages/
  shared/   shared constants, schemas, roles, DTO types, validation contracts
docs/
PROJECT_CONTEXT.md
samagama.md
```

The backend follows thin controllers, declarative routes, reusable middleware, and service-oriented business logic. MongoDB is the persistence and semantic-storage boundary. Local development uses deterministic mock embeddings and a mock LLM provider, while the architecture keeps embedding, retrieval, prompt building, and provider generation modular for MongoDB Atlas Vector Search and Gemini/local provider integration.

## Stack Decisions

- Frontend: React, Vite, TanStack Query, React Hook Form, Zod, React Router.
- Backend: Node.js, Express, MongoDB via Mongoose, JWT, bcrypt, Zod validation.
- Shared contracts: TypeScript package `@samagama/shared`.
- Tests: Vitest, React Testing Library, Supertest-ready server tests.
- Tooling: npm workspaces, TypeScript, ESLint, Prettier, Husky, Docker Compose for local MongoDB.

## Business Rules

- Students can browse FAQs, ask questions, answer peer questions, flag content, and use Yaksha.
- Moderators can review answers, flags, unresolved questions, duplicates, and FAQ suggestions.
- Admins can manage FAQs, users, categories, tags, settings, duplicate thresholds, and analytics.
- Answers are not approved or retrievable until moderation.
- Chatbot content can only come from published FAQs and approved community answers.
- Duplicate detection is advisory with warning at 60% and strong merge recommendation at 80%.
- Archived FAQs are excluded from normal search unless explicitly filtered.

## Key Workflows

- FAQ discovery: keyword/semantic search, category and tag filters, status filters, recently updated, recently viewed.
- Ask question: enter question, run existing-answer check, review suggestions, submit if unresolved.
- Moderation: pending answer review, approve/reject/request changes, mark resolved or duplicate.
- Admin FAQ publishing: author FAQ, review tag suggestions, check duplicates, publish, generate embedding.
- Chatbot: query, embed, retrieve approved sources, build guarded prompt, generate answer, return sources, save feedback.

## Data Model Summary

- `User`: role, status, password hash, recently viewed FAQs.
- `Faq`: title, answer, summary, categories, tags, status, embedding, feedback counts, flags, source metadata.
- `Category` and `Tag`: slug, description, keywords, active status.
- `Question`: title, description, category, tags, status, existing-answer check metadata.
- `Answer`: body, moderation status, embedding, FAQ conversion eligibility.
- `Flag`: entity reference, reason, status, reporter/reviewer.
- `ChatSession` and `ChatFeedback`: conversation history, source IDs, confidence, feedback review status.
- `SearchLog` and `AuditLog`: analytics and moderation traceability.

## RAG Flow

1. User sends `/api/chat/query`.
2. Backend embeds query through `EmbeddingService`.
3. Retrieval service finds approved FAQ and answer sources.
4. Prompt builder injects guardrails and retrieved context.
5. Provider adapter generates answer or fallback.
6. Response includes answer, confidence, and source references.
7. Feedback creates reviewable chatbot feedback.

## Moderation Flow

1. Student answer is stored as `pending`.
2. Moderator/admin approves or rejects through protected routes.
3. Rejection requires a reason.
4. Approval indexes the answer, marks it eligible for FAQ conversion, and can resolve the question.
5. Audit logs record moderation decisions.

## Constraints

- No Python backend services.
- No separate vector database.
- No NestJS, Django, Firebase, Supabase, GraphQL, or microservice sprawl.
- LangChain.js only if direct Node implementation becomes too complex.
- MongoDB Atlas Vector Search is the required vector-search deployment target.

## Naming Conventions

- Backend files use domain suffixes: `.service.ts`, `.controller.ts`, `.routes.ts`.
- Shared enums/constants use uppercase arrays with inferred union types.
- API responses use `{ success, data }` or `{ success, error }`.
- React feature folders mirror product domains: `auth`, `faq`, `qna`, `moderation`, `chatbot`, `admin`.

## Current Implementation Status

- Phase 0 foundation: npm workspace, shared package, TypeScript, ESLint, Prettier, Docker Compose, env example.
- Phase 1 backend core: Express app, Mongo config, auth, RBAC, validation, error handling, models, services, routes.
- Phase 2 frontend core: Vite React app, seeded role login, and a prototype-first single-page shell adopted from `samagama_prototype (1).jsx`.
- Phase 3 FAQ discovery: seeded users/taxonomy/FAQs, live API-backed FAQ search, category/status filters, recently updated, recently viewed, and view tracking.
- Domain MVP: Q&A, moderation, admin, chatbot, analytics, feedback, duplicate-detection, taxonomy, and settings workflows are represented in the new prototype UI; FAQ discovery and chatbot query are wired to live API paths while several management workflows remain demo-state UI.
- Tests: shared contract tests, embedding tests, prompt guardrail tests, and prototype shell rendering/navigation test.

## Known Limitations

- Q&A, moderation, admin, analytics, feedback, and settings screens still use demo UI data; FAQ discovery is live API-backed and chatbot submission calls the API.
- The older route-level feature pages remain in the repository but are no longer the active runtime shell; `AppRoutes` now renders the prototype-first app.
- MongoDB Atlas `$vectorSearch` index creation is documented but not automatically provisioned locally.
- LLM and embedding providers default to deterministic mocks for free local demos.
- Seed script creates a representative demo dataset, not the final 150+ FAQ production dataset.

## Future Roadmap

- Add seed data matching the PRD demo checklist.
- Add API integration tests with an isolated MongoDB test database.
- Connect Q&A, moderation, admin, analytics, feedback, and settings prototype screens to TanStack Query hooks for live APIs.
- Add real Gemini provider adapter and Atlas vector aggregation path.
- Add admin settings persistence and duplicate candidate storage.
- Add accessibility and Playwright smoke checks.

## Setup Instructions

1. Copy `.env.example` to `.env` and update secrets.
2. Start MongoDB with `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Build shared contracts with `npm run build -w @samagama/shared`.
5. Seed demo data with `npm run seed -w @samagama/server`.
6. Run both apps with `npm run dev`.
7. Client: `http://localhost:5173`; API health: `http://localhost:4000/health`.

## Demo Accounts

All seeded accounts use password `Password123!`.

- Student: `riya@example.com`
- Moderator: `leena@samagama.in`
- Admin: `admin@samagama.in`

## Shared Conventions

- Validate inputs with shared Zod schemas before service execution.
- Keep controllers thin and services domain-focused.
- Use `@samagama/shared` for role/status/schema constants.
- Do not index unapproved content into chatbot retrieval.
- Keep documentation updated after major architectural or behavior changes.
