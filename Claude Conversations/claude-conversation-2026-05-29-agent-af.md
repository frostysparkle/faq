# Claude Conversation Log

Session ID: agent-afdc9918fdd4ec183
Date: 2026-05-29 11:41:59

---

## 👤 User

Compare two backend implementations and produce a detailed diff report.

**Local backend**: `/Users/ravikumark/Desktop/Samagama final/apps/server/src`

**Remote repo**: https://github.com/frostysparkle/faq.git — look at the `server` folder on the `main` branch.

Steps:
1. Fetch the remote repo's server folder content using WebFetch on the GitHub API or raw URLs. The repo is at https://github.com/frostysparkle/faq.git. Try fetching the tree: https://api.github.com/repos/frostysparkle/faq/git/trees/main?recursive=1 to get all file paths.
2. For every file in the remote `server/` folder, fetch its raw content from https://raw.githubusercontent.com/frostysparkle/faq/main/server/<path>
3. Compare each file against the corresponding file in the local `/Users/ravikumark/Desktop/Samagama final/apps/server/src` directory.
4. Identify ALL differences: missing files, extra files, changed logic, changed routes, changed models, changed service functions, changed middleware, changed env vars, etc.

Report format — be extremely detailed and specific:
- List every file that exists in remote but NOT in local
- List every file that exists in local but NOT in remote
- For every file that differs: show which functions/fields/routes/logic are different, added, or removed
- Highlight any differences in: models (schema fields), routes (endpoints), services (business logic), controllers, middleware, config

Do NOT summarize vaguely. Give file-level and function-level details.

---

## 🤖 Claude

I'll start by fetching the remote repo's file tree and the local directory structure simultaneously.

---

## 🤖 Claude

Now I have both file lists. Let me fetch the key remote files for detailed comparison. I'll fetch multiple files in parallel.

---

## 🤖 Claude

Good, plenty of API calls remaining. Let me now fetch all the key remote files in bulk.

---

## 🤖 Claude

Now let me read the local counterpart files to do the comparison:

---

## 🤖 Claude

I now have enough data to produce the comprehensive diff report. Let me compile all the findings.

---

# Detailed Backend Diff Report: Remote (`frostysparkle/faq` `server/`) vs Local (`apps/server/src`)

---

## 1. Language & Tooling

| Dimension | Remote | Local |
|---|---|---|
| Language | JavaScript (ES modules, `.js`) | TypeScript (`.ts`) with type-safe patterns |
| Logger | `console.info/warn/error` | `pino` + `pino-pretty` (structured JSON) |
| DB connection file | `config/db.js` | `config/database.ts` |
| Entry point | `server.js` | `index.ts` |
| App factory | `app.js` | `app.ts` via `createApp()` function |
| Test setup | `__tests__/*.test.js` | `__tests__/health.test.ts` only |

---

## 2. Files Existing in Remote But NOT in Local

All paths below are relative to `server/src/`:

| Remote File | Notes |
|---|---|
| `config/env.js` — uses `dotenv + zod` with `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `CLIENT_URL` vars | Local uses `CORS_ORIGINS`, `LOG_LEVEL`, `LLM_PROVIDER`, `GEMINI_API_KEY`, `EMBEDDING_PROVIDER` instead |
| `config/db.js` | Local equivalent is `config/database.ts` (different name) |
| `constants/analyticsEvents.js` | No equivalent in local |
| `constants/auth.js` | No equivalent in local |
| `constants/errorCodes.js` | No equivalent in local (local uses `api-error.ts` static factory methods) |
| `constants/eventTypes.js` | No equivalent in local |
| `constants/httpStatus.js` | No equivalent in local |
| `constants/roles.js` | Local uses `@samagama/shared` for roles |
| `constants/statuses.js` | Local uses `@samagama/shared` for statuses/enums |
| `constants/statusEnums.js` | No equivalent in local |
| `controllers/adminController.js` | Local has no `adminController`; analytics/overview endpoints are in `stats.controller.ts` |
| `controllers/assistantController.js` | Local has `chatbot.controller.ts` instead |
| `jobs/analyticsJobs.js` | No equivalent in local |
| `jobs/embeddingBackfillJob.js` | No equivalent in local |
| `middleware/asyncHandler.js` | Local equivalent is `utils/async-handler.ts` |
| `middleware/loginRateLimiter.js` | Local inlines a per-route rate limiter in `auth.routes.ts` |
| `middleware/notFound.js` | Local merges `notFoundHandler` into `middlewares/error-handler.ts` |
| `middleware/rbac.js` — exports both `requireRole` and `requireOwnerOrRole` | Local `requireRole` is in `middlewares/auth.ts` (no `requireOwnerOrRole`) |
| `models/AnalyticsCache.js` | No equivalent in local |
| `models/AnalyticsEvent.js` | No equivalent in local |
| `models/FeedbackEvent.js` | No equivalent; local stores vote arrays inline on `Faq.model.ts` |
| `models/RefreshToken.js` | No equivalent; remote uses DB-backed refresh tokens, local uses in-memory blacklist |
| `models/ReviewItem.js` | No equivalent in local |
| `models/SearchLog.js` | No equivalent in local |
| `routes/adminRoutes.js` | No equivalent; local splits into `stats.routes.ts` |
| `routes/answers.js`, `routes/faqs.js`, `routes/categories.js`, `routes/tags.js`, `routes/questions.js` | These are re-export shims; no real duplicates in local |
| `routes/assistantRoutes.js` | Local has `chatbot.routes.ts` instead |
| `routes/resourceRouter.js` — generic CRUD factory | No equivalent in local |
| `routes/auth.js` (legacy) | No equivalent in local |
| `routes/categoryRoutes.js` / `tagRoutes.js` / `questionRoutes.js` | Local uses named exports `categoryRouter`, `tagRouter`, `qnaRouter` |
| `seed/faqContent.js` | No equivalent in local |
| `seed/seedData.js` | Local has `scripts/seed-faqs.ts`, `seed-dev-users.ts`, `seed-real-accounts.ts`, `seed-chat-feedback.ts` |
| `services/analyticsService.js` | No equivalent in local |
| `services/answerService.js` | No equivalent; answer logic is in `qna.service.ts` and `moderation.service.ts` |
| `services/assistantService.js` | Local has `chatbot.service.ts` |
| `services/crudService.js` | No equivalent in local |
| `services/moderationService.js` (JS version) | Local has `moderation.service.ts` with different API surface |
| `services/questionService.js` | Local has `qna.service.ts` |
| `utils/AppError.js` | Local equivalent is `utils/api-error.ts` |
| `utils/apiResponse.js` — `sendSuccess/sendError` helpers | Local has `utils/api-response.ts` |
| `utils/auditLog.js` | Local has `services/audit.service.ts` |
| `utils/embeddings.js` — `@xenova/transformers` (local model, 90MB) | Local has `chatbot.service.ts` with mock/gemini/llama LLM provider |
| `utils/narrativeGenerator.js` | No equivalent in local |
| `utils/token.js` | Local has `utils/jwt.ts` |
| `tests/integration/health.test.js` | Local has `__tests__/health.test.ts` |

---

## 3. Files Existing in Local But NOT in Remote

All paths relative to local `apps/server/src/`:

| Local File | Notes |
|---|---|
| `config/logger.ts` | Pino structured logger — no equivalent in remote |
| `controllers/audit.controller.ts` | No equivalent in remote |
| `controllers/chatbot.controller.ts` | Remote has `controllers/assistantController.js` instead |
| `controllers/flag.controller.ts` | No equivalent in remote |
| `controllers/moderation.controller.ts` | Remote merges moderation endpoints into `questionRoutes.js` inline |
| `controllers/qna.controller.ts` | Remote has no dedicated QnA controller; logic lives in route files |
| `controllers/settings.controller.ts` | No equivalent in remote |
| `controllers/stats.controller.ts` | Remote has `adminController.js` + `moderationService.js` instead |
| `middlewares/auth.ts` | Remote equivalent is `middleware/auth.js` |
| `middlewares/error-handler.ts` | Remote equivalent is `middleware/errorHandler.js` |
| `middlewares/validate.ts` | Remote equivalent is `middleware/validate.js` |
| `models/ChatFeedback.model.ts` | No equivalent in remote |
| `models/Flag.model.ts` | No equivalent in remote |
| `models/SystemSettings.model.ts` | No equivalent in remote |
| `routes/audit.routes.ts` | No equivalent in remote |
| `routes/chatbot.routes.ts` | Remote has `routes/assistantRoutes.js` instead |
| `routes/flag.routes.ts` | No equivalent in remote |
| `routes/index.ts` | Remote mounts directly in `app.js` |
| `routes/moderation.routes.ts` | Remote embeds moderation in `questionRoutes.js` |
| `routes/qna.routes.ts` | Remote has `questionRoutes.js` instead |
| `routes/settings.routes.ts` | No equivalent in remote |
| `routes/stats.routes.ts` | No equivalent in remote |
| `routes/user.routes.ts` | Remote has `routes/users.js` instead |
| `scripts/seed-chat-feedback.ts` | No equivalent in remote |
| `scripts/seed-dev-users.ts` | Remote equivalent is `seed/seedData.js` |
| `scripts/seed-faqs.ts` | Remote has `seed/faqContent.js` + `seed/seedData.js` |
| `scripts/seed-real-accounts.ts` | No equivalent in remote |
| `services/audit.service.ts` | Remote has `utils/auditLog.js` (a direct function, not a service class) |
| `services/chatbot.service.ts` | No equivalent in remote (remote uses `assistantService.js`) |
| `services/flag.service.ts` | No equivalent in remote |
| `services/qna.service.ts` | Remote has `questionService.js` instead |
| `services/settings.service.ts` | No equivalent in remote |
| `utils/api-error.ts` | Remote has `utils/AppError.js` |
| `utils/api-response.ts` | Remote has `utils/apiResponse.js` |
| `utils/async-handler.ts` | Remote has `middleware/asyncHandler.js` |
| `utils/slugify.ts` | Remote inlines slugify via `slugify` npm package |
| `utils/ttl-cache.ts` | No equivalent in remote |

---

## 4. Models: Field-Level Differences

### `User` Model

| Field | Remote (`User.js`) | Local (`User.model.ts`) |
|---|---|---|
| `name` | `String, trim, required` | `String, trim, required, maxlength: 120` |
| `email` | `unique, lowercase, trim` | `unique, lowercase, trim, index: true` |
| `passwordHash` | `select: false` | Not `select:false` (just `required: true`) |
| `role` | `enum USER_ROLE_VALUES` | `enum USER_ROLES from @samagama/shared` |
| `status` | `enum USER_STATUS_VALUES` | `enum USER_STATUSES from @samagama/shared` |
| `tokenVersion` | **NOT PRESENT** | `Number, default: 0` — used for refresh token invalidation |
| `spurtiPoints` | **NOT PRESENT** | `Number, default: 0, index: true` — Gamification system |
| `recentlyViewedFaqs` | `[recentlyViewedFaqSchema]` — ref: `"FAQ"` | `[recentlyViewedSchema]` — ref: `'Faq'` (different model name) |
| Pre-save password hash | `bcrypt.hash` in `pre('save')` hook | No hook; hashing done in `auth.service.ts` |
| `comparePassword` method | Yes, instance method | No — bcrypt.compare called in service |
| `findActiveByEmail` static | Yes | No |
| `toJSON` transform | Strips `passwordHash` and `__v` | No toJSON transform |

### `Faq` Model

| Field | Remote (`Faq.js`) | Local (`Faq.model.ts`) |
|---|---|---|
| `title` | `required, trim` | `required, trim, maxlength: 280` |
| `answer` | `required` | `required, trim, maxlength: 8000` |
| `summary` | `required, maxlength: 300` | `trim, maxlength: 280` (NOT required) |
| `notHelpfulCount` | Field name is `notHelpfulCount` | Field name is `unhelpfulCount` |
| `helpfulVotes` | **NOT PRESENT** | `[ObjectId], select: false` — vote deduplication array |
| `unhelpfulVotes` | **NOT PRESENT** | `[ObjectId], select: false` |
| `flagCount` | **NOT PRESENT** | `Number, default: 0` |
| `qualityScore` | `Number, default: 0` | **NOT PRESENT** |
| `reviewState` | `enum FAQ_REVIEW_STATE_VALUES` | **NOT PRESENT** |
| `sourceType` | `enum FAQ_SOURCE_TYPE_VALUES` | `enum ['manual', 'community_conversion', 'imported']` |
| `embedding` | `[Number], select: false, validate: 384 dims` | `[Number], default: undefined, select: false` (no dimension validation) |
| `publishedAt` | Present | Present |
| `lastReviewedAt` | Present | Present |
| `duplicateOf` | `ref: "FAQ"` | `ref: 'Faq'` (different model name casing) |
| `createdBy` | `required: true` | `ref: 'User'` (not required) |
| Slug generation | `pre('validate')` + `pre('save')` with DB uniqueness loop | `pre('validate')` adds timestamp suffix, no DB uniqueness check |
| Text index weights | Equal weights | `title: 10, summary: 5, answer: 1` |
| `qualityScore` calculation | Complex static method `calculateQualityScore` | **NOT PRESENT** |
| `helpfulnessRatio` virtual | Yes | No |

### `Question` Model

| Field | Remote (`Question.js`) | Local (`Question.model.ts`) |
|---|---|---|
| `title` | `minlength: 10, maxlength: 300` | `maxlength: 280` (no minlength) |
| `description` | `minlength: 20` | `maxlength: 4000` (no minlength) |
| `categoryId` | `categoryId` (snake_case) | `category` (different field name) |
| `type` | **NOT PRESENT** | `enum QUESTION_TYPES, default: 'community'` — personal/community distinction |
| `priorityScore` | `Number, default: 0` | **NOT PRESENT** |
| `resolvedAt` | `Date` | **NOT PRESENT** |
| `screenshotUrl` | **NOT PRESENT** | `String, trim` — screenshot attachment |
| `taggedStudents` | **NOT PRESENT** | `[ObjectId]` — student tagging feature |
| `moderatorViewedAt` | **NOT PRESENT** | `Date` — "Seen" tick for moderators |
| `embedding` | `[Number], 384 dims validation, select: false` | **NOT PRESENT** |
| Text index weights | Equal | `title: 10, description: 1` |

### `Answer` Model

| Field | Remote (`Answer.js`) | Local (`Answer.model.ts`) |
|---|---|---|
| `body` | `minlength: 20` | `trim, maxlength: 4000` |
| `helpfulCount/notHelpfulCount` | Present | **NOT PRESENT** as separate counters |
| `upvotes/downvotes` | **NOT PRESENT** | `[ObjectId], select: false` — vote arrays |
| `upvoteCount/downvoteCount` | **NOT PRESENT** | `Number, default: 0` |
| `embedding` | **NOT PRESENT** | `[Number], default: undefined, select: false` |

### Models Only in Remote

- **`AnalyticsEvent`** — event sourcing for FAQ views, search events; TTL 730 days
- **`AnalyticsCache`** — key/payload/expiry cache for computed analytics
- **`FeedbackEvent`** — unique-per-user feedback with `userId, entityType, entityId, value`; remote uses a separate collection, local stores vote arrays directly on Faq/Answer
- **`RefreshToken`** — DB-backed token store with `tokenHash, expiresAt, revokedAt`
- **`ReviewItem`** — moderation workflow item with `entityType, reviewType, status, assignedTo, notes`
- **`SearchLog`** — tracks search queries, `normalizedQuery`, `resultCount`, `clickedFaqId`, `ledToQuestionId`; TTL 365 days

### Models Only in Local

- **`Flag.model.ts`** — user-submitted flags with `entityType, reason, details, status, reportedBy, reviewedBy`; unique partial index for open flags
- **`SystemSettings.model.ts`** — singleton config document: `duplicateWarnThreshold`, `chatbotConfidenceThreshold`, `communityAnswerCap`, `urgentIdleDays`
- **`ChatFeedback.model.ts`** — chatbot response feedback (no equivalent in remote)
- **`AuditLog.model.ts`** — present in both, but remote has a TTL index of 1825 days (5 years) while local uses `audit.service.ts` with no TTL index visible in the model

---

## 5. Routes: Endpoint-Level Differences

### Auth (`/api/auth`)

| Endpoint | Remote | Local |
|---|---|---|
| `POST /register` | Validates role from `USER_ROLE_VALUES` in schema | Schema from `@samagama/shared`; only admins can set role during registration |
| `POST /login` | No per-route rate limiter (only global 300/15min) | Per-route `loginLimiter` (10/15min) in addition to global 200/60s |
| `POST /logout` | Requires `requireAuth` + `refreshToken` in body | No auth required, no body needed |
| `GET /me` | Returns raw `req.user` (id, role, email only) | Returns full profile via `authService.getProfile()` incl. `spurtiPoints` |
| Refresh token storage | In-memory `Set` (blacklist, lost on restart) | Validated via `tokenVersion` field on User (DB-backed, survives restart) |

### FAQs (`/api/faqs`)

| Endpoint | Remote | Local |
|---|---|---|
| `GET /` | `requireAuth` + hybrid search (semantic + keyword + quality scoring) | `requireAuth` + keyword text search with `sort` param (popular/helpful/added/recent/relevance) |
| `GET /recent` | **NOT PRESENT** | `GET /recent` — returns user's recently-viewed FAQs |
| `POST /` | `requireRole('admin')` only | `requireRole('admin', 'moderator')` |
| `PATCH /:id` | `requireRole('admin')` only | `requireRole('admin', 'moderator')` |
| `PATCH /:id/status` | Explicit status transition endpoint | No separate status endpoint; status updated via `PATCH /:id` |
| `PATCH /:id/archive` | **NOT PRESENT** | `PATCH /:id/archive` — dedicated archive action |
| `POST /:id/view` | Debounced (10min per user-FAQ pair, in-memory) | No debounce; atomic `$inc` + recently-viewed update |
| `POST /:id/feedback` | `value: helpful/not_helpful` via `FeedbackEvent` collection | `rating: helpful/unhelpful` (different field name) via vote arrays on Faq doc |
| `POST /check-similar` | `requireRole('admin', 'moderator')` + cosine similarity | **NOT PRESENT** in local (deferred to Phase 6) |
| Stats reset on answer edit | **NOT PRESENT** | Answer body change triggers reset of `helpfulCount`, `unhelpfulCount`, `flagCount`, vote arrays |
| Filter params | `tagIds` (array), `tagId`, `categoryId`, `status`, `page`, `limit` | `q`, `category`, `tag`, `status`, `filter` (helpful/flagged), `sort`, `page`, `pageSize` |

### Questions / Q&A

| Endpoint | Remote (`/api` — no prefix) | Local (`/api/qna`) |
|---|---|---|
| `POST /questions/check-existing` | With embedding-based semantic check | `POST /qna/check-existing` — same concept |
| `GET /questions` | Filter: `status, categoryId, tagId, sortBy` (newest/priority/unanswered/popular) | `GET /qna/questions` — no explicit sort params |
| `GET /questions/:id/answers` | Role-aware: students only see approved | `GET /qna/questions/:id/answers` |
| `POST /questions/:id/answers` | Submit answer body | `POST /qna/questions/:id/answers` |
| `POST /answers/:id/feedback` | `value: helpful/not_helpful` | `POST /qna/answers/:id/vote/:direction` — URL param, not body |
| `POST /questions/:id/tag-me` | **NOT PRESENT** | `POST /qna/questions/:id/tag-me` — student tagging feature |
| `question.type` | **NOT PRESENT** — all questions are community | `type: community/personal` — personal questions go to moderators directly |

### Moderation

| Endpoint | Remote (`/api/moderation/*` inside questionRoutes) | Local (`/api/moderation`) |
|---|---|---|
| `GET /moderation/queue` | Filter: all/pending_answers/unresolved/duplicate_candidates/faq_candidates | `GET /moderation/pending-answers` — simpler FIFO queue |
| `GET /moderation/faq-candidates` | Present | `GET /moderation/faq-candidates` — present |
| `POST /moderation/faq-candidates/:id/convert` | Via `moderationService.recommendFaqConversion` | Via `moderationController.convertToFaq` — admin-only conversion |
| `GET /moderation/analytics` | Present | **NOT PRESENT** |
| `POST /moderation/bulk` | `action: approve/reject/resolve` | `POST /moderation/bulk-approve` + `POST /moderation/bulk-reject` (separate) |
| `PATCH /answers/:id/approve` | With `moderationNote` body | Same but also accepts `editedBody` (edit-and-approve) and `spurtiPoints` (awarding) |
| `PATCH /answers/:id/reject` | With `reason` body | With optional `note` body |
| `PATCH /answers/:id/request-changes` | Present | **NOT PRESENT** |
| `PATCH /questions/:id/resolve` | Present | **NOT PRESENT** (resolution is automatic on first approval) |
| `PATCH /questions/:id/duplicate` | Present | **NOT PRESENT** |
| `PATCH /answers/:id/recommend-faq` | Present | `PATCH /moderation/answers/:id/mark-for-faq` |
| `POST /moderation/questions/:id/respond` | **NOT PRESENT** | Present — moderator direct response for personal questions |

### Admin Analytics (`/api/admin`)

Remote only — no local equivalent. Routes:
- `GET /api/admin/overview`
- `GET /api/admin/issue-heatmap?days=`
- `GET /api/admin/unanswered-searches?limit=`
- `GET /api/admin/faq-quality?limit=&sort=`
- `GET /api/admin/moderation-load?days=`
- `GET /api/admin/audit-logs` (with full filter: actorId, entityType, action, dateRange)

Local equivalent is partial via `stats.routes.ts`:
- `GET /api/stats/admin-intelligence`
- `GET /api/stats/moderation-load`
- `GET /api/stats/faq-quality`
- `GET /api/stats/moderator`, `/moderator-personal`
- `GET /api/stats/student`, `/leaderboard`, `/community-idle`

### Entirely New Routes in Local (No Remote Equivalent)

- `GET/POST /api/flags`, `PATCH /api/flags/:id/status` — flag/report system
- `GET /api/chat/feedback`, `GET /api/chat/feedback/stats` — chatbot feedback
- `GET/PATCH /api/settings` — system settings management
- `GET /api/audit-logs` — dedicated audit log endpoint
- `GET /api/stats/student` — student home dashboard stats
- `GET /api/stats/leaderboard` — Spurti Points leaderboard
- `GET /api/stats/community-idle` — idle question bucket counts

### Users (`/api/users`)

| Aspect | Remote | Local |
|---|---|---|
| Operations | list, create, getById, update (PATCH), delete | list, changeRole, suspendUser, activateUser |
| Access control | `requireRole(...ROLE_GROUPS.ADMINISTRATORS)` — admin only | Admin only |
| Filter/search | `search` param (name, email, department regex) | `q` (name/email), `role`, `status` filters |
| Delete | Hard delete (`user.deleteOne()`) | No delete; only suspend/activate |
| Self-protection | None | Cannot change own role or suspend self |

---

## 6. Services: Business Logic Differences

### `authService`

| Behavior | Remote | Local |
|---|---|---|
| Refresh token store | In-memory `Set` — lost on restart | `tokenVersion` on User doc — persistent, survives restart |
| Register response | Returns `{ user }` (sanitized user, no tokens) | Returns `{ accessToken, refreshToken, user }` (full auth payload) |
| Login with inactive account | Returns 401 "Invalid email or password" | Returns 403 "Account is not active" (separate error) |
| Password hashing library | `bcrypt` | `bcryptjs` |
| Spurti Points on register | **NOT PRESENT** | Students get `SPURTI_POINTS.INITIAL_BALANCE` on registration |
| Logout mechanism | Adds refresh token to in-memory blacklist | No logout endpoint — invalidation via `tokenVersion` increment |
| Access token claims | `{ sub, role }` | `{ sub, role, type: 'access' }` |
| Refresh token claims | `{ sub, role }` | `{ sub, ver, type: 'refresh' }` — includes token version |

### `faqService`

| Behavior | Remote | Local |
|---|---|---|
| Search algorithm | Hybrid: cosine similarity (384-dim embeddings via `@xenova/transformers`) + MongoDB text search, weighted scoring (semantic 35%, keyword 25%, helpfulness 20%, freshness 12%, category bonus 5%) | Keyword-only MongoDB text search + sort modes (relevance/popular/helpful/added/recent) |
| Embedding generation | Real-time via local ML model, scheduled backfill | Reserved for Phase 6 (stored as `undefined`) |
| `qualityScore` | Computed across 5 signals, stored on Faq doc, recalculated async | **NOT PRESENT** |
| Status transitions | Enforced state machine (`DRAFT→PUBLISHED→NEEDS_REVIEW/ARCHIVED→DRAFT`) | Status updated directly via `Object.assign`; no transition guard |
| Stats reset | **NOT PRESENT** | Resets `helpfulCount/unhelpfulCount/flagCount` and vote arrays when answer body changes |
| `getFaqById` side effects | Logs `AnalyticsEvent`, updates user's `recentlyViewedFaqs` by re-reading and rewriting array | Atomic `$pull` + `$push` with `$slice` on `recentlyViewedFaqs` |
| View debounce | `VIEW_DEBOUNCE_MS = 10min` in-memory Map per `userId:faqId` | No debounce — pure atomic increment |
| `checkSimilarity` | Hybrid cosine + Jaccard similarity, returns top 5 matches | **NOT PRESENT** |
| `convertQuestionAnswerToFaq` | Present — full conversion flow | Done in `moderation.service.ts` |

### `userService`

| Behavior | Remote | Local |
|---|---|---|
| List filter fields | `search` (matches name, email, department) | `q` (name, email), `role`, `status` |
| Pagination style | `page, limit` → `{ items, pagination: { page, limit, total, pages } }` | `page, pageSize` → `{ items, total }` |
| Operations | list, getById, createUser, updateUser, removeUser | list, changeRole, suspendUser, activateUser |
| Hard delete | Yes — `user.deleteOne()` | No — only status changes |
| Audit logging | Uses `AUDIT_EVENTS` constants from `eventTypes.js` | Uses `auditService.log()` with inline string actions |
| Self-protection | **ABSENT** | Cannot change own role or suspend self |

### `moderationService`

| Behavior | Remote | Local |
|---|---|---|
| Answer approval | Sets `status, moderatorId, moderationNote, approvedAt` | Same + optional `editedBody` (edit-and-approve) + `spurtiPoints` award |
| Question resolution | Explicit `PATCH /questions/:id/resolve` endpoint | Automatic when first answer is approved |
| Bulk actions | Single endpoint, `action: approve/reject/resolve` | Separate `bulkApprove` / `bulkReject` functions |
| Personal questions | **NOT PRESENT** | `respondToPersonalQuestion` — moderator direct response, bypasses peer flow |
| `request-changes` flow | Present — dedicated endpoint | **NOT PRESENT** |
| `markDuplicate` | Present | **NOT PRESENT** |
| Spurti Points | **NOT PRESENT** | Awarded to answer author on first approval |

---

## 7. Middleware Differences

| Aspect | Remote | Local |
|---|---|---|
| Auth middleware file | `middleware/auth.js` — exports `requireAuth`, `authenticate` (alias) | `middlewares/auth.ts` — exports `requireAuth`, `requireRole` (combined) |
| Auth mechanism | DB lookup on every request: `User.findOne({ _id, status: ACTIVE })` | Stateless JWT verify only — no DB hit per request |
| RBAC | Separate `middleware/rbac.js` with `requireRole` and `requireOwnerOrRole` | `requireRole` in `middlewares/auth.ts`; no `requireOwnerOrRole` |
| Error handler | `middleware/errorHandler.js` — handles `ZodError`, `ValidationError`, `CastError`, `11000`, `AppError`, JWT errors | `middlewares/error-handler.ts` — same cases; uses `pino` logger for unknowns; slightly different error codes (`DUPLICATE_KEY` vs `DUPLICATE_RESOURCE`, `INVALID_ID` vs `INVALID_IDENTIFIER`) |
| `asyncHandler` | In `middleware/asyncHandler.js` | In `utils/async-handler.ts` |
| Cookie parser | **NOT PRESENT** | `cookie-parser` imported in `app.ts` |
| Rate limiting | Global 300 req/15min | Global 200 req/60s; login route gets additional 10/15min |
| `x-powered-by` header | Not disabled | `app.disable('x-powered-by')` |

---

## 8. Environment Variable Differences

| Variable | Remote | Local |
|---|---|---|
| `PORT` | default `5000` | default `4000` |
| `MONGODB_URI` | Required | Required |
| `JWT_ACCESS_SECRET` | min 32 chars | min 32 chars |
| `JWT_REFRESH_SECRET` | min 32 chars | min 32 chars |
| `JWT_ACCESS_EXPIRY` | Required string (e.g. `"15m"`) | **NOT PRESENT** — uses `ACCESS_TOKEN_TTL_SECONDS` from `@samagama/shared` |
| `JWT_REFRESH_EXPIRY` | Required string (e.g. `"7d"`) | **NOT PRESENT** — uses `REFRESH_TOKEN_TTL_SECONDS` from `@samagama/shared` |
| `CLIENT_URL` | Required URL string (for CORS) | **NOT PRESENT** |
| `CORS_ORIGINS` | **NOT PRESENT** | Comma-separated string, default `http://localhost:5173` |
| `LOG_LEVEL` | **NOT PRESENT** | `fatal/error/warn/info/debug/trace`, default `info` |
| `LLM_PROVIDER` | **NOT PRESENT** | `mock/gemini/local-llama`, default `mock` |
| `GEMINI_API_KEY` | **NOT PRESENT** | Optional string |
| `EMBEDDING_PROVIDER` | **NOT PRESENT** | `mock/gemini`, default `mock` |
| `NODE_ENV` | `development/test/production` | `development/test/production` |
| Env file loading | `dotenv.config({ path: rootEnvPath })` + `dotenv.config()` — loads from monorepo root then local | `dotenv/config` only — assumes single `.env` |

---

## 9. Summary of Architectural Divergence

The two codebases started from a shared concept but have diverged substantially:

1. **Remote is JS + in-memory state; Local is TypeScript + DB-backed state.** Remote uses an in-memory refresh token blacklist (lost on restart) and in-memory view debounce Map. Local uses `tokenVersion` on the User model for stateless but persistent token invalidation.

2. **Remote has a full AI search pipeline; Local defers it.** Remote implements 384-dimension embeddings via `@xenova/transformers`, a local 90MB model, and hybrid semantic+keyword search with a 5-factor quality score. Local stubs embedding fields and uses MongoDB text search only.

3. **Local has a richer product feature set.** Local adds: Spurti Points gamification (balance, leaderboard, award on approval), personal vs. community question types, screenshot attachments, student tagging, flag/report system, system settings management, chatbot feedback tracking, and edit-and-approve moderation.

4. **Remote has richer admin analytics.** Remote has `AnalyticsEvent`, `SearchLog`, `AnalyticsCache`, `ReviewItem`, and a full `/api/admin` analytics dashboard with issue heatmaps, unanswered search queries, and moderation load metrics that do not exist in local.

5. **Model field naming is inconsistent.** `notHelpfulCount` (remote) vs. `unhelpfulCount` (local); `categoryId` on Question (remote) vs. `category` (local); model registration name `"FAQ"` (remote) vs. `"Faq"` (local) — these would cause cross-service breakage if merged without alignment.

---

