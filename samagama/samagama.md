# Samagama Engineering Logbook

## 2026-05-24 - Phase 0 Foundation

Completed:

- Created npm workspace monorepo with `apps/client`, `apps/server`, and `packages/shared`.
- Added TypeScript, ESLint, Prettier, Husky/lint-staged configuration, `.env.example`, and Docker Compose for MongoDB.
- Added shared constants, role/status enums, Zod schemas, RBAC helpers, slug utility, and shared API response types.

Why:

- The PRD requires a MERN monorepo and shared contracts to avoid duplicated role, status, and validation logic between frontend and backend.

Architectural decisions:

- `@samagama/shared` is the contract package for validation and common vocabulary.
- npm workspaces are used to keep setup simple and within the approved stack.
- Mock embeddings are permitted for local development, but MongoDB remains the vector-storage boundary.

Tradeoffs:

- The initial shared package compiles to `dist`, which requires building shared contracts before running app builds.

Testing:

- Added shared package unit tests for RBAC, duplicate-check validation, and slug generation.

Risks/TODOs:

- Dependency installation is still required before automated checks can run.

## 2026-05-24 - Phase 1 Backend Core

Completed:

- Added Express app factory, MongoDB connection, centralized error handling, structured API responses, rate limiting, CORS, Helmet, compression, and logging.
- Added JWT auth, bcrypt registration/login, refresh-token endpoint, authenticated `me`, and RBAC middleware.
- Added Mongoose models for users, FAQs, categories, tags, questions, answers, flags, chat sessions, chat feedback, search logs, and audit logs.
- Added services for FAQ search/duplicates, taxonomy, Q&A, moderation, flags, chatbot orchestration, admin stats, prompt building, and mock provider adapters.
- Added declarative routes and thin controllers for PRD API groups.

Why:

- The PRD requires thin controllers, service-oriented backend architecture, centralized validation, RBAC, MongoDB schemas with indexes, and source-grounded chatbot boundaries.

Architectural decisions:

- Controllers only translate HTTP input/output.
- Business logic lives in `services`.
- Zod validation runs at route level before service calls.
- Chatbot retrieval only uses `published` FAQs and `approved` answers.
- Local duplicate detection uses deterministic embeddings and cosine scoring; production can swap retrieval internals to Atlas Vector Search.

Tradeoffs:

- The first MVP uses deterministic mock embedding and mock LLM providers so local development does not require paid API keys.
- Atlas vector index provisioning is left as deployment documentation and future automation.

Testing:

- Added backend tests for deterministic embeddings and chatbot prompt guardrails.

Risks/TODOs:

- Add API integration tests after dependency install and Mongo test configuration.
- Add seed data for the PRD demo checklist.

## 2026-05-24 - Phase 2 Frontend Core

Completed:

- Added React + Vite client with TanStack Query provider, React Router, demo auth provider, and role-based app shell.
- Implemented prototype-aligned navigation and views for students, moderators, and admins.
- Added FAQ browsing, recently viewed, community Q&A, ask-question flow with existing-answer review, chatbot UI, moderation pages, admin dashboards, management pages, analytics, feedback, and settings.
- Added reusable UI primitives for badges, panels, stat cards, and FAQ cards.

Why:

- The prototype defines role navigation, dashboard hierarchy, FAQ discovery, moderation queues, admin overview, and chatbot interaction patterns.

Architectural decisions:

- Frontend code is organized by product domain under `features`.
- The client currently supports demo-mode role switching to allow local UX review before API data wiring.
- API client exists independently for TanStack Query integration.

Tradeoffs:

- Live API hooks are not yet wired into every screen; demo data preserves product flow while backend APIs stabilize.

Testing:

- Added a React Testing Library smoke test for role login and student navigation.

Risks/TODOs:

- Replace mock data with query hooks per feature.
- Add accessibility and responsive UI checks after dependency install.

## 2026-05-24 - Verification and Dependency Hardening

Completed:

- Installed workspace dependencies and generated `package-lock.json`.
- Upgraded `bcrypt` to 6.x to remove the vulnerable `@mapbox/node-pre-gyp -> tar` chain while keeping bcrypt as required by the PRD.
- Upgraded Vitest to 4.x to remove the vulnerable dev-server dependency chain reported by npm audit.
- Added `.prettierignore` so authoritative PRD/prototype files are not reformatted.
- Removed duplicate Mongoose text-index declarations that produced a runtime warning.
- Started the API server and client dev server.

Testing results:

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm test`: PASS.
- `npm run format:check`: PASS.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities.
- API health check: PASS at `http://localhost:4000/health`.
- Client dev server check: PASS at `http://localhost:5174/`.

Runtime notes:

- Docker could not start the bundled MongoDB container because port `27017` was already allocated.
- The API connected successfully to the existing local MongoDB instance at `mongodb://localhost:27017/samagama_portal`.
- Vite used port `5174` because `5173` was already in use.

Risks/TODOs:

- Determine which existing process owns ports `27017` and `5173` before standardizing local developer scripts.
- Add seed data and live TanStack Query integration as the next implementation slice.

## 2026-05-24 - Phase 3 FAQ Live Data Slice

Completed:

- Added `npm run seed -w @samagama/server` with deterministic demo users, categories, tags, published/outdated FAQs, community questions, pending answer, and flag data.
- Seeded MongoDB with 3 users, 10 categories, 21 tags, and 10 FAQs.
- Changed role login to call the real `/api/auth/login` endpoint using seeded demo credentials.
- Added live TanStack Query hooks for FAQ search, categories, recently updated FAQs, recently viewed FAQs, and view tracking.
- Updated the FAQ browse page to use live API data for search, category filters, status filters, recently updated, popular, and recently viewed flows.
- Added `/api/faqs/recently-updated` and `/api/faqs/recently-viewed`.
- Fixed FAQ search candidate selection so query searches rank a broader active FAQ set before pagination.
- Fixed query validation so single `categoryIds` and `tagIds` values from URL query strings are coerced into arrays.
- Added public FAQ serialization so embedding vectors are not exposed by FAQ list, detail, view, feedback, or recently viewed responses.

Why:

- FAQ discovery is the first product-critical workflow and should be backed by real MongoDB data before Q&A, moderation, and chatbot UI wiring.
- Seeded demo accounts allow the prototype role buttons to become real authenticated sessions without adding an unrelated auth UI workflow.

Architectural decisions:

- Kept seed logic in `apps/server/src/scripts/seed.ts` so it can reuse Mongoose models and services directly.
- Kept frontend API logic in `features/faq/faqApi.ts` to preserve feature boundaries.
- Public serialization removes retrieval-only fields from API responses while preserving embeddings in MongoDB for RAG and duplicate detection.

Tradeoffs:

- The seed dataset is representative, not the final 150+ FAQ demo requirement.
- Role buttons still function as demo shortcuts, but now prefer real backend login when the API is available.

Testing results:

- Seed script completed successfully against local MongoDB.
- Verified seeded student login through `/api/auth/login`.
- Verified `/api/faqs?query=NOC&limit=2` ranks the NOC FAQ first.
- Verified single category query filtering with `categoryIds=<id>`.
- Verified FAQ view tracking and recently viewed retrieval.
- Verified FAQ public responses no longer expose `embedding`.

Risks/TODOs:

- Wire Q&A pages to live question/answer APIs next.
- Add service/API integration tests around FAQ search, recent views, and public serialization.
- Expand seed script toward the PRD demo target of 150 FAQs, 10 open questions, 5 pending answers, and 5 flagged FAQs.

## 2026-05-24 - Prototype Replacement UI Migration

Completed:

- Read and adopted `/Users/ravikumark/Downloads/samagama_prototype (1).jsx` as the current client UI reference.
- Added `apps/client/src/features/prototype/PrototypePage.tsx` as the active prototype-first application shell.
- Replaced `AppRoutes` so the current runtime opens directly into the new prototype role-based experience.
- Preserved existing seeded role login through `/api/auth/login` for student, moderator, and admin role switching.
- Migrated live FAQ discovery into the prototype shell: search, status filter, category filter, recently updated, recently viewed, and FAQ view tracking.
- Wired the prototype Yaksha chatbot screen to the existing `/api/chat/query` API mutation with source display and fallback messaging.
- Kept Q&A, moderation, admin, analytics, duplicate review, taxonomy, feedback, and settings workflows visible in the new UI using the existing demo datasets where live hooks are not yet implemented.
- Updated the route smoke test to validate the prototype shell and FAQ navigation behavior.

Why:

- The user requested a complete switch from the previous UI shell to the new prototype while preserving already implemented backend and live FAQ functionality.
- A prototype-first shell keeps the UX aligned with the latest authoritative artifact without discarding the MERN architecture, shared contracts, or services already built.

Architectural decisions:

- `PrototypePage` is isolated under `features/prototype` so the migration is explicit and does not scatter prototype state across unrelated feature folders.
- Existing backend services, shared schemas, auth provider, FAQ TanStack Query hooks, and seeded credentials were reused instead of duplicating API logic.
- Older feature pages remain in the codebase but are not active through routing; this avoids deleting potentially useful live integration work while making the new prototype the runtime source.

Tradeoffs:

- Several prototype screens remain UI/demo-state only because live Q&A, moderation, admin, analytics, feedback, and settings hooks need focused API wiring in later phases.
- The prototype file is larger than ideal for long-term maintainability; future work should extract domain panels after behavior stabilizes.

Testing results:

- `npm run format:check`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS.
- `npm run build`: PASS.
- `npm exec madge -- --circular apps/client/src apps/server/src packages/shared/src --extensions ts,tsx`: PASS, no circular dependencies.
- API health verified at `http://localhost:4000/health`.
- Student login verified through `POST /api/auth/login`.
- Authenticated FAQ list verified through `GET /api/faqs?limit=2`.
- Client runtime verified at `http://localhost:5173/`.

Risks/TODOs:

- Connect prototype Q&A, moderation, admin, analytics, chatbot feedback, and settings screens to their live API endpoints.
- Extract `PrototypePage` into smaller feature components once the new UI baseline is accepted.
- Add more frontend tests for role switching, FAQ filters, chatbot fallback/source display, and moderation/admin navigation.
