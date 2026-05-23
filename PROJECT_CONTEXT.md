# Samagama Navigator Project Context

Use this file as the first context document in a new AI chat or when onboarding a teammate. It explains what exists, what constraints matter, how the app runs, where important files live, and what recent demo-specific changes were made.

## Product Summary

Samagama Navigator is an institutional decision-intelligence platform for student-facing knowledge operations. The product combines verified FAQs, a community Q&A flow, moderator review workflows, and admin intelligence dashboards so an institution can turn repeated confusion into governed knowledge.

The product is not a generic helpdesk and not an AI chatbot. It is designed as a premium operational console. Students should find verified answers quickly, moderators should process queues efficiently, and admins should see actionable insight instead of raw analytics noise.

## Non-Negotiable Architecture Rules

- Stack is strictly MERN: MongoDB, Mongoose, Express.js, React with Vite, Node.js.
- No Python.
- No separate vector database.
- No RAG pipeline.
- No AI generation layer or free-form generated answers.
- Semantic matching uses local embeddings only through `@xenova/transformers`.
- Backend route validation uses Zod.
- Shared Zod schemas and constants live in `shared`.
- Authentication uses JWT access tokens, JWT refresh tokens, and bcrypt.
- Frontend server state must go through TanStack Query v5 hooks.
- Forms use React Hook Form with Zod resolvers.
- Styling uses Tailwind CSS and customized local shadcn-style primitives.
- Charts use Recharts only.
- Backend tests use Jest and Supertest.
- Frontend tests use Jest and React Testing Library.

## Repository Shape

```text
FAQ/
  client/                  React + Vite application
  server/                  Express API and Mongoose backend
  shared/                  Shared Zod schemas and constants
  README.md                User/developer-facing project README
  PROJECT_CONTEXT.md       This handoff file
  samagama.md              Running project memory and development log
  docker-compose.yml       Demo container stack
  package.json             npm workspace scripts
```

## Workspace Commands

Run these from the repository root unless noted otherwise.

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run seed --workspace server
npm run seed:reset --workspace server
```

Local development URLs:

```text
Client: http://localhost:5173
API:    http://localhost:5000/api
Health: http://localhost:5000/api/health
```

Docker demo:

```bash
docker compose up --build
```

Docker URLs:

```text
Client preview: http://localhost:5173
API:            http://localhost:3001/api
MongoDB:        localhost:27017
```

## Environment

Root `.env` is loaded by the server:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/samagama_navigator
JWT_ACCESS_SECRET=local-development-access-secret-change-before-production
JWT_REFRESH_SECRET=local-development-refresh-secret-change-before-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Client `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Example files also exist:

```text
.env.example
server/.env.example
client/.env.example
```

## Demo Credentials

After seeding:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@samagama.dev` | `Admin@1234` |
| Moderator | `mod1@samagama.dev` | `Mod@1234` |
| Moderator | `mod2@samagama.dev` | `Mod@1234` |
| Moderator | `mod3@samagama.dev` | `Mod@1234` |
| Student | `student1@samagama.dev` | `Student@1234` |
| Student | `student2@samagama.dev` | `Student@1234` |

Important seed note: moderator and student creation must use `User.create(...)`, not `insertMany`, because the User model hashes `passwordHash` in a pre-save hook. `insertMany` bypasses that hook and will create invalid demo credentials.

## Current Demo Behavior

- The app starts at `/login` when no access token is present.
- The login screen has quick-fill buttons for admin, moderator, and student demo accounts.
- On login, the client stores tokens and a sanitized user object in localStorage.
- The sidebar is role-aware based on the stored user.
- Logout clears local tokens/user and returns to `/login`.
- Stale demo links are covered:
  - `/questions` redirects to `/community`
  - `/questions/new` redirects to `/community/ask`
  - `/settings` renders a settings placeholder page
  - `/contact-moderator` renders a contact placeholder page
- For demo convenience, the `/api/auth/login` route currently has no 15-minute login rate limiter.

## Backend Overview

Main backend entry points:

```text
server/src/server.js
server/src/app.js
server/src/config/env.js
server/src/config/db.js
```

Core backend patterns:

- `app.js` mounts middleware, route modules, 404 handling, and the global error handler.
- Route handlers should stay thin and use `asyncHandler`.
- Business logic belongs in services under `server/src/services`.
- Validation happens in routes with Zod schemas.
- Errors should use `AppError` for expected operational failures.
- Responses should use `sendSuccess` and `sendError` helpers.
- Audit events should go through `logAudit`.

Important backend files:

```text
server/src/middleware/auth.js
server/src/middleware/rbac.js
server/src/middleware/errorHandler.js
server/src/utils/AppError.js
server/src/utils/apiResponse.js
server/src/utils/auditLog.js
server/src/utils/embeddings.js
server/src/utils/narrativeGenerator.js
```

Services:

```text
server/src/services/authService.js
server/src/services/faqService.js
server/src/services/categoryService.js
server/src/services/tagService.js
server/src/services/questionService.js
server/src/services/moderationService.js
server/src/services/analyticsService.js
server/src/services/assistantService.js
```

Routes:

```text
server/src/routes/authRoutes.js
server/src/routes/faqRoutes.js
server/src/routes/categoryRoutes.js
server/src/routes/tagRoutes.js
server/src/routes/questionRoutes.js
server/src/routes/adminRoutes.js
server/src/routes/assistantRoutes.js
server/src/routes/userRoutes.js
```

Models:

```text
server/src/models/User.js
server/src/models/Faq.js
server/src/models/Category.js
server/src/models/Tag.js
server/src/models/Question.js
server/src/models/Answer.js
server/src/models/SearchLog.js
server/src/models/FeedbackEvent.js
server/src/models/ReviewItem.js
server/src/models/AnalyticsEvent.js
server/src/models/AuditLog.js
server/src/models/AnalyticsCache.js
```

All Mongoose schemas use `{ timestamps: true, strict: true }`. FAQ and Question embeddings are hidden with `select: false` and should never be returned to clients.

## Backend Domain Behavior

### Authentication

- `POST /api/auth/login` returns `{ accessToken, refreshToken, user }`.
- JWT payload contains only `sub`, `role`, `iat`, and `exp`.
- Access tokens expire according to `JWT_ACCESS_EXPIRY`.
- Refresh tokens expire according to `JWT_REFRESH_EXPIRY`.
- Refresh token blacklist is an in-memory Set for MVP only; production should move this to Redis with TTL.
- Password hashing uses bcrypt rounds 12.
- Login rate limiting has been temporarily removed for local demo convenience.

### FAQ

FAQ service supports:

- Admin create/update/status transitions.
- Hybrid search with keyword text search and local semantic embedding similarity.
- Feedback with idempotent helpful/not-helpful counts.
- View tracking and recently viewed FAQs.
- Similarity checks before publishing.
- Quality score recalculation.

FAQ embeddings:

- Generated with `@xenova/transformers`.
- Stored as 384-dimensional arrays.
- Field is `select: false`.
- No vector database and no Atlas Vector Search.
- Similarity is computed in application code.

### Community Q&A

Question service supports:

- Mandatory existing-answer check before submission.
- Hybrid duplicate detection across published FAQs and resolved questions.
- Freshness requirement for `existingAnswerCheck.checkedAt`.
- Question list/detail views.
- Answer submission.
- Student answer visibility rules:
  - students see approved answers and their own pending answers
  - moderators/admins see all answers
- Priority score updates for open questions.

### Moderation

Moderation supports:

- Pending queue.
- Answer approve/reject/request changes.
- Resolve question.
- Mark duplicate.
- Recommend FAQ conversion.
- Flag items for admin review.
- FAQ conversion candidate view.
- Moderator analytics.

### Admin Intelligence

Admin analytics returns narrative guidance, not just raw numbers:

- Overview action cards.
- Issue heatmap.
- Unanswered search clusters.
- FAQ quality decisions.
- Moderation load.
- Audit log retrieval.

Narrative strings are pure templates in `server/src/utils/narrativeGenerator.js`. Do not introduce AI generation.

### Guided Assistant

The assistant endpoint is verified-answer search only:

```text
POST /api/assistant/search
```

It returns matched FAQs and approved answers with confidence scores. It must not generate an original answer.

## Frontend Overview

Main frontend entry points:

```text
client/src/main.jsx
client/src/routes/router.jsx
client/src/routes/AuthRoutes.jsx
client/src/components/layout/AppShell.jsx
```

Key frontend infrastructure:

```text
client/src/lib/api.js
client/src/lib/queryClient.js
client/src/lib/tokenStore.js
client/src/lib/designSystem.js
client/src/lib/designTokens.js
client/src/lib/motion.js
client/src/lib/toast.js
client/src/lib/recentSearches.js
```

Design system:

- Background: `#0f1117`
- Surface: `#1a1d27`
- Accent: `#4f8ef7`
- Success: `#22c55e`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Text primary: `#f0f2f8`
- Text muted: `#6b7280`
- Display font: DM Serif Display
- UI/body font: DM Sans

Tailwind config and JS design system exports must stay aligned:

```text
client/tailwind.config.js
client/src/lib/designSystem.js
client/src/lib/designTokens.js
```

Shared UI primitives:

```text
client/src/components/ui/button.jsx
client/src/components/ui/badge.jsx
client/src/components/ui/card.jsx
client/src/components/ui/Dialog.jsx
client/src/components/ui/Tooltip.jsx
client/src/components/ui/Skeleton.jsx
client/src/components/ui/Toast.jsx
client/src/components/ui/CommandPalette.jsx
client/src/components/ui/EmptyState.jsx
client/src/components/ui/LoadingState.jsx
client/src/components/ui/PageHeader.jsx
client/src/components/ui/ConfirmDialog.jsx
```

Be careful with `Button asChild`: it must render exactly one Radix Slot child. Do not add loading icons as Slot siblings.

## Frontend Pages

Auth:

```text
client/src/features/auth/LoginPage.jsx
```

FAQ:

```text
client/src/pages/faq/FaqExplorer.jsx
client/src/pages/faq/FaqDetail.jsx
client/src/pages/admin/FaqEditor.jsx
client/src/components/faq/FaqCard.jsx
client/src/components/faq/SearchBar.jsx
client/src/components/faq/HelpfulnessControls.jsx
```

Community:

```text
client/src/pages/community/CommunityFeed.jsx
client/src/pages/community/AskQuestionFlow.jsx
client/src/pages/community/QuestionDetail.jsx
client/src/pages/student/MyQuestions.jsx
client/src/components/community/QuestionCard.jsx
client/src/components/community/AnswerCard.jsx
client/src/components/community/SubmitAnswerForm.jsx
client/src/components/community/StatusTimeline.jsx
```

Moderation:

```text
client/src/pages/moderator/ModerationConsole.jsx
client/src/pages/moderator/ReviewQueue.jsx
client/src/pages/moderator/FaqConversionCandidates.jsx
client/src/pages/moderator/ModerationAnalytics.jsx
client/src/components/moderation/ActionBar.jsx
client/src/components/moderation/PriorityDot.jsx
client/src/components/moderation/AgingIndicator.jsx
```

Admin:

```text
client/src/pages/admin/IntelligenceOverview.jsx
client/src/pages/admin/IssueHeatmap.jsx
client/src/pages/admin/UnansweredSearches.jsx
client/src/pages/admin/FaqQualityConsole.jsx
client/src/pages/admin/ModerationLoadDashboard.jsx
client/src/pages/admin/FaqManagement.jsx
client/src/pages/admin/UserManagement.jsx
client/src/components/admin/InsightCard.jsx
client/src/components/admin/MetricCard.jsx
client/src/components/charts/CategoryHeatmap.jsx
client/src/components/charts/ResolutionFunnel.jsx
client/src/components/charts/QualitySparkline.jsx
```

Assistant:

```text
client/src/pages/assistant/GuidedAssistant.jsx
```

Navigation:

```text
client/src/components/navigation/Sidebar.jsx
client/src/components/navigation/TopBar.jsx
```

## Frontend Hooks

Server state hooks:

```text
client/src/hooks/useFaqs.js
client/src/hooks/useCategories.js
client/src/hooks/useTags.js
client/src/hooks/useCommunity.js
client/src/hooks/useModeration.js
client/src/hooks/useAdminAnalytics.js
client/src/hooks/useAssistant.js
```

Utility hooks:

```text
client/src/hooks/useKeyboardShortcuts.js
client/src/hooks/useDebouncedValue.js
```

Do not scatter manual `fetch` calls across components. Use these hooks or add a new hook near the relevant domain.

## Shared Package

Shared schemas and constants live here:

```text
shared/schemas/
shared/constants/
```

The shared workspace is consumed by both server and client. Keep validation schemas as the single source of truth when possible.

## Seed Data

Seed files:

```text
server/src/seed/seedData.js
server/src/seed/faqContent.js
```

Seed creates:

- 1 admin
- 3 moderators
- 20 students
- 6 categories
- 20 tags
- 40 FAQs
- 60 community questions
- 80 answers
- 200 search logs
- 100 feedback events
- 30 review items
- 50 analytics events
- 20 audit logs

Run:

```bash
npm run seed --workspace server
```

Reset and reseed:

```bash
npm run seed:reset --workspace server
```

The seed is idempotent and checks for `admin@samagama.dev`.

## Tests

Backend tests:

```text
server/src/__tests__/auth.test.js
server/src/__tests__/faq.test.js
server/src/__tests__/questions.test.js
server/src/__tests__/analytics.test.js
server/src/__tests__/moderation.test.js
server/tests/integration/health.test.js
```

Frontend tests:

```text
client/src/__tests__/FaqExplorer.test.jsx
client/src/__tests__/AskQuestionFlow.test.jsx
client/src/components/layout/AppShell.test.jsx
```

Known passing verification after demo readiness:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Known counts from latest full verification:

```text
Backend: 64 tests passing
Frontend: 11 tests passing
```

When running backend tests for the first time, `mongodb-memory-server` may download a MongoDB binary.

## Current Known Caveats

- Vite reports a large bundle warning because editor, markdown, Recharts, cmdk, and Radix dependencies are currently bundled together. The build succeeds. Future work should add route-level code splitting or manual chunks.
- npm audit previously reported 2 moderate dependency findings. No forced audit fix was applied to avoid unreviewed major-version churn.
- Login rate limiting is intentionally disabled for demo convenience. Re-enable `loginRateLimiter` in `server/src/routes/authRoutes.js` before production hardening.
- Refresh token revocation is in-memory for MVP. Use Redis with TTL for production.
- The frontend stores the sanitized user in localStorage for role-aware navigation. This is fine for demo UX, but backend authorization remains the source of truth.
- Some operational screens have placeholder actions where full backend endpoints were outside the immediate demo scope.

## Recent Important Changes

- Added protected routing with `client/src/routes/AuthRoutes.jsx`.
- Login is now the first screen for logged-out users.
- Login page includes quick-fill buttons for demo credentials.
- Sidebar and topbar use the signed-in user's role.
- Logout clears tokens and user data.
- Removed stale route dead ends by adding redirects and placeholder pages.
- Fixed seeded moderator/student credentials by using hook-aware `User.create`.
- Removed login rate limiting temporarily for demo convenience.
- Added `PROJECT_CONTEXT.md` as this reusable handoff document.

## How To Approach Future Changes

1. Read `PROJECT_CONTEXT.md` first.
2. Read `samagama.md` second for detailed development history.
3. Check existing patterns before adding new abstractions.
4. Keep route handlers thin; put business logic in services.
5. Keep frontend server state in TanStack Query hooks.
6. Keep styling within Tailwind and existing UI primitives.
7. Update `samagama.md` after meaningful project changes.
8. Run focused tests for the touched domain.
9. Run `npm run lint` before handing back.
10. Mention any commands that could not be run.

## High-Value Demo Path

Use this path for a 15-20 minute walkthrough:

1. Login as student: `student1@samagama.dev / Student@1234`.
2. Open FAQ Explorer and search for terms like `upload failed`, `stipend`, or `noc approval`.
3. Open an FAQ and submit helpfulness feedback.
4. Go to Community and start the Ask Question flow.
5. Show Step 2 existing-answer detection as the key trust-building moment.
6. Login as moderator: `mod1@samagama.dev / Mod@1234`.
7. Open Moderation Console and process a queue item.
8. Login as admin: `admin@samagama.dev / Admin@1234`.
9. Open Intelligence Overview and show action-required cards, heatmap, unanswered searches, and FAQ quality.

## Quick Troubleshooting

If the frontend shows Page Not Found for a sidebar item:

- Check `client/src/routes/router.jsx`.
- Check `client/src/components/navigation/Sidebar.jsx`.
- Add a real route, a redirect, or remove the link.

If demo credentials fail:

- Confirm seed users exist in MongoDB.
- Confirm users have bcrypt hashes in `passwordHash`.
- Do not use `insertMany` for seeded users unless manually hashing passwords first.
- Run `npm run seed:reset --workspace server` if the local data can be reset.

If the app opens directly to dashboard instead of login:

- A token exists in browser localStorage.
- Use logout or clear site data for `localhost:5173`.

If server fails fast:

- Check root `.env`.
- Ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are at least 32 characters.
- Ensure MongoDB is running and reachable from `MONGODB_URI`.

If semantic embedding is slow on first use:

- This is expected. `@xenova/transformers` downloads and caches the all-MiniLM-L6-v2 model on first load.
