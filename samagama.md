# Samagama — Engineering Memory Log

> Append-only logbook. Every meaningful change appends a new entry. Don't edit history; add a follow-up entry instead.

---

## 2026-05-25 — Phase 0: Foundation

### What was completed

- npm workspace monorepo: `apps/client`, `apps/server`, `packages/shared`.
- Root tooling: TypeScript shared base config, ESLint flat config, Prettier, `.gitignore`.
- `@samagama/shared` package with:
  - `constants.ts` — duplicate thresholds, RAG defaults, `COMMUNITY_ANSWER_CAP`, pagination, JWT TTLs, etc.
  - `enums.ts` — `USER_ROLES`, `QUESTION_TYPES` (personal/community), `ANSWER_STATUSES`, etc.
  - Zod schemas: `auth`, `faq`, `qna`, `common`. Inferred TypeScript types are exported alongside.
  - Public surface via single `index.ts` barrel.
- `PROJECT_CONTEXT.md` and this log.

### Why

Laying foundation correctly avoids tech drift later. The shared package is the lever that prevents Zod-schema duplication between client and server — one of the most common sources of MERN architecture rot.

### Architectural decisions

- **npm workspaces, not pnpm/turbo.** PRD says "no microservice sprawl" — keeping tooling minimal honors that. Node 20+ workspaces are good enough at this scale.
- **Zod over Joi.** Zod's `z.infer` gives free TypeScript types; Joi requires a separate type definition.
- **`as const` tuples for enums.** Lets each enum value drive both a runtime check and a literal-union TypeScript type with no extra code.
- **`.js` extensions on relative imports** (in `.ts` files) — required by ESM resolution under `module: ESNext` + `moduleResolution: Bundler`. TypeScript compiles them through unchanged.

### Tradeoffs

- Strict TS settings (e.g. `strict: true`, `noImplicitReturns`) will slow initial scaffolding but pay back during refactors.
- Single Prettier config with `printWidth: 100` — slightly wider than the default, matches the prose-heavy nature of services.

### Constraints discovered

- The change spec assumes existing files (`apps/client/src/layouts/navigation.ts`, etc.). Building these files from scratch _with the change-spec adjustments already applied_ is the correct interpretation, since no prior baseline exists.

### TODOs

- ESLint react/react-hooks plugins (Phase 7).
- Husky + lint-staged commit hooks (Phase 7).
- ADRs for: provider adapter pattern, vector index design, embedding refresh strategy.

---

## 2026-05-25 — Phase 1: Backend Core (Auth Slice)

### What was completed

- Express app factory in `apps/server/src/app.ts` with: helmet, CORS (allow-listed), JSON body parser (1 MB cap), morgan, global rate limit (200 req/min/IP), API prefix routing, central error handler, 404 handler.
- `config/env.ts` with Zod-validated env loader. Required: `MONGODB_URI`, JWT secrets ≥32 chars. Fail-fast on misconfiguration.
- `config/database.ts` connection lifecycle with credential redaction in logs.
- `config/logger.ts` Pino with redaction of `authorization`, `cookie`, `password`, `passwordHash` paths.
- `utils/api-error.ts` — typed `ApiError` class with static factories (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `unprocessable`, `internal`).
- `utils/jwt.ts` — sign/verify access (1 h) + refresh (7 d) tokens. Refresh tokens carry a `tokenVersion` claim that the User model bumps on password change.
- `middlewares/validate.ts` — generic Zod validator that replaces `req[source]` with parsed data so handlers see typed input.
- `middlewares/auth.ts` — `requireAuth` (Bearer JWT) + `requireRole` (RBAC). Augments `Express.Request` with a typed `req.user`.
- `models/User.model.ts` — PRD §12.1 schema, with `tokenVersion` for refresh-token revocation and `recentlyViewedFaqs[]` (Change Spec compatible).
- `services/auth.service.ts` — `register`, `login`, `refresh`, `getProfile`. Bcrypt with cost 12. Role assignment at registration limited to admins.
- `controllers/auth.controller.ts` — five thin handlers.
- `routes/auth.routes.ts` — declarative wiring with a tighter rate limit (10/15min) on `/login`.
- Smoke test `health.test.ts` exercising `/api/health` and 404 handling via Supertest.

### Why

Auth is the shared dependency for every other phase, so it ships first.

### Architectural decisions

- **Stateless JWT.** Refresh-token revocation via `tokenVersion` rather than a server-side token store. Lower MVP complexity; revisit if we need per-device session listing.
- **Bcrypt rounds = 12.** Standard for 2026 hardware. Documented here so future tuning is intentional.
- **Tighter login rate-limit.** Mitigates credential stuffing per PRD §19.2.
- **Body parsers capped at 1 MB.** Tightens DoS surface; large media (screenshots) will route through a separate upload endpoint when implemented.
- **Controllers never import models.** They import services. Services import models. This keeps the dependency graph clean.

### Tradeoffs

- No OAuth / SSO. PRD permits integration with existing Samagama auth "if available"; we deferred until that integration is confirmed.
- Logout is client-side only (token discard). Server-side blacklisting is unnecessary for stateless JWTs at MVP scale.

### Testing notes

- `health.test.ts` runs without a DB. It exercises the Express pipeline (CORS, helmet, error envelope shape, 404 handler).
- Auth tests against the DB will land in Phase 7 hardening with `mongodb-memory-server`.

### Risks

- If `JWT_*_SECRET` env vars leak, all sessions are forgeable. Documented in `.env.example`; rotation procedure goes in an ADR (TODO).

---

## 2026-05-25 — Phase 2: Frontend Core

### What was completed

- Vite + React 18 + TypeScript app at `apps/client`.
- Theme system: `data-theme="light|dark"` on `<html>`, CSS custom properties in `globals.css`. Persisted in localStorage.
- TanStack Query client with sane defaults (1 retry, 30 s stale time, no refetch-on-focus).
- Axios `apiClient` with interceptors that attach the access token and surface server-side error messages.
- `AuthProvider` that bootstraps from stored tokens (uses access if present, falls back to refresh exchange) and exposes `login`/`logout`.
- `RequireAuth` route guard with redirect to `/login` and a loading state while bootstrap completes.
- `LoginPage` using React Hook Form + the shared `loginSchema`. Inline error display + server error surfacing.
- `AppShell` (sidebar + topbar + outlet) and `Sidebar` driven by `navigation.ts`.
- `navigation.ts` with the change-spec-correct student menu (no Recently Viewed, no Yaksha link).
- `ChatbotFab` floating button — rendered only for `role === 'student'` per Change Spec §4. Has `aria-label="Open Yaksha Chatbot"`.
- Routes for all student/moderator/admin pages with `ComingSoonPage` placeholders for upcoming phases.

### Why

Foundation needs to render at least one page end-to-end so future phases plug in cleanly.

### Architectural decisions

- **CSS custom properties over a CSS-in-JS framework.** No new dependency, consistent with the prototype's inline-style aesthetic, easy to extend with more themes later.
- **localStorage for tokens, not cookies.** Cookie/CSRF complexity isn't justified at MVP scale; revisit if we add SSR or stricter PCI-style requirements.
- **Sidebar groups derived from `section` markers** in `navigation.ts`. Keeps the nav config flat and easy to mutate.
- **`<RequireAuth>` wraps `<AppShell>`** so the shell never renders for unauthenticated users. Reduces flicker.

### Tradeoffs

- No global error boundary yet — relying on TanStack Query's per-query error states. Will add a top-level boundary in Phase 7.
- Route-based code splitting deferred until route count grows; over-splitting now would slow dev rebuilds for marginal gain.

### TODOs

- Replace inline styles with a small set of styled primitives (`Card`, `Button`, `Badge`) once Phase 3 starts using them at scale — they'll be lifted from the prototype.
- Add `useNavByRole` hook to derive nav from auth context, so deep components don't pass role around.

### Risks

- localStorage is XSS-readable. Sanitize all rendered HTML rigorously when rich-text answers land (PRD §19.2).

---

## 2026-05-25 — Phase 0–2 Verification

### Self-check (executed)

- `npm install` → ok (578 packages, 5 moderate audit advisories — none in our direct deps; review during Phase 7).
- `npm run build:shared` → ok.
- `npm run typecheck` (all workspaces) → ok.
- `npm run lint` → 0 errors, 0 warnings.
- `npm run format:check` → clean (after one auto-format pass).
- `npm run build:server` + `npm run build:client` → ok. Client bundle: 345 KB raw / 108 KB gzip.
- `npm test` → 8/8 tests pass:
  - server: health endpoint smoke test, structured 404 envelope.
  - client: navigation rules (no `/chatbot`, no `/recent` in student menu) + ChatbotFab accessibility.

### Risks logged

- 5 npm advisories from transitive deps; will audit and pin in Phase 7.
- Token refresh assumes a single refresh token at a time. Multi-device sessions need a per-device store later.

---

## 2026-05-25 — DEV-ONLY: Login page role switcher

### What was completed

- New isolated component `apps/client/src/features/auth/DevCredentials.tsx` exposing one-click role presets (admin / moderator / student) on the login page.
- Wired into `LoginPage.tsx` behind `import.meta.env.DEV` so Vite tree-shakes it out of production bundles.
- Server-side `apps/server/src/scripts/seed-dev-users.ts` upserts the three matching accounts (refuses to run when `NODE_ENV=production`). Run via `npm run seed:dev-users` in the server workspace.
- Test suite `LoginPage.test.tsx` (3 tests) verifies: panel renders in dev, all three role buttons exist, clicking a role auto-fills + calls `login()` with the right credentials.

### Why

Speeds up role-switching during development without leaking creds into prod.

### Architectural decisions

- **Single dedicated component file** (vs inlining in LoginPage) — removal is `rm DevCredentials.tsx` plus deleting two clearly-marked lines in LoginPage. No spelunking.
- **`import.meta.env.DEV` over `NODE_ENV` checks** — Vite statically replaces this expression at build time, allowing the dead-code elimination. We confirmed this with `grep "samagama.test" apps/client/dist/assets/*.js` → 0 hits in production output.
- **Seed script refuses to run with `NODE_ENV=production`** — defense in depth; even if the script survives a bad merge, it can't quietly create test accounts in prod.
- **`shouldValidate: true` on `setValue`** — keeps RHF's error state consistent if a click ever fails validation.

### Removal procedure (for the eventual cleanup PR)

1. Delete `apps/client/src/features/auth/DevCredentials.tsx`.
2. In `LoginPage.tsx`, remove the `DevCredentials` import, the `setValue` destructure if unused elsewhere, the `handleDevPreset` function, and the `{import.meta.env.DEV && <DevCredentials …/>}` block.
3. Delete `apps/client/src/features/auth/__tests__/LoginPage.test.tsx` (or just the dev-credentials describe block if other LoginPage tests have been added).
4. Delete `apps/server/src/scripts/seed-dev-users.ts` and the `seed:dev-users` script in `apps/server/package.json`.
5. (Optional) Drop the seeded accounts from any dev DBs.

### Self-check

- Lint: ✅ 0 errors
- Typecheck (all workspaces): ✅
- Tests: ✅ 11/11 (was 8, +3 new)
- Production build: ✅ + `grep` confirms no dev creds in `dist/assets/*.js`

---

## 2026-05-25 — Phase 3: FAQ System

### What was completed

- **Shared schemas added:** `category.schema.ts`, `tag.schema.ts`. Extended `faq.schema.ts` with `PublicFaq` (the role-aware response shape).
- **Models:** `Category.model.ts`, `Tag.model.ts`, `Faq.model.ts`. FAQ has a text index over (title 10×, summary 5×, answer 1×), compound `(status, updatedAt)`, and array indexes on `categories` and `tags`. Slugs are auto-derived in pre-validate hooks.
- **Services:** `category.service.ts`, `tag.service.ts`, `faq.service.ts`. The FAQ service is the heaviest piece — list/search with hybrid sort, role-aware projection, atomic view counter, idempotent helpful/unhelpful feedback, and a bounded LRU of recently-viewed FAQs on the user.
- **Controllers + routes:** thin controllers (`category.controller.ts`, `tag.controller.ts`, `faq.controller.ts`); declarative routers mounted at `/api/categories`, `/api/tags`, `/api/faqs`.
- **Seed script `seed:faqs`** — upserts the 10 canonical categories, 18 starter tags, and 8 published FAQs lifted from the prototype data.
- **UI primitives** (`Card`, `Badge`, `Button`, `SectionHeader`) lifted from the prototype style. Phase 4 will reuse these heavily.
- **`FaqCard`** with collapse/expand, role-aware feedback (Change Spec §7.2 + §7.3 — students never see raw counts), and one-vote-per-user UI state.
- **`FaqsPage`** wired at `/faqs`: 300ms debounced search, category chips, status filter (mod/admin only), loading/error/empty states, role-aware FaqCard.
- **TanStack Query hooks** (`useFaqList`, `useFaqDetail`, `useCategories`, `useTags`, `useFaqFeedback`, `useRecordFaqView`) with proper invalidation on feedback.

### Why

Phase 4 (the change spec multi-step Ask flow) needs a real FAQ store for the duplicate check. Doing FAQ → Q&A in this order avoids stubs.

### Architectural decisions

- **Vector search deferred to Phase 6.** Text search via Mongo text indexes ships now; embedding generation lands when we have an embedding service for the chatbot. Documented and intentional, not skipped.
- **Role-aware projection inside the service.** The wire format never carries `helpfulCount` for students, so a careless render can't leak it. Lock-in test: `FaqCard.test.tsx` "hides raw helpful/unhelpful counts from students".
- **Idempotent feedback.** One vote per user, switching helpful↔unhelpful is a single update. Verified live with two POSTs returning 204 and a moderator seeing exactly count=1.
- **`recently-viewed` is a bounded LRU on the User doc.** No separate collection; `$slice` keeps it capped at `RECENT_FAQS_LIMIT` (25). Sufficient for the MVP.
- **Sort defaults match the change spec.** When no query: `updatedAt desc, viewCount desc` (§7.1). When a query is present and sort is `relevance`, the `$text` `$meta` score wins, falling back to `updatedAt`.
- **Slug + timestamp suffix at create time** (instead of round-tripping on slug conflict). Keeps FAQ creation a single round trip; the suffix is short (base36 of `Date.now()`), so URLs stay readable.

### Tradeoffs

- The seed script uses `findOneAndUpdate` keyed by **title** for FAQs (not slug). This means re-running with an edited title will create a duplicate. Acceptable for dev seed; will revisit if we add a full reset script.
- No FAQ detail page yet — the dropdown reveal in `FaqCard` covers the prototype's UX. A dedicated `/faqs/:id` page can be added when SEO or deep linking matters.

### TODOs

- Embedding generation hook on FAQ publish (Phase 6).
- Admin FAQ editor screen (Phase 5 will use the existing schemas + service unchanged).
- `useRecentlyViewedFaqs` hook + a small "Recently viewed" rail on the home page when Phase 5 lands.

### Live verification (executed against running server)

- `curl /api/health` → 200.
- Login as `student@samagama.test` → 200, returns access token.
- `GET /api/faqs` (student) → 8 items, `helpfulCount` undefined (hidden) ✓
- `GET /api/faqs` (moderator) → 8 items, `helpfulCount` and `unhelpfulCount` present ✓
- `GET /api/faqs?q=NOC` → 2 results matching NOC FAQs (text index works) ✓
- `GET /api/faqs?category=<Stipend id>` → 1 result, exactly the stipend FAQ ✓
- `POST /api/faqs/:id/feedback {helpful}` twice → both return 204; moderator sees `helpfulCount: 1` (idempotent) ✓

### Self-check

- Lint: ✅ 0 errors
- Typecheck (3 workspaces, strict): ✅
- Tests: ✅ 15/15 (was 13, +4 FaqCard role-aware tests; one false positive in test regex `/helpful/i` was tightened to `/^helpful$/i`)
- Build (shared + server + client): ✅
- Live API smoke: ✅ (8 FAQs seeded, role-aware projection verified)

---

## 2026-05-25 — Phase 4: Community Q&A + Change Spec §5–§6

### What was completed

- **Models:** `Question.model.ts` (with all Change Spec §8.1 additions: `type`, `screenshotUrl`, `taggedStudents`, `moderatorViewedAt`), `Answer.model.ts` (with §8.2 upvote/downvote tracking).
- **Shared schemas extended:** `qna.schema.ts` now also exports `PublicQuestion`, `PublicAnswer`, `ExistingAnswerCheckResult`, `PublicFaqMatch`, `PublicQuestionMatch`.
- **Services:**
  - `qna.service.ts` — checkExisting (with signed token), createQuestion (token-gated), tagMe, list/get questions with role-aware visibility, list/submit answers with cap enforcement, vote toggle.
  - `moderation.service.ts` — approve/reject answers, list pending. `approveAnswer` accepts `editedBody` for §5.5 edit-and-approve, and flips the question to `resolved` on first approval.
- **Controllers + routes:** `qna.controller.ts` + `qna.routes.ts` (mounted `/api/qna`), `moderation.controller.ts` + `moderation.routes.ts` (mounted `/api/moderation`, gated by `requireRole('moderator', 'admin')`).
- **Frontend pages:**
  - `AskQuestionPage` — full multi-step flow (write → faq-match → question-match → submit → done), with the signed token gating both `tagMe` and `createQuestion`.
  - `MyQuestionsPage` — Personal/Community tabs, WhatsApp-style ticks for personal questions (Change Spec §5.3).
  - `CommunityPage` — public board with status filters.
  - `QuestionDetailPage` — question + answers thread with **progressive reveal** (top 1 → top 3 → all 10 per §5.5), **pre-answer prompt**, answer cap enforcement, upvote/downvote.
  - `PendingAnswersPage` — moderator queue with **Approve / Reject / Edit & Approve**.
- **TanStack Query hooks** with proper cache invalidation on submit/approve/reject/vote.

### Why

This is the change spec proper. Phase 3 deliberately landed first so this phase has a real FAQ store for the duplicate check.

### Architectural decisions

- **Signed JWT for the existing-answer check token** (15-min TTL, scoped to `userId + title hash`). Avoids storing pre-submission state on the server. Requires the user to actually run the check before submitting (PRD QNA-002).
- **Server-side answer cap.** UI also enforces, but `submitAnswer` has the authoritative `answerCount >= COMMUNITY_ANSWER_CAP` guard.
- **`displayState` is computed in the projection**, not stored. Personal-question UX state derives from `moderatorViewedAt` + `answerCount` + `status`. Future-proof: if the rules change, only the projection changes.
- **Setting `moderatorViewedAt` on first mod/admin GET of a personal question** is a single-write side effect using a conditional `$exists` filter so it's atomic and idempotent.
- **Visibility:**
  - Students see community questions + their own personal questions. Personal questions of others 404 to students.
  - Students see only `approved` answers. Mods/admins see all.
- **Vote toggling.** `up→up` cancels (sets myVote to null). `up→down` flips both counters in one update.
- **Self-answer prevention.** `submitAnswer` rejects if `askedBy === userId`. UI also hides the form for the asker.
- **Edit-and-approve** is the same endpoint as approve — it just accepts `editedBody`. Single action, two ergonomic options for the moderator. Keeps the API surface small.

### Tradeoffs

- The check token is a JWT with the user's title hash. Editing the title between check and submit invalidates the token (intentional — we want the user to re-check if they reword). The error is a 403, which the UI surfaces as a banner.
- No flag/report endpoints yet (PRD §13.5). Moderation queue currently shows only pending answers. Flag review and unresolved/duplicate queues land in Phase 5.
- No file-upload route for screenshots — the schema accepts a `screenshotUrl`, but the UI form only takes a URL string for now. Inline upload (S3 / GridFS) is a Phase 7 hardening task.
- "Show top 3" / "Show all" reveal is client-only state. If two users disagree on what "top" means, both see the same answer because server already sorts by `upvoteCount desc`.

### Live verification (against running server)

- `POST /qna/check-existing { title: "How to download my NOC certificate?" }` → 2 FAQ matches (text-index score ≈ 35.86), signed token issued ✓
- `POST /qna/questions { type: "personal", existingAnswerCheckToken }` → 201, question created ✓
- `GET /qna/questions?type=personal&mine=true` (student) → returns the question with `displayState: "posted"` ✓
- Moderator opens the question → student re-fetches → `displayState` flipped to `"seen"` ✓ (atomic side effect works)
- Student tries to answer their own community question → 403 "You cannot answer your own question" ✓
- Moderator submits a peer answer → 201 with `status: "pending"` ✓
- Moderator `PATCH /moderation/answers/:id/approve { editedBody: "..." }` → 204 ✓
- Question status auto-flips to `"resolved"` ✓ (Change Spec §5.5 first-approval rule)
- Student fetches answers → only the approved (edited) body returned ✓ (visibility + edit-and-approve work together)

### Self-check

- Lint: ✅ 0 errors
- Typecheck (3 workspaces, strict): ✅
- Tests: ✅ 16/16 (was 15, +1 for `MyQuestionsPage` ticks). Two type-system bugs were caught at typecheck and fixed before any green run: (1) duplicate `QUESTION_TYPES` import in qna.schema.ts; (2) re-declaring `upvotes/downvotes` as optional on `PopulatedAnswer` when the Mongoose schema gives them a default `[]`.
- Build (shared + server + client): ✅ client 398.28 KB / 120.89 KB gzip
- Live API smoke (above): ✅ end-to-end multi-step Ask → personal question → moderator-viewed transition → community question → peer answer → edit-and-approve → resolved

### TODOs for Phase 5

- Flagged FAQs queue + Flag model.
- Unresolved-questions queue + duplicate-candidates queue (vector search dependency may push duplicate candidates to Phase 6).
- Admin dashboards (FAQ management table, category/tag management, user management).
- Audit log.

---

## 2026-05-25 — Dashboard Spec: Admin & Moderator updates

### What was completed

**Backend:**

- New `Flag` model (PRD §12.7) with a partial unique index that enforces one open/under_review flag per (user, entity).
- New `stats.service.ts` aggregating Helpful% and Flagged% with documented formulas, plus a `getModeratorStats` for the two-card dashboard.
- New `/api/stats/faqs` and `/api/stats/moderator` endpoints, gated by `requireRole('moderator', 'admin')`.
- Extended `faq.service.update()` to **reset helpful/flagged stats and outstanding flags when the answer body changes**. Title/summary/category/tag edits do NOT trigger the reset (intentional scope). The controller resolves outstanding flags via a `Flag.updateMany` after the FAQ save.
- `faqListQuerySchema` now supports `filter: 'helpful' | 'flagged'` for the FAQ Management filter chips.
- FAQ create/update/archive routes now allow **both admin and moderator** (Dashboard Spec: shared management).
- Category/tag mutation routes also opened to moderator role.
- `moderation.service.listPendingAnswers()` now returns each pending answer with `taggedStudents: { id, name }[]` so the moderator UI can show "X students asked the same question" and prioritize multi-asker first.

**Frontend:**

- `navigation.ts` rewired:
  - Moderator menu reduced to: Dashboard, Unresolved Questions, FAQ Management, Chatbot Feedback. Removed: Pending Answers (renamed), Flagged FAQs (now in FAQ Management), Duplicate Candidates, Browse FAQs, redundant Unresolved Questions entry.
  - Admin menu: Categories and Tags removed from sidebar (they live as tabs inside FAQ Management). Added Unresolved Questions entry shared with the moderator.
- New `FaqManagementPage` with Helpful%/Flagged% cards + tabs (FAQs / Categories / Tags). Each tab is its own component (`FaqsAdminTab`, `CategoriesAdminTab`, `TagsAdminTab`).
- `InlineFaqEditor` shared by create-new and edit-existing flows; surfaces the `statsReset` warning banner returned by the API when the answer changes.
- New `UnresolvedQuestionsPage` with two subsections (Personal / Community), a "prioritize multi-asker" toggle, multi-asker badge with click-to-reveal student names, and the Show More cycle (1 → +2 → all 10 → back to 1).
- New `ModerationOverviewPage` with only two cards (Unresolved Questions, Flagged FAQs).
- `ChatbotFeedbackPage` stub with the new card layout (Helpful + Flagged) and chat-list placeholder; real wiring lands with the chatbot in Phase 6.
- Router: `/moderation/pending` redirects to `/moderation/unresolved`; `/admin/categories` and `/admin/tags` redirect into the FAQ Management tabs page.
- `navigation.test.ts` extended with five Dashboard Spec lock-ins (no legacy items, renamed entry, no top-level categories/tags, shared FAQ Management path).

### Why

Single source of truth for FAQ management (no more separate Categories / Tags pages); moderators and admins get parity (PRD principle: "shared moderation"); stat-reset on edit prevents stale "this is helpful" votes from carrying across rewrites.

### Architectural decisions

- **`statsReset` is server-authoritative.** The service compares old vs new answer body and zeroes counters + clears vote arrays in the same transaction as the save. The controller then resolves outstanding flags. UI just shows the banner from the response.
- **Flag-resolution is fire-and-forget.** It runs after the response is returned (`void`). The user has already seen the success state; flags becoming "resolved" is a downstream cleanup.
- **Helpful% formula:** average of `helpfulCount / (helpful + unhelpful)` across published FAQs that have any vote. Defined in `stats.service.ts` so it's auditable.
- **Multi-asker prioritization is client-side sort.** Server returns the queue in `createdAt asc` (FIFO is the moderation default); the client toggles to `taggedStudents.length desc` when prioritization is on. This keeps server logic minimal and lets each moderator pick their own ordering.
- **Show More cycling** is local card state; it doesn't fetch additional answers (the queue endpoint exposes one pending answer per row). When the moderator question-detail view ships in a later iteration, the cycle will drive a real fetch.
- **Chatbot Feedback page renders zeros**, not "Coming Soon". The agreed layout (cards, filter, count, list) is in place — Phase 6 just wires the data, no UI rewrite.

### Tradeoffs

- **Stat reset is scoped to answer edits only.** Title/category/tag changes do not invalidate previous votes. Tradeoff: a major retitle that changes meaning will keep the old votes. We can broaden the rule later if it bites.
- **Flag count surfaced via `flagCount` (number)** rather than recomputing from the Flag collection on every list. Trades freshness for query speed; flags created post-publish will only show up after an explicit recount or when the related FAQ is touched. Acceptable for the MVP since a flag-create endpoint will increment the counter directly.
- **Personal Questions list in `UnresolvedQuestionsPage` shows description without an answer form.** Sending a "moderator answer" on a personal question is a feature for a follow-up — currently moderators see the question and resolve it out-of-band.
- **Show More button on the pending-review card** is wired to local state only. The "+2 / all 10" copy promises a fetch that happens in a subsequent task. Documented here so it doesn't get forgotten.

### Live verification

- `GET /api/stats/faqs` (moderator) → `helpfulPercentage: 100, flaggedCount: 0` after one helpful vote on one FAQ ✓
- `GET /api/stats/moderator` → `unresolvedQuestions: 1, flaggedFaqs: 0` ✓
- `GET /api/faqs?filter=helpful` → returns only the FAQ with `helpfulCount > 0` ✓
- `PATCH /api/faqs/:id { answer: "..." }` → response `{ id, statsReset: true }`, `helpfulCount` re-fetched as 0 ✓
- `PATCH /api/faqs/:id { summary: "..." }` → response `{ id, statsReset: false }`, `helpfulCount` preserved ✓
- Moderator-role create/edit/archive of FAQs returns 200/204 (was 403 before route opened up) ✓

### Self-check

- Lint: ✅ 0 errors, 0 warnings
- Typecheck (3 workspaces, strict): ✅
- Tests: ✅ 20/20 (was 16, +4 new navigation lock-ins for the moderator/admin menu changes)
- Build: ✅ client 423.70 KB / 125.42 KB gzip
- Live API smoke: ✅ stat reset rule, role-aware filters, moderator-write permissions all verified

### TODOs

- Real flag-create endpoint + UI ("flag this FAQ" buttons for students). Currently the Flag collection exists but only the auto-resolution path writes to it.
- Backfill stats job: when stat reset rule was introduced, existing FAQs keep their pre-reset counts. A one-shot reset script can be added if needed; for now the MVP demo data is small enough that re-seeding suffices.
- Phase 6 chatbot wires real data into ChatbotFeedbackPage.

---

## 2026-05-25 — Dashboard Spec follow-up: flag system, show-more wiring, chatbot feedback data

Closing the three "deliberately scoped out" items from the Dashboard Spec PR.

### What was completed

**Flag system (write path + queue):**

- `flag.schema.ts` added to `@samagama/shared` with `flagCreateSchema`, `flagUpdateStatusSchema`, `flagListQuerySchema`, and the `PublicFlag` type.
- `flag.service.ts` with idempotent `createOrUpdate` (PRD §8.8 — one open flag per user per entity), `list`, `updateStatus`. Maintains the FAQ's denormalized `flagCount` correctly: increments only on a NEW open flag, decrements on transition out of a live status (`open` / `under_review`).
- Routes mounted at `/api/flags`. Create is open to any authenticated user; list and status updates require moderator/admin.
- `FlagFaqButton` component (student affordance) — opens an inline dialog with the five PRD reasons (incorrect / outdated / duplicate / unclear / other) plus an optional details textarea. Wired into `FaqCard` only for students.
- `FlagInbox` component shown above the FAQ table inside FAQ Management when the "Flagged" filter is active. Lists open + under_review flags with reason, reporter, details, and Resolve / Dismiss buttons.

**Show More cycle now fetches real data:**

- New `GET /api/moderation/questions/:id/pending-answers?limit=N` returns the question's pending answers in submission order, capped at `COMMUNITY_ANSWER_CAP` (10).
- `usePendingAnswersForQuestion` hook fetches lazily (`enabled: reveal > 1`) so the network call only fires when the moderator clicks Show More.
- The `ReviewCard` in `UnresolvedQuestionsPage` now renders the additional pending answers inline when revealed, deduped against the row already shown.

**Chatbot feedback data path:**

- `ChatFeedback` model (PRD §12.9) with `query` / `answer` snapshot fields so each row is self-contained even before the chatbot ships.
- `chatbot.service.ts` exposing `listFeedback(filter)` and `getStats()`.
- Routes at `/api/chat/feedback` and `/api/chat/feedback/stats`, gated to moderator/admin.
- `seed:chat-feedback` script that upserts 5 demo rows (3 helpful, 2 incorrect with comments) keyed by `(userId, query)`.
- `ChatbotFeedbackPage` rewritten to consume the real endpoints — stats cards, filter chips, total count, and a list with rating header / query / answer preview / optional comment.

**Tests:**

- `FlagFaqDialog.test.tsx` (3 tests): button renders, dialog submits with default reason, reason chip switching is wired.
- Existing 18 tests still pass; total 21 client + 2 server = 23.

### Why

The Dashboard Spec called these three items "scoped out". Bringing them in now keeps the spec coherent end-to-end without dragging Phase 5 hardening forward.

### Architectural decisions

- **Flag idempotency uses a partial unique index** on (`reportedBy`, `entityType`, `entityId`, `status` ∈ live). Resolved/dismissed flags don't block fresh reports. This is enforced at the DB level — the service does an explicit findOne first to amend in place, but the index is the safety net.
- **`flagCount` is a denormalized counter** on the FAQ document. Stats service uses the Flag collection as source of truth for `flaggedCount` (distinct entity ids); FAQ list uses the counter for the `?filter=flagged` chip. Both numbers stay aligned because every state transition touches both.
- **Show More fetches the FULL window and deduplicates** the visible answer client-side, instead of a complex skip/cursor protocol. Pending queues per question max out at 10 — over-fetching by one row is cheaper than a more sophisticated API.
- **Chatbot feedback model carries `query`/`answer` snapshots.** Phase 6 will populate these from `ChatSession.messages[messageIndex]`, but storing them denormalized means: (a) moderator inbox renders without joining; (b) editing/deleting a chat session does not orphan the feedback row; (c) we can seed demo data without spinning up the full chatbot.

### Tradeoffs

- **Re-flagging while a flag is `under_review` amends the existing row** (status stays `under_review`). A moderator who picked up the flag won't notice the change unless they re-fetch. Accepting this for MVP — full audit history per amendment is Phase 7 territory.
- **The flag inbox only shows up inside the Flagged FAQ filter view.** If a moderator navigates to FAQ Management without that filter active, the open-flag count is still visible on the dashboard card, but the inbox doesn't pop up. Intentional — the filter chip is the attention-grabber.
- **Question-scoped pending endpoint returns `taggedStudents` on every row** even though they all reference the same question. Slightly wasteful; the alternative is a separate question-detail call. At a 10-row cap the redundancy is trivial and keeps the rendering symmetrical with the global queue's row shape.

### Live verification (against running server)

- Student flags an FAQ once → `flagCount: 1`, `flaggedCount: 1`, `flaggedPercentage: 12.5` ✓
- Same student re-submits with a different reason → flag id stable, reason updated, `flaggedCount` STILL 1 ✓
- Moderator resolves the flag → `flagCount: 0`, `flaggedCount: 0` (denormalized counter decrements) ✓
- `GET /api/chat/feedback/stats` → `{ total: 5, helpful: 3, flagged: 2 }` ✓
- `GET /api/chat/feedback?filter=flagged` → 2 rows with comments preserved ✓
- 3 fresh peer answers submitted to one question → `?limit=1` returns 1, `?limit=3` returns 3 in submission order ✓

### Self-check

- Lint: ✅ 0 errors, 0 warnings
- Typecheck (3 workspaces, strict): ✅
- Tests: ✅ 23/23 (was 20, +3 for `FlagFaqDialog`)
- Build: ✅ client 432.47 KB / 127.12 KB gzip
- Live API smoke: ✅ all three deliverables verified end-to-end


---

## 2026-05-25 — Checklist follow-up: 4 partials closed

Closing items #9, #21, #32, #35 from the verification checklist. Brings the implementation score from 29/36 to 33/36; remaining gaps are all chatbot-dependent (Phase 6) or upload-dependent (Phase 7).

### #21 — Rename "General" → "Other" category
- `packages/shared/src/constants.ts` updated.
- `seed-faqs.ts` runs an in-place rename on the legacy `slug: 'general'` doc before upserting categories. Existing FAQ ↔ category links are preserved (no orphan rows).
- Live verified: `/api/categories` returns `Other`, `General` no longer present.

### #35 — Hide viewCount from students
- `PublicFaq.viewCount` made optional in the shared schema.
- `faq.service.projectFaq` only sets `viewCount` for `moderator`/`admin`. Same projection rule already applied to `helpfulCount` / `unhelpfulCount`.
- `FaqCard.tsx` only renders the eye+number when `showRawCounts && viewCount !== undefined` — defense-in-depth in case the API ever leaks it.
- Test fixture refactored into `studentFaq` / `moderatorFaq` to mirror the wire format. New tests "hides viewCount from students" and "shows viewCount to moderators".
- Live verified: student API response has `viewCount: undefined`; moderator response has `viewCount: 0`.

### #32 — Tag filter chips on student Browse FAQs
- `FaqsPage.tsx` adds a second chip row below categories: "Tags · All · #noc · #certificate · …", driven by `useTags`. Selected tag id flows into the existing `?tag=` query param the server already supported.
- Live verified: `?tag=<noc id>` narrows 8 FAQs → 2.

### #9 — Moderator response form on personal questions
- New `moderationService.respondToPersonalQuestion(questionId, moderatorId, body)` writes an `Answer` row with `status: 'approved'` (moderators are the authority — peer moderation flow doesn't apply), increments the question's `answerCount`, and flips status to `resolved`.
- `POST /api/moderation/questions/:id/respond` exposes it; gated by `requireRole('moderator', 'admin')`.
- `UnresolvedQuestionsPage` Personal tab now uses a new `PersonalQuestionRow` component that toggles a textarea + Send response / Cancel buttons.
- `useRespondToPersonal` mutation invalidates all qna queries so the asker's My Questions refreshes immediately.
- Live verified end-to-end: BEFORE = `posted`, AFTER moderator response = `responded` (with `status: resolved`, `answerCount: 1`).

### Architectural notes
- **Reusing the Answer collection for personal-question responses** keeps the data model simple and lets the existing `displayState` projection light up `responded` automatically (`answerCount > 0` triggers it). Tradeoff: a moderator response row has `status: 'approved'` but no peer-moderation history — fine because the moderator IS the moderation step.
- **`answerCount` in a personal-question row counts the moderator's response**. If we later allow back-and-forth threading, this counter will need a meaning split; for the MVP it's fine.

### Self-check
- Lint: ✅ 0 errors
- Typecheck (3 workspaces, strict): ✅
- Tests: ✅ 25/25 (was 23, +2 viewCount role-aware tests)
- Build: ✅
- Live API: ✅ all four items end-to-end

### Remaining gaps from the checklist
- **#4 — Working chatbot UI** and **#18 — Ask via chatbot**: Phase 6 deliverable (RAG chatbot itself).
- **#20 — Inline screenshot upload**: needs storage decision (S3 vs GridFS) + upload endpoint. Phase 7 hardening.

Score: **33/36 (~92%)**, with the remaining 3 items all blocked on out-of-scope phases.
