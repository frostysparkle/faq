# Samagama Navigator Project Memory

## Mission
Samagama Navigator is a premium institutional decision-intelligence platform built on a strict MERN stack: MongoDB, Mongoose, Express, React with Vite, and Node.js.

## Hard Architecture Constraints
- Monorepo root contains `client`, `server`, and `shared` workspaces.
- Shared validation lives in `shared/schemas` and is imported by both backend routes and frontend forms.
- Backend validation uses Zod on every route that accepts params, query, or body input.
- Authentication uses JWT access tokens, JWT refresh tokens, and bcrypt password hashing.
- Server state in React must go through TanStack Query v5.
- Forms use React Hook Form with Zod resolvers.
- Styling uses Tailwind CSS and local shadcn/ui-style components only.
- Charts use Recharts.
- Tests use Jest and Supertest on the backend, Jest and React Testing Library on the frontend.
- No Python, no vector database, no RAG pipeline, and no AI generation layer.

## Current Structure
- `shared`: source-of-truth constants and Zod schemas.
- `server`: Express API, Mongoose models, auth middleware, RBAC, audit logging, and route modules.
- `client`: Vite React app, TanStack Query client, Axios auth interceptors, Tailwind styles, and the application shell.
- Domain enums for roles, statuses, FAQ visibility, question priority, and answer confidence live in `shared/constants`.
- `PROJECT_CONTEXT.md` is the detailed copy-pasteable project handoff for new AI chats or teammate onboarding.

## Backend Notes
- `server/src/app.js` wires security middleware, JSON parsing, rate limiting, health check, route modules, 404 handling, and the global error handler.
- `server/src/config/env.js` loads the root `.env`, validates required environment variables with Zod, and fails fast.
- `server/src/config/db.js` owns Mongoose connection retry behavior and graceful shutdown.
- `server/src/services/authService.js` owns registration, login, refresh-token verification, logout revocation, token-pair generation, and user sanitization.
- Refresh-token revocation is an in-memory Set for the MVP; production should move revocation state to Redis with TTLs.
- `server/src/middleware/auth.js` verifies access tokens and attaches `req.user = { id, role, email }` from the active User record.
- `server/src/routes/authRoutes.js` mounts public register/login/refresh routes and protected logout/me routes under `/api/auth`.
- `server/src/utils/embeddings.js` uses `@xenova/transformers` locally for all-MiniLM-L6-v2 embeddings. First model load downloads and caches the model.
- `server/src/services/faqService.js` owns FAQ CRUD, status transitions, hybrid semantic+keyword search, result ranking, similarity detection, feedback, view tracking, and quality score recalculation.
- `server/src/services/questionService.js` owns Community Q&A duplicate checks, question submission guardrails, list/detail queries, answer submission, answer visibility rules, and priority-score recalculation.
- `server/src/services/moderationService.js` owns moderator/admin answer approval, rejection, change requests, question resolution, duplicate marking, FAQ conversion recommendations, admin review flags, queue read models, FAQ-conversion candidate retrieval, bulk moderation actions, and moderator analytics.
- `server/src/services/analyticsService.js` owns admin intelligence endpoints: executive overview, issue heatmap, unanswered-search clusters, FAQ quality decisions, moderation-load reporting, and audit-log retrieval. Each endpoint returns narrative guidance and recommended actions, not only raw metrics.
- `server/src/services/assistantService.js` powers the guided assistant search endpoint. It returns verified FAQ/approved-answer matches with confidence scores only; it does not generate free-form answers.
- `server/src/utils/narrativeGenerator.js` contains pure template-based insight strings. There is no AI generation layer.
- `server/src/routes/questionRoutes.js` mounts under `/api` and serves `/api/questions/*`, `/api/answers/*`, and `/api/moderation/*` endpoints.
- `server/src/routes/adminRoutes.js` mounts admin-only analytics under `/api/admin/*`.
- `server/src/routes/assistantRoutes.js` mounts authenticated guided assistant search under `/api/assistant/search`.
- `server/src/jobs/embeddingBackfillJob.js` backfills FAQ and Question embeddings in CPU-friendly batches of five.
- `server/src/jobs/analyticsJobs.js` exports background jobs for FAQ quality-score recalculation, question priority recalculation, and unanswered-search clustering. Suggested cadence: quality every 6 hours, priority every 2 hours, search clustering every 1 hour.
- `server/src/seed/seedData.js` is the demo seed entrypoint and can be run with `node src/seed/seedData.js` from the server workspace. It creates demo users, taxonomy, FAQs, community questions, answers, search logs, feedback, review items, analytics events, and audit logs.
- `server/src/seed/faqContent.js` keeps the 40 institutional FAQ seed entries separate from the seed orchestration script. Answers are long-form, realistic, and suitable for a first demo walkthrough.
- `server/src/utils/auditLog.js` writes audit events to the `AuditLog` collection and can be called from any service.
- Mongoose models use `{ timestamps: true, strict: true }`.
- `server/src/models/AnalyticsCache.js` stores precomputed analytics artifacts such as unanswered-search clusters with TTL support.
- Route handlers use `asyncHandler`; route-level try/catch blocks should not be added.
- Operational data models in `server/src/models` now include `User`, `Faq`, `Category`, `Tag`, `Question`, `Answer`, `SearchLog`, `FeedbackEvent`, `ReviewItem`, `AnalyticsEvent`, and `AuditLog`.
- FAQ and Question embeddings are hidden with `select: false`, validated at 384 dimensions when present, and documented as internal vectors only.

## Frontend Notes
- `client/src/lib/queryClient.js` centralizes TanStack Query retry and error behavior.
- `client/src/lib/api.js` centralizes Axios token attachment and refresh handling.
- `client/src/lib/designSystem.js` is the JS-accessible design system token export and must stay aligned with `client/tailwind.config.js`.
- `client/src/lib/motion.js` contains reusable Framer Motion presets for shared microinteractions.
- `client/src/components/layout/AppShell.jsx` is the master workspace layout with a collapsible left rail, top command area, main content, and optional right panel.
- `client/src/components/navigation/Sidebar.jsx` and `TopBar.jsx` provide role-aware navigation, command search entry, notifications stub, and user controls.
- `client/src/routes/AuthRoutes.jsx` protects the app shell. Logged-out users are redirected to `/login`, authenticated users enter the workspace, and expired auth events return the user to login.
- `client/src/components/ui/CommandPalette.jsx` provides the global Ctrl/Cmd+K command palette using `cmdk`.
- `client/src/components/ui/Toast.jsx` integrates Sonner dark toasts, with `client/src/lib/toast.js` exporting the toast API.
- `client/src/components/ui` now includes polished shadcn-style primitives: Button, Badge, Card, Dialog, Tooltip, Skeleton, EmptyState, LoadingState, PageHeader, and ConfirmDialog.
- The FAQ frontend now uses the institutional intelligence palette in Tailwind and JS design tokens: deep neutral background, elevated surface, restrained accent blue, and DM Serif Display / DM Sans typography.
- FAQ server state must go through `client/src/hooks/useFaqs.js`, `client/src/hooks/useCategories.js`, and `client/src/hooks/useTags.js`.
- `client/src/pages/faq/FaqExplorer.jsx` owns FAQ discovery with debounced shareable URL search, category/tag/status filters, infinite loading, mobile category bottom sheet, and keyboard-openable FAQ cards.
- `client/src/pages/faq/FaqDetail.jsx` renders official FAQ answers, related FAQs, feedback controls, next-action guidance, and locally remembered recently viewed FAQ links.
- `client/src/pages/admin/FaqEditor.jsx` owns admin create/edit flows with React Hook Form, Zod validation, ReactQuill editing, async taxonomy selection, similarity checks, and publish workflow handling.
- `client/src/hooks/useCommunity.js` centralizes all Community Q&A server state: question lists/details, existing-answer checks, question creation, answer submission, answer loading, and answer feedback.
- `client/src/pages/community/CommunityFeed.jsx` renders the Q&A feed with tabs, status/category/sort filters, card-based questions, and the sticky ask action.
- `client/src/pages/community/AskQuestionFlow.jsx` is the required three-step student submission path. Step 2 performs the mandatory existing-answer check, shows FAQ/resolved-question matches, and records `checkedAt` before submission.
- `client/src/pages/community/QuestionDetail.jsx` renders question status, timeline, answers, duplicate/resolution messaging, related FAQs, and inline answer submission.
- `client/src/pages/student/MyQuestions.jsx` is the personal tracker for student-owned questions.
- `client/src/components/community` contains reusable question cards, answer cards, answer form, and status timeline components.
- `client/src/hooks/useModeration.js` centralizes moderator console server state, optimistic queue actions, FAQ conversion candidates, bulk actions, and moderator analytics.
- `client/src/hooks/useKeyboardShortcuts.js` provides global shortcut registration while respecting text-entry controls.
- `client/src/pages/moderator/ModerationConsole.jsx` is the dense split-view review workspace with priority queue navigation, keyboard shortcuts, contextual review panels, optimistic actions, and toast feedback.
- `client/src/pages/moderator/ReviewQueue.jsx` is the standalone sortable/filterable queue with batch approve/reject/resolve workflows.
- `client/src/pages/moderator/FaqConversionCandidates.jsx` lists FAQ conversion candidates and links admins into a prefilled FAQ editor.
- `client/src/pages/moderator/ModerationAnalytics.jsx` renders moderator-facing operational metrics with Recharts.
- `client/src/components/moderation` contains the reusable action bar, priority dot, and age indicator used across moderation surfaces.
- `client/src/hooks/useAdminAnalytics.js` centralizes admin intelligence server state with 5-minute stale time matching backend cache behavior.
- `client/src/pages/admin/IntelligenceOverview.jsx` is the admin mission-control home with metric cards, action-required insight cards, heatmap preview, unanswered-search clusters, and FAQ quality alerts.
- `client/src/pages/admin/IssueHeatmap.jsx`, `UnansweredSearches.jsx`, `FaqQualityConsole.jsx`, and `ModerationLoadDashboard.jsx` are the full admin intelligence drill-down surfaces.
- `client/src/pages/admin/FaqManagement.jsx` and `UserManagement.jsx` provide dense operational CRUD/control consoles for FAQs and users.
- `client/src/components/admin` contains executive decision components such as `InsightCard` and `MetricCard`; `client/src/components/charts` contains custom heatmap, funnel, and sparkline visualizations.
- `client/src/pages/assistant/GuidedAssistant.jsx` is the focused verified-answer search flow. It calls `/api/assistant/search`, shows the top three verified matches, and routes users to feedback, community asking, or moderator contact without any generated response layer.
- Product microinteractions are documented inline with `// MICROINTERACTION` comments for FAQ card hover, helpfulness click, search focus expansion, moderation queue exit, guided-flow completion, insight-card entry, status-badge pulse, empty-state spring entry, toast entry, and command-palette entry.
- Recent FAQ searches are stored in localStorage through `client/src/lib/recentSearches.js`.

## Useful Commands
- `npm run dev`: run client and server together.
- `npm run build`: build all workspaces.
- `npm run test`: run backend and frontend tests.
- `npm run lint`: lint backend and frontend.
- `npm run seed --workspace server`: seed the local demo database.
- `npm run seed:reset --workspace server`: drop collections and reseed demo data.
- `docker compose up --build`: run MongoDB, the API, and Vite preview for a containerized demo.

## Development Log
- 2026-05-23: Initial MERN monorepo scaffold created with shared schemas, Express foundation, JWT auth, audit logging, Vite React shell, Tailwind, TanStack Query, and test configuration.
- 2026-05-23: Added strict Mongoose models, reusable audited CRUD services, token rotation, shadcn-style UI primitives, and centralized domain constants.
- 2026-05-23: Updated `README.md` with workspace overview and root commands.
- 2026-05-23: Reworked the MongoDB model layer for operational intelligence workloads with slug collision hooks, event TTL indexes, feedback/review/search collections, hidden embeddings, and FAQ quality scoring.
- 2026-05-23: Implemented JWT/bcrypt authentication service, thin auth controllers, bearer-token middleware, RBAC owner-or-role helper, login rate limiter, and Supertest auth coverage.
- 2026-05-23: Implemented FAQ content-management backend with local embeddings, hybrid ranked search, feedback idempotency, view tracking, similarity checks, audited category/tag services, and FAQ Supertest coverage.
- 2026-05-23: Implemented the premium FAQ frontend: explorer, detail view, admin FAQ editor, FAQ cards, command-style search, optimistic helpfulness controls, TanStack Query hooks, design tokens, and route integration.
- 2026-05-23: Implemented Community Q&A backend with hybrid pre-submission duplicate checks across FAQs and resolved questions, enforced fresh existing-answer checks, answer visibility controls, moderation workflows, priority scoring, and 22 Supertest cases.
- 2026-05-23: Implemented Community Q&A frontend with feed, guided ask flow, existing-answer slide-over previews, question detail, student tracker, reusable community components, and TanStack Query hooks.
- 2026-05-23: Implemented Moderation Console frontend with split-view priority queue, keyboard shortcuts, optimistic moderation actions, standalone review queue, FAQ conversion candidates, moderator analytics, and supporting moderation read endpoints.
- 2026-05-23: Implemented analytics and intelligence backend with admin overview, issue heatmap, unanswered-search clustering, FAQ quality decisions, moderation load analysis, audit-log retrieval, narrative generation helpers, and analytics background jobs.
- 2026-05-23: Implemented Admin Intelligence Console frontend with mission-control overview, issue heatmap, unanswered-search management, FAQ quality review, moderation load dashboard, FAQ management, user management, reusable insight/metric/chart components, and admin route integration.
- 2026-05-23: Implemented final polish layer with complete Tailwind/design-system token alignment, Radix/cmdk/Sonner UI primitives, global command palette, role-aware navigation shell, guided assistant search, reusable empty/loading/header/confirm components, and documented microinteraction library.
- 2026-05-23: Implemented demo readiness layer with idempotent seed data, realistic FAQ content, analytics/moderation/client RTL coverage, Docker Compose, workspace `.env.example` files, professional README, and GitHub Actions CI.
- 2026-05-23: Fixed demo navigation polish: app now begins at the login screen when no token is present, stores the signed-in user for role-aware navigation, logout clears the session, and stale question/contact/settings links now resolve to live routes.
- 2026-05-23: Fixed demo credentials for seeded moderators/students by replacing `insertMany` user creation with hook-aware `User.create` arrays and repaired the local MongoDB password hashes. Temporarily removed the `/api/auth/login` rate limiter for demo convenience.
- 2026-05-23: Added `PROJECT_CONTEXT.md`, a detailed standalone project context README for future AI chats and teammate handoff.

## Known Local Setup Notes
- `@xenova/transformers` has been added to `server/package.json`.
- Client polish dependencies include `cmdk`, `sonner`, `@radix-ui/react-dialog`, and `@radix-ui/react-tooltip`.
- Local workspace dependencies use `file:../shared` for npm compatibility while the root still declares `client`, `server`, and `shared` workspaces.
- MongoMemoryServer downloads a MongoDB binary on first test run; `.mongodb-binaries` is ignored so this cache does not enter source control.
- Demo credentials after seeding: `admin@samagama.dev / Admin@1234`, `mod1@samagama.dev` through `mod3@samagama.dev / Mod@1234`, and `student1@samagama.dev` through `student20@samagama.dev / Student@1234`.
- 2026-05-23 verification: `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` passed after the demo readiness layer. Backend coverage is now 64 tests; frontend coverage is now 11 tests.
- Vite still reports a large bundle warning because ReactQuill/markdown/editor/Recharts/cmdk/Radix dependencies are currently in the main bundle. The build succeeds; future polish should add route-level code splitting/manual chunks.
- npm audit currently reports 2 moderate findings in the dependency graph; no forced audit fix was applied to avoid unreviewed major-version churn.
