# Claude Conversation Log

Session ID: agent-ad7c24f088f371dc9
Date: 2026-05-29 12:15:58

---

## 👤 User

Produce a comprehensive, file-by-file and logic-level diff report comparing two backend implementations that are both present locally. Do NOT fetch anything from the internet.

**Local (TypeScript) backend**: `/Users/ravikumark/Desktop/Samagama final/apps/server/src`
**Remote (JavaScript) backend**: `/Users/ravikumark/Desktop/Samagama final/apps/server-remote/src`

Steps:

1. List all files in both directories recursively.
2. For every file in the remote, check if a corresponding file exists in local (map by purpose, not exact path — e.g., `models/Faq.js` ↔ `models/Faq.model.ts`).
3. Read key files from both sides and compare in detail.

Files to read and compare in detail (read both sides for each):

- Entry point / app factory
- User model
- Faq model
- Question model
- Answer model
- Auth service
- FAQ service
- Auth routes
- FAQ routes
- Question/QnA routes
- Moderation routes/service
- Admin/stats routes
- env config
- Auth middleware
- Error handler middleware
- package.json (both)

Report format — be exhaustive and specific:

## 1. Files only in remote (missing in local)

List every file with a one-line description of what it does.

## 2. Files only in local (not in remote)

List every file with a one-line description of what it does.

## 3. Model differences (field by field)

For each model that exists in both, list every field that is added, removed, or renamed between the two versions.

## 4. Route / endpoint differences

For each router, list every endpoint that is added, removed, or changed (method, path, middleware, handler).

## 5. Service / business logic differences

For each service, describe the key logic differences — algorithms, side effects, DB operations.

## 6. Middleware differences

Compare auth, RBAC, error handler, rate limiting, validation.

## 7. Config / env differences

Compare all environment variables and their validation.

## 8. Package / dependency differences

Compare package.json dependencies.

## 9. Architecture summary

3–5 bullet points summarising the biggest structural divergences.

Be specific — include field names, endpoint paths, function names, constant values. Do not write vague summaries.

---

## 🤖 Claude

I'll conduct a comprehensive comparison of the two backend implementations. Let me start by listing all files in both directories and then examine the key files in detail.

---

## 🤖 Claude

Now let me list the remote backend files:

---

## 🤖 Claude

Now let me read the key files from both backends. I'll start with entry points, models, and critical services:

---

## 🤖 Claude

Now let me read the models:

---

## 🤖 Claude

Now let me read the Question and Answer models:

---

## 🤖 Claude

Now let me read the auth service and middleware:

---

## 🤖 Claude

Now let me read the auth middleware and routes:

---

## 🤖 Claude

Now let me read FAQ routes and services:

---

## 🤖 Claude

Now let me read more routes and the error handlers:

---

## 🤖 Claude

Now let me read package.json files and check for more models and services:

---

## 🤖 Claude

Let me read the moderation routes and services, and the QnA routes:

---

## 🤖 Claude

Now let me check for stats routes and other missing models:

---

## 🤖 Claude

Let me now check for more models and utilities to ensure comprehensive coverage:

---

## 🤖 Claude

Now let me check for any additional files in remote that don't exist in local:

---

## 🤖 Claude

Let me check a few more critical differences in the services:

---

## 🤖 Claude

Perfect! Now I have enough information to compile a comprehensive comparison. Let me create the final report.

---

## COMPREHENSIVE DIFF REPORT: LOCAL TYPESCRIPT vs REMOTE JAVASCRIPT BACKENDS

### 1. Files Only in Remote (JavaScript backend)

1. **`/src/constants/analyticsEvents.js`** – Event type constants for analytics event tracking (e.g., FAQ_VIEWED, QUESTION_ASKED)
2. **`/src/constants/auth.js`** – Auth-related constants (likely token expiry configs)
3. **`/src/constants/errorCodes.js`** – Centralized error code mappings (UNAUTHORIZED, DUPLICATE_RESOURCE, etc.)
4. **`/src/constants/eventTypes.js`** – Audit event type constants (RECORD_CREATED, RECORD_UPDATED)
5. **`/src/constants/httpStatus.js`** – HTTP status code constants (200, 400, 401, etc.)
6. **`/src/constants/roles.js`** – Role value mappings (USER_ROLES, USER_ROLE_VALUES)
7. **`/src/constants/statusEnums.js`** – Various status enums (FAQ_STATUS, QUESTION_STATUS, ANSWER_STATUS)
8. **`/src/constants/statuses.js`** – Detailed status/enum definitions for FAQs, questions, answers, feedback, review states
9. **`/src/controllers/adminController.js`** – Admin dashboard endpoints (overview, heatmap, quality scores, moderation load, audit logs)
10. **`/src/controllers/assistantController.js`** – Chatbot/AI assistant endpoints
11. **`/src/jobs/analyticsJobs.js`** – Background jobs for analytics computation
12. **`/src/jobs/embeddingBackfillJob.js`** – Async job to generate embeddings for FAQs/questions
13. **`/src/middleware/loginRateLimiter.js`** – Dedicated login rate-limiting middleware
14. **`/src/middleware/notFound.js`** – 404 handler middleware
15. **`/src/middleware/rbac.js`** – Role-based access control with `requireOwnerOrRole` support
16. **`/src/models/AnalyticsCache.js`** – Cache model for pre-computed analytics with TTL expiration
17. **`/src/models/AnalyticsEvent.js`** – Event log for analytics tracking (FAQ viewed, questions asked, etc.)
18. **`/src/models/FeedbackEvent.js`** – User feedback tracking (helpful/unhelpful on FAQs, answers)
19. **`/src/models/RefreshToken.js`** – Explicit refresh token tracking (with tokenHash and revocation support)
20. **`/src/models/ReviewItem.js`** – Review queue items (entity reviews flagged for moderation)
21. **`/src/models/SearchLog.js`** – Search query logging for analytics (what users searched, result counts, clicks)
22. **`/src/routes/answers.js`** – Answer CRUD routes (appears to be legacy/duplicated)
23. **`/src/routes/auth.js`** – Legacy auth routes (appears to be duplicated with authRoutes.js)
24. **`/src/routes/assistantRoutes.js`** – AI assistant chat endpoints
25. **`/src/routes/categories.js`** – Category routes (legacy)
26. **`/src/routes/faqs.js`** – FAQ routes (legacy/duplicated)
27. **`/src/routes/resourceRouter.js`** – Generic resource routing helper
28. **`/src/routes/tags.js`** – Tag routes (legacy)
29. **`/src/routes/users.js`** – User management routes
30. **`/src/seed/faqContent.js`** – FAQ seed content data
31. **`/src/services/analyticsService.js`** – Analytics computation and caching service
32. **`/src/services/answerService.js`** – Answer-specific CRUD and moderation logic
33. **`/src/services/assistantService.js`** – AI assistant/chatbot logic
34. **`/src/services/categoryService.js`** – Category CRUD and slug management
35. **`/src/services/crudService.js`** – Generic CRUD factory for reusable service patterns
36. **`/src/services/questionService.js`** – Question lifecycle, checking existing answers, priority scoring
37. **`/src/services/tagService.js`** – Tag CRUD service
38. **`/src/services/userService.js`** – User profile and preference management
39. **`/src/utils/apiResponse.js`** – Standardized API response formatting (success/error)
40. **`/src/utils/auditLog.js`** – Audit logging utility
41. **`/src/utils/embeddings.js`** – Vector embedding generation using @xenova/transformers (local ML)
42. **`/src/utils/narrativeGenerator.js`** – Natural language generation utility
43. **`/src/utils/token.js`** – JWT token utilities

---

### 2. Files Only in Local (TypeScript backend)

1. **`/src/__tests__/health.test.ts`** – Health endpoint test
2. **`/src/config/database.ts`** – Database connection factory with graceful shutdown
3. **`/src/config/logger.ts`** – Pino logger configuration and initialization
4. **`/src/controllers/audit.controller.ts`** – Audit log query endpoints
5. **`/src/controllers/category.controller.ts`** – Category management endpoints
6. **`/src/controllers/chatbot.controller.ts`** – Chatbot interaction endpoints
7. **`/src/controllers/flag.controller.ts`** – FAQ flag/moderation reporting endpoints
8. **`/src/controllers/settings.controller.ts`** – System settings endpoints
9. **`/src/controllers/stats.controller.ts`** – Dashboard statistics endpoints
10. **`/src/controllers/tag.controller.ts`** – Tag management endpoints
11. **`/src/controllers/user.controller.ts`** – User profile endpoints
12. **`/src/models/ChatFeedback.model.ts`** – Chatbot interaction feedback tracking
13. **`/src/models/Flag.model.ts`** – FAQ flag/report collection
14. **`/src/models/SystemSettings.model.ts`** – System configuration storage
15. **`/src/models/Tag.model.ts`** – Tag collection (local implementation)
16. **`/src/routes/audit.routes.ts`** – Audit log query routes
17. **`/src/routes/category.routes.ts`** – Category management routes
18. **`/src/routes/chatbot.routes.ts`** – Chatbot routes
19. **`/src/routes/flag.routes.ts`** – FAQ flag/report routes
20. **`/src/routes/index.ts`** – Route aggregation/mounting
21. **`/src/routes/settings.routes.ts`** – Settings management routes
22. **`/src/routes/tag.routes.ts`** – Tag management routes
23. **`/src/routes/user.routes.ts`** – User profile routes
24. **`/src/services/audit.service.ts`** – Audit log query service
25. **`/src/services/category.service.ts`** – Category CRUD service
26. **`/src/services/chatbot.service.ts`** – Chatbot orchestration service
27. **`/src/services/flag.service.ts`** – Flag/report management service
28. **`/src/services/settings.service.ts`** – System settings CRUD
29. **`/src/services/stats.service.ts`** – Statistics computation service
30. **`/src/services/tag.service.ts`** – Tag CRUD service
31. **`/src/services/user.service.ts`** – User profile and Spurti Points service
32. **`/src/scripts/seed-chat-feedback.ts`** – Seed chatbot feedback data
33. **`/src/scripts/seed-dev-users.ts`** – Seed development user accounts
34. **`/src/scripts/seed-faqs.ts`** – Seed FAQ data
35. **`/src/scripts/seed-real-accounts.ts`** – Seed real user accounts from external source
36. **`/src/utils/api-response.ts`** – API response formatter wrapper
37. **`/src/utils/async-handler.ts`** – Async route handler wrapper (catch errors to next())
38. **`/src/utils/jwt.ts`** – JWT signing/verification utilities
39. **`/src/utils/slugify.ts`** – URL slug generation utility
40. **`/src/utils/ttl-cache.ts`** – In-memory TTL cache for expensive computations

---

### 3. Model Differences (Field-by-field)

#### **User Model**

| Field                | Local (TS)                                    | Remote (JS)                                            | Difference                                 |
| -------------------- | --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `name`               | String, required, max 120                     | String, required                                       | Remote lacks maxlength                     |
| `email`              | String, required, unique, indexed             | String, required, unique                               | Both same, local has explicit index        |
| `passwordHash`       | String, required                              | String, required, `select: false`                      | Remote hides on default queries            |
| `role`               | Enum (USER_ROLES), default 'student', indexed | Enum (USER_ROLE_VALUES), default from constant         | Both similar, local has index              |
| `status`             | Enum (USER_STATUSES), default 'active'        | Enum (USER_STATUS), default from constant              | Same                                       |
| `tokenVersion`       | Number, default 0                             | **Missing**                                            | Local has version bump on password reset   |
| `spurtiPoints`       | Number, default 0, indexed                    | **Missing**                                            | Local tracks community contribution points |
| `recentlyViewedFaqs` | Array of {faqId, viewedAt}                    | Array of same                                          | Same                                       |
| **Schema hooks**     | No pre-save hash (auth service does it)       | `pre('save')` hashes password on demand                | Remote auto-hashes on save                 |
| **Methods**          | None                                          | `.comparePassword()`, `.findActiveByEmail()` (statics) | Remote has schema methods/statics          |

#### **FAQ Model**

| Field              | Local (TS)                                                                         | Remote (JS)                                                             | Difference                                     |
| ------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| `title`            | String, required, max 280                                                          | String, required                                                        | Remote lacks maxlength                         |
| `slug`             | String, required, unique, indexed                                                  | String, required, unique                                                | Same, but slug generation differs              |
| `answer`           | String, required, max 8000                                                         | String, required                                                        | Remote lacks maxlength                         |
| `summary`          | String, max 280                                                                    | String, required, max 300                                               | Local optional; remote required; different max |
| `categories`       | Array of refs                                                                      | Array of refs                                                           | Same                                           |
| `tags`             | Array of refs                                                                      | Array of refs                                                           | Same                                           |
| `status`           | Enum (FAQ_STATUSES), default 'draft'                                               | Enum (FAQ_STATUS_VALUES), default from constant                         | Same                                           |
| `sourceType`       | Enum ['manual', 'community_conversion', 'imported'], default 'manual'              | Enum (FAQ_SOURCE_TYPE_VALUES)                                           | Same                                           |
| `sourceQuestionId` | ObjectId ref, optional                                                             | ObjectId ref                                                            | Same                                           |
| `embedding`        | Number[], default undefined, select: false                                         | Number[] with validator (must be 384), select: false                    | Remote validates embedding dimension           |
| `helpfulCount`     | Number, default 0                                                                  | Number, default 0                                                       | Same                                           |
| `unhelpfulCount`   | **Missing**                                                                        | Number (notHelpfulCount), default 0                                     | Remote calls it `notHelpfulCount`              |
| `helpfulVotes`     | ObjectId[], select: false                                                          | **Missing**                                                             | Local tracks individual voters                 |
| `unhelpfulVotes`   | ObjectId[], select: false                                                          | **Missing**                                                             | Local tracks individual voters                 |
| `viewCount`        | Number, default 0                                                                  | Number, default 0, min 0                                                | Same                                           |
| `flagCount`        | Number, default 0                                                                  | **Missing**                                                             | Local tracks flags                             |
| `qualityScore`     | **Missing**                                                                        | Number, default 0                                                       | Remote computes quality score dynamically      |
| `reviewState`      | **Missing**                                                                        | Enum (FAQ_REVIEW_STATE_VALUES), default NONE                            | Remote has review workflow                     |
| `duplicateOf`      | ObjectId ref, optional                                                             | ObjectId ref, sparse index                                              | Same                                           |
| `createdBy`        | ObjectId ref                                                                       | ObjectId ref, required                                                  | Local optional; remote required                |
| `updatedBy`        | ObjectId ref                                                                       | ObjectId ref                                                            | Same                                           |
| `publishedAt`      | Date                                                                               | Date                                                                    | Same                                           |
| `lastReviewedAt`   | Date                                                                               | Date                                                                    | Same                                           |
| **Indexes**        | text (title 10x, summary 5x, answer 1x), (status, updatedAt), (categories), (tags) | text, (status), (categories), (tags), (qualityScore -1), (createdAt -1) | Different weighting and index set              |
| **Virtuals**       | None                                                                               | `helpfulnessRatio` computed getter                                      | Remote has helpfulness ratio virtual           |
| **Statics**        | None                                                                               | `calculateQualityScore()` aggregates feedbacks and reviews              | Remote has complex quality computation         |

#### **Question Model**

| Field                 | Local (TS)                                                                         | Remote (JS)                                                                 | Difference                                      |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `title`               | String, required, max 280                                                          | String, required, min 10, max 300                                           | Remote enforces min length                      |
| `description`         | String, required, max 4000                                                         | String, required, min 20                                                    | Remote enforces min length; local has max       |
| `category`            | ObjectId ref, required, indexed                                                    | ObjectId ref (categoryId), required                                         | Local calls it `category`; remote `categoryId`  |
| `tags`                | Array of ObjectId refs                                                             | Array of ObjectId refs                                                      | Same                                            |
| `type`                | Enum (QUESTION_TYPES), default 'community', indexed                                | **Missing**                                                                 | Local has personal/community distinction        |
| `status`              | Enum (QUESTION_STATUSES), default 'open', indexed                                  | Enum (QUESTION_STATUS_VALUES), default OPEN                                 | Same                                            |
| `duplicateOf`         | ObjectId ref                                                                       | ObjectId ref, sparse index                                                  | Same                                            |
| `askedBy`             | ObjectId ref, required, indexed                                                    | ObjectId ref, required                                                      | Local has index                                 |
| `screenshotUrl`       | String, optional                                                                   | **Missing**                                                                 | Local allows image attachment at ask time       |
| `taggedStudents`      | Array of ObjectId refs                                                             | **Missing**                                                                 | Local allows tagging other students to question |
| `moderatorViewedAt`   | Date                                                                               | **Missing**                                                                 | Local tracks when moderator first views         |
| `existingAnswerCheck` | Sub-document {checkedAt, matchedFaqs[], matchedQuestions[]}                        | Same sub-document                                                           | Same, but local defaults undefined vs remote {} |
| `priorityScore`       | **Missing**                                                                        | Number, default 0                                                           | Remote scores questions by priority             |
| `viewCount`           | Number, default 0                                                                  | Number, default 0                                                           | Same                                            |
| `answerCount`         | Number, default 0                                                                  | Number, default 0                                                           | Same                                            |
| `resolvedAt`          | **Missing**                                                                        | Date                                                                        | Remote tracks resolution timestamp              |
| `embedding`           | **Missing**                                                                        | Number[] with 384-dim validator, select: false                              | Remote stores embeddings                        |
| **Indexes**           | text (title 10x, description 1x), (status, type, updatedAt), (category), (askedBy) | text, (status), (categoryId), (askedBy), (priorityScore -1), (createdAt -1) | Different index strategy                        |

#### **Answer Model**

| Field                      | Local (TS)                                         | Remote (JS)                                  | Difference                                |
| -------------------------- | -------------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| `questionId`               | ObjectId ref, required, indexed                    | ObjectId ref, required                       | Local has index                           |
| `body`                     | String, required, max 4000                         | String, required, min 20                     | Remote enforces min; local enforces max   |
| `answeredBy`               | ObjectId ref, required, indexed                    | ObjectId ref, required                       | Local has index                           |
| `status`                   | Enum (ANSWER_STATUSES), default 'pending', indexed | Enum (ANSWER_STATUS_VALUES), default PENDING | Same                                      |
| `moderatorId`              | ObjectId ref                                       | ObjectId ref                                 | Same                                      |
| `moderationNote`           | String, max 1000                                   | String                                       | Remote lacks maxlength                    |
| `helpfulCount`             | **Missing**                                        | Number, default 0                            | Remote tracks helpful feedback            |
| `notHelpfulCount`          | **Missing**                                        | Number, default 0                            | Remote tracks unhelpful feedback          |
| `upvotes`                  | ObjectId[], select: false                          | **Missing**                                  | Local tracks individual upvoters          |
| `downvotes`                | ObjectId[], select: false                          | **Missing**                                  | Local tracks individual downvoters        |
| `upvoteCount`              | Number, default 0                                  | **Missing**                                  | Local counts upvotes                      |
| `downvoteCount`            | Number, default 0                                  | **Missing**                                  | Local counts downvotes                    |
| `approvedAt`               | Date                                               | Date                                         | Same                                      |
| `embedding`                | Number[], select: false                            | **Missing**                                  | Local reserves embedding field            |
| `eligibleForFaqConversion` | Boolean, default false                             | Boolean, default false                       | Same                                      |
| `convertedFaqId`           | ObjectId ref                                       | ObjectId ref, sparse index                   | Same                                      |
| **Indexes**                | (questionId, status, upvoteCount -1, createdAt -1) | (questionId), (status), (answeredBy)         | Local has compound; remote has individual |

#### **Category Model**

| Field          | Local (TS)                        | Remote (JS)                | Difference                    |
| -------------- | --------------------------------- | -------------------------- | ----------------------------- |
| `name`         | String, required, max 80          | String, required, unique   | Remote adds unique constraint |
| `slug`         | String, required, unique, indexed | String, required, unique   | Same; both auto-generate      |
| `description`  | String, max 500                   | String                     | Remote lacks maxlength        |
| `keywords`     | String[], default []              | **Missing**                | Local stores keyword tags     |
| `isActive`     | Boolean, default true, indexed    | Boolean, default true      | Local has index               |
| `displayOrder` | **Missing**                       | Number, default 0          | Remote allows ordering        |
| **Indexes**    | (slug only)                       | (isActive), (displayOrder) | Different index strategy      |

#### **New Models in Remote (not in Local)**

- **AnalyticsEvent**: user actions (FAQ viewed, question asked, etc.)
- **AnalyticsCache**: cached aggregated analytics with TTL
- **FeedbackEvent**: tracks helpful/unhelpful on FAQs & answers (one per user-entity pair)
- **RefreshToken**: explicit token tracking with revocation hash
- **ReviewItem**: workflow items for FAQ/question reviews
- **SearchLog**: logs all searches, filters used, click-throughs

#### **Models Only in Local (not in Remote)**

- **ChatFeedback**: chatbot interaction ratings
- **Flag**: FAQ report/moderation flags
- **SystemSettings**: system config storage
- **Tag**: (Local has separate implementation; remote uses legacy routes)
- **AuditLog**: (Both have this, but local has cleaner schema)

---

### 4. Route / Endpoint Differences

#### **Auth Routes**

| Endpoint                   | Local                                          | Remote                                   | Difference                                  |
| -------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| `POST /api/auth/register`  | Validates with shared schema                   | Local/inline schema                      | Shared schema in local                      |
| `POST /api/auth/login`     | loginLimiter (10/15min), shared schema         | Local schema, implicit rate limit setup  | Remote uses explicit limiter middleware     |
| `POST /api/auth/refresh`   | Shared schema                                  | Local schema                             | Schema location differs                     |
| `POST /api/auth/logout`    | requireAuth on request body                    | requireAuth + body schema                | Remote requires auth; local doesn't specify |
| `GET /api/auth/me`         | requireAuth                                    | requireAuth                              | Same                                        |
| **Middleware differences** | Uses `asyncHandler`, `validate`, `requireAuth` | Uses asyncHandler, validate, requireAuth | Same pattern                                |

#### **FAQ Routes**

| Endpoint                       | Local                                      | Remote                                                | Difference                                 |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------ |
| `GET /api/faqs`                | `validate(faqListQuerySchema, 'query')`    | `validate(searchQuerySchema, 'query')`                | Different query schema names/fields        |
| `GET /api/faqs/:id`            | Standard                                   | Standard                                              | Same                                       |
| `GET /api/faqs/recent`         | Special route before `:id`                 | **Missing**                                           | Local has recently-viewed endpoint         |
| `POST /api/faqs`               | requireRole('admin', 'moderator')          | requireRole('admin')                                  | Remote admin-only; local allows moderators |
| `PATCH /api/faqs/:id`          | requireRole('admin', 'moderator')          | requireRole('admin')                                  | Same distinction                           |
| `PATCH /api/faqs/:id/archive`  | Archive action                             | **Missing**                                           | Local has explicit archive endpoint        |
| `PATCH /api/faqs/:id/status`   | **Missing**                                | requireRole('admin'), status transition               | Remote has separate status endpoint        |
| `POST /api/faqs/:id/view`      | recordView                                 | trackFaqView                                          | Different naming; local is recordView      |
| `POST /api/faqs/:id/feedback`  | Requires feedback schema                   | **Missing path**                                      | Local posts at `:id/feedback`              |
| `POST /api/faqs/check-similar` | **Missing**                                | requireRole('admin', 'moderator'), similarity check   | Remote has similarity checking             |
| **Query params**               | query, category, tag, sort, page, pageSize | query, categoryId, tagIds, tagId, status, page, limit | Different field names and filtering        |

#### **Q&A Routes**

| Endpoint                                | Local                                       | Remote                                    | Difference                                        |
| --------------------------------------- | ------------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| `POST /api/check-existing`              | checkExisting schema                        | `/api/questions/check-existing`, schema   | Endpoint path/location differs                    |
| `POST /api/questions`                   | Standard create                             | Standard create                           | Same                                              |
| `GET /api/questions`                    | Standard list                               | Standard list                             | Same                                              |
| `GET /api/questions/:id`                | Standard get                                | Standard get                              | Same                                              |
| `POST /api/questions/:id/tag-me`        | Tag self to question                        | **Missing**                               | Local allows students to tag themselves           |
| `GET /api/questions/:id/answers`        | List answers for question                   | Standard                                  | Same                                              |
| `POST /api/questions/:id/answers`       | Submit answer                               | Standard                                  | Same                                              |
| `POST /api/answers/:id/vote/:direction` | Vote up/down                                | **Missing**                               | Local has voting; remote has feedback             |
| `POST /api/answers/:id/feedback`        | **Missing**                                 | Record helpful/unhelpful feedback         | Remote has feedback instead of voting             |
| **Moderation queue**                    | `/api/moderation/queue` (in questionRoutes) | `/api/admin` or `/api/moderation` (split) | Local separates admin/moderation; remote combines |
| `GET /api/moderation/faq-candidates`    | Moderator/admin                             | Moderator/admin                           | Same                                              |
| `POST /api/moderation/bulk`             | Bulk actions                                | **Missing path**                          | Local has bulk action endpoint                    |

#### **Admin Routes**

| Endpoint                             | Local (stats.routes)         | Remote (adminRoutes)         | Difference                            |
| ------------------------------------ | ---------------------------- | ---------------------------- | ------------------------------------- |
| `GET /api/stats/admin-intelligence`  | Separate endpoint            | **Missing**                  | Local has admin intelligence view     |
| `GET /api/stats/faq-quality`         | `/api/stats/faq-quality`     | `/api/admin/faq-quality`     | Different path prefix                 |
| `GET /api/stats/moderation-load`     | `/api/stats/moderation-load` | `/api/admin/moderation-load` | Same logic, different prefix          |
| `GET /api/stats/moderator-personal`  | Moderator/admin              | **Missing**                  | Local has per-moderator stats         |
| `GET /api/stats/community-idle`      | **Idle bucket counts**       | **Missing**                  | Local has community queue idle counts |
| `GET /api/stats/leaderboard`         | Student only (Spurti Points) | **Missing**                  | Local has leaderboard                 |
| `GET /api/stats/student`             | Student dashboard            | **Missing**                  | Local has student-specific stats      |
| `GET /api/stats/faqs`                | Moderator/admin FAQ stats    | **Missing path**             | Local has FAQ-specific metrics        |
| `GET /api/stats/moderator`           | Moderator dashboard          | **Missing path**             | Local has moderator personal stats    |
| `GET /api/admin/overview`            | **Missing**                  | Admin overview endpoint      | Remote admin stats                    |
| `GET /api/admin/issue-heatmap`       | **Missing**                  | Admin heatmap (days param)   | Remote heat mapping                   |
| `GET /api/admin/unanswered-searches` | **Missing**                  | Common unanswered searches   | Remote search analytics               |
| `GET /api/admin/audit-logs`          | `/api/audit/logs` (separate) | `/api/admin/audit-logs`      | Local has dedicated audit routes      |

#### **Category Routes**

| Endpoint   | Local                                | Remote                    | Notes                     |
| ---------- | ------------------------------------ | ------------------------- | ------------------------- |
| CRUD paths | `/api/categories` prefix             | `/api/categories` prefix  | Both similar              |
| Schemas    | Shared schemas from @samagama/shared | Inline z.object() schemas | Local uses shared package |

#### **User Routes**

| Endpoint      | Local                              | Remote                                | Notes                                |
| ------------- | ---------------------------------- | ------------------------------------- | ------------------------------------ |
| User profiles | `/api/users` (separate controller) | `/api/users` (in questionRoutes area) | Both present but local more explicit |
| Spurti Points | Part of user service               | **Missing**                           | Local tracks contribution points     |

---

### 5. Service / Business Logic Differences

#### **Auth Service**

| Aspect                           | Local                                             | Remote                    | Difference                                     |
| -------------------------------- | ------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| **Password hashing**             | auth.service (bcryptjs)                           | User model pre-save hook  | Local does it in service; remote in schema     |
| **Token signing**                | `signAccessToken`, `signRefreshToken` (JWT utils) | Direct jwt.sign calls     | Local uses wrapper utils                       |
| **Refresh token revocation**     | `tokenVersion` on User doc                        | In-memory blacklist Set() | Local persists version; remote in-memory (MVP) |
| **Registration role assignment** | Admin-only at registration; default student       | Schema default            | Same logic, slightly different                 |
| **Spurti Points initialization** | SPURTI_POINTS.INITIAL_BALANCE for students        | **Missing**               | Local initializes student points on signup     |
| **toPublicUser projection**      | Conditional spurtiPoints field                    | Implicit in sanitizeUser  | Local conditionally exposes points             |

#### **FAQ Service**

| Aspect                         | Local                                                            | Remote                                                                              | Difference                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Slug generation**            | `pre('validate')` appends timestamp                              | `pre('validate')` + `pre('save')` with retry loop                                   | Remote auto-increments suffix on collision; local uses timestamp                                                |
| **Sorting**                    | Multiple strategies (relevance, popular, helpful, added, recent) | qualityScore-based default                                                          | Local has more granular sort options                                                                            |
| **Helpful/unhelpful feedback** | Tracks individual voter IDs (helpfulVotes[], unhelpfulVotes[])   | FeedbackEvent table + helpfulCount/notHelpfulCount                                  | Local stores voters; remote stores counts in separate event log                                                 |
| **Recently-viewed tracking**   | User.recentlyViewedFaqs (bounded array on user)                  | Separate tracking in service                                                        | Local embeds in user; remote separate                                                                           |
| **Quality scoring**            | **Not implemented** (deferred Phase 6)                           | `calculateQualityScore()` static aggregates feedbacks, searches, reviews, staleness | Remote computes 35% helpfulness, 25% search clicks, 20% freshness, 10% repeat Q reduction, 10% moderator review |
| **Embedding generation**       | **Reserved, not implemented**                                    | Scheduled async via `generateFaqEmbedding()` (Xenova all-MiniLM-L6-v2)              | Remote has full embedding pipeline                                                                              |
| **Search**                     | Text search + (Phase 6) vector search placeholder                | Hybrid text + semantic search with Jaccard tokenization                             | Remote does keyword + semantic scoring                                                                          |
| **View counting**              | Idempotent view recording + recently-viewed LRU                  | View debounce (10-min window) + LRU on user                                         | Same logic, slightly different debounce                                                                         |
| **Answer reset rule**          | When answer body changes, reset helpful/unhelpful counts & flags | No equivalent                                                                       | Local implements Dashboard Spec rule                                                                            |
| **Flag handling**              | flagCount field on FAQ                                           | No flag model                                                                       | Local tracks flags; remote uses reviews                                                                         |

#### **Moderation Service**

| Aspect                                       | Local                                                                 | Remote                             | Difference                                       |
| -------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------ |
| **Approve answer**                           | Sets status='approved', awards Spurti Points, marks question resolved | Similar flow                       | Both similar; local explicit points              |
| **Reject answer**                            | Sets status='rejected'                                                | rejectAnswer + requestChanges flow | Remote has request-changes variant               |
| **Moderator response to personal questions** | Direct service method                                                 | Part of question service           | Local separates personal response logic          |
| **FAQ conversion from answers**              | Conversion workflow                                                   | Embedded in faqService             | Local in moderationService; remote in faqService |
| **Bulk operations**                          | bulkApprove, bulkReject                                               | bulkModerationAction (generic)     | Remote uses single endpoint with action param    |
| **Mark for FAQ**                             | markForFaq sets eligibleForFaqConversion                              | recommendFaqConversion with notes  | Remote adds notes capability                     |

#### **Question/Answer Service (Remote's questionService)**

| Aspect                     | Local                                 | Remote                                               | Difference                                  |
| -------------------------- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| **Check existing answers** | Separate endpoint/service             | checkExistingAnswers with embedding + keyword search | Remote uses embeddings + Jaccard similarity |
| **Priority scoring**       | Not in local                          | priorityScore field computed                         | Remote calculates question priority         |
| **Answer feedback**        | Vote up/down (upvotes[], downvotes[]) | helpfulCount/notHelpfulCount in FeedbackEvent table  | Different tracking mechanisms               |
| **Question resolution**    | Manual moderation action              | Question status tracking (OPEN, ANSWERED, RESOLVED)  | Local uses status field; remote similar     |

#### **Analytics Service (Remote only)**

- Computes dashboard metrics with caching
- Aggregates FAQs by status, views, quality
- Moderator workload trends
- Search analytics (common unanswered searches)
- FAQ quality distribution

---

### 6. Middleware Differences

| Middleware        | Local                                                              | Remote                                                                              | Difference                                                                  |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Auth**          | `requireAuth`, `requireRole`                                       | `requireAuth`, `authenticate` (alias), **no requireRole**                           | Local has role enforcement; remote moved to rbac.js                         |
| **RBAC**          | Built into auth.ts as `requireRole()`                              | Separate middleware `rbac.js` with `requireRole`, `requireOwnerOrRole`              | Remote supports owner-or-role pattern                                       |
| **Error Handler** | Zod, Mongoose CastError, ValidationError, 11000, ApiError, generic | ZodError, Mongoose ValidationError, CastError, 11000, AppError, JWT errors, generic | Remote explicitly handles JWT errors (TokenExpiredError, JsonWebTokenError) |
| **Validation**    | `validate(schema, location?)` with Zod                             | `validate(schema, location?)` with Zod                                              | Same                                                                        |
| **Async Handler** | `asyncHandler` wrapper                                             | `asyncHandler` wrapper                                                              | Both similar                                                                |
| **Rate Limiting** | Global limiter (200/60s) + loginLimiter (10/15min)                 | Global limiter (300/15min), loginRateLimiter middleware                             | Different configurations                                                    |
| **404 Handler**   | `notFoundHandler` in error-handler.ts                              | Separate `notFound.js` middleware                                                   | Same concept, different file                                                |
| **CORS**          | Dynamic corsOrigins array from env                                 | env.CLIENT_URL single origin                                                        | Local more flexible                                                         |
| **Helmet**        | Standard                                                           | Standard                                                                            | Same                                                                        |
| **Morgan**        | Conditional on !isTest                                             | Conditional on NODE_ENV                                                             | Both similar                                                                |
| **Cookie Parser** | Used                                                               | **Not used in remote**                                                              | Local parses cookies                                                        |

---

### 7. Config / Env Differences

#### **Environment Variables**

| Variable             | Local                                                       | Remote                                           | Difference                                         |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `NODE_ENV`           | enum: dev, test, prod                                       | enum: dev, test, prod                            | Same                                               |
| `PORT`               | default 4000                                                | default 5000                                     | Different default                                  |
| `MONGODB_URI`        | required string                                             | required string                                  | Same                                               |
| `JWT_ACCESS_SECRET`  | min 32 chars                                                | min 32 chars                                     | Same                                               |
| `JWT_REFRESH_SECRET` | min 32 chars                                                | min 32 chars                                     | Same                                               |
| `JWT_ACCESS_EXPIRY`  | **Not in env** (hardcoded 'xxm')                            | required string ('15m')                          | Local hardcodes; remote envs it                    |
| `JWT_REFRESH_EXPIRY` | **Not in env** (hardcoded '7d')                             | required string ('7d')                           | Local hardcodes; remote envs it                    |
| `CORS_ORIGINS`       | string, comma-separated, default localhost:5173             | **Not validated** (CLIENT_URL is URL)            | Local parses comma list; remote single URL         |
| `CLIENT_URL`         | **Missing**                                                 | required URL string                              | Remote validates CORS origin explicitly            |
| `LOG_LEVEL`          | enum: fatal, error, warn, info, debug, trace (default info) | **Missing**                                      | Local uses pino logger levels; remote uses console |
| `LLM_PROVIDER`       | enum: mock, gemini, local-llama (default mock)              | **Missing**                                      | Local supports LLM integration                     |
| `GEMINI_API_KEY`     | optional string                                             | **Missing**                                      | Local supports Gemini API                          |
| `EMBEDDING_PROVIDER` | enum: mock, gemini (default mock)                           | **Missing** (uses @xenova/transformers directly) | Local pluggable; remote hardcoded                  |

#### **Database Configuration**

- **Local**: Separate `database.ts` with `connectDatabase()`, `disconnectDatabase()` functions
- **Remote**: `db.js` with `connectDB()`, `registerGracefulShutdown(server)`

#### **Logger Configuration**

- **Local**: Dedicated `logger.ts` with pino setup, pretty-printer on dev
- **Remote**: Console logging (no dedicated logger config file)

---

### 8. Package / Dependency Differences

#### **Shared Dependencies**

| Package              | Local Version   | Remote Version       | Difference                                        |
| -------------------- | --------------- | -------------------- | ------------------------------------------------- |
| express              | ^4.21.1         | ^4.21.2              | Remote is newer patch                             |
| mongoose             | ^8.8.1          | ^8.9.5               | Remote is newer                                   |
| cors                 | ^2.8.5          | ^2.8.5               | Same                                              |
| helmet               | ^8.0.0          | ^8.0.0               | Same                                              |
| morgan               | ^1.10.0         | ^1.10.0              | Same                                              |
| jsonwebtoken         | ^9.0.2          | ^9.0.2               | Same                                              |
| bcryptjs             | ^2.4.3          | (uses bcrypt ^5.1.1) | Local uses bcryptjs; remote uses bcrypt           |
| dotenv               | ^16.4.5         | ^16.4.7              | Remote is newer                                   |
| express-rate-limit   | ^7.4.1          | ^7.5.0               | Remote is newer                                   |
| zod                  | ^3.23.8         | ^3.25.0              | Remote is newer                                   |
| pino                 | ^9.5.0          | **Missing**          | Local uses pino for logging                       |
| pino-pretty          | ^11.3.0         | **Missing**          | Local uses pino-pretty                            |
| slugify              | **Missing**     | ^1.6.6               | Remote uses slugify npm package                   |
| @xenova/transformers | **Missing**     | ^2.17.2              | Remote uses local ML embeddings                   |
| @samagama/shared     | "\*" (monorepo) | "file:../shared"     | Local uses monorepo resolution; remote uses file: |

#### **Dev Dependencies**

- **Local**: tsx, typescript, vitest, supertest, @types/\* for typing
- **Remote**: jest, mongodb-memory-server, nodemon, cross-env, eslint

#### **Build/Test Setup**

- **Local**: TypeScript + vitest, build to dist/, `tsx watch` for dev
- **Remote**: Node ESM only, no build step, `nodemon` for dev

---

### 9. Architecture Summary

#### **Key Structural Divergences:**

1. **Language & Type Safety:**
   - **Local**: Full TypeScript with strict type checking, interfaces for domain models, shared types from @samagama/shared package
   - **Remote**: Plain JavaScript with runtime Zod validation, inline type checks, manual schema definitions

2. **Constants & Enums:**
   - **Local**: Enums live in @samagama/shared, imported into models and services
   - **Remote**: Replicated constants across `/constants/*.js` files (roles.js, statuses.js, errorCodes.js, httpStatus.js, eventTypes.js, etc.)

3. **Data Models & Analytics:**
   - **Local**: Simpler models (no quality scoring, no embeddings in Phase 6 yet), no SearchLog/ReviewItem/AnalyticsEvent/AnalyticsCache models
   - **Remote**: Rich analytics ecosystem with SearchLog, ReviewItem, AnalyticsEvent, AnalyticsCache, explicit FeedbackEvent tracking; FAQ quality score computed from helfulness + search clicks + freshness + repeat Q reduction + moderator review score

4. **Feedback Mechanisms:**
   - **Local**: Answer voting (upvotes/downvotes arrays tracked on Answer doc), FAQ helpful/unhelpful votes tracked as arrays of user IDs on FAQ doc
   - **Remote**: Separate FeedbackEvent collection (one-per-user-entity) + count fields (helpfulCount, notHelpfulCount); enables efficient deduping and analytics

5. **Authentication & Token Management:**
   - **Local**: tokenVersion on User doc for refresh revocation; hardcoded expiry times (15m access, 7d refresh)
   - **Remote**: In-memory blacklist Set() for MVP token revocation; environment-configurable expiry times; explicit RefreshToken model (prepared for production upgrade)

6. **Slug Generation:**
   - **Local**: Timestamp suffix (`${base}-${Date.now().toString(36)}`) ensures uniqueness without DB retries
   - **Remote**: Retry loop with incrementing suffix counter, loops until candidate is unique

7. **FAQ Search & Ranking:**
   - **Local**: Sort options (relevance, popular, helpful, added, recent) with static text index weighting
   - **Remote**: Hybrid search with semantic (Xenova embeddings) + keyword (Jaccard tokenization) scoring; dynamic quality score field; explains results with factors (semantic match, keyword match, highly rated, freshness)

8. **Moderation Workflow:**
   - **Local**: Approval/rejection with optional Spurti Points award; mark-for-FAQ workflow
   - **Remote**: More granular (approve, reject, request-changes, resolve question, mark-duplicate, recommend-FAQ) with ReviewItem tracking and bulk operations

9. **Spurti Points System:**
   - **Local**: Tracked in User.spurtiPoints, awarded on answer approval, shown on student leaderboard
   - **Remote**: Not implemented (no spurtiPoints field in User model)

10. **Error Handling:**
    - **Local**: ApiError class with static factory methods (badRequest, unauthorized, forbidden, notFound, conflict, unprocessable, internal); Zod validation surfaces in error-handler
    - **Remote**: AppError base class + subclasses (BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError); explicit JWT error handling in error-handler

---

## Summary

The **local TypeScript backend** is more structured, type-safe, and production-ready with:

- Full TypeScript compilation and type checking
- Centralized shared types from monorepo
- Spurti Points community contribution system
- Simpler MVP models (deferring embedding/quality scoring to Phase 6)
- Consistent error handling with ApiError factories
- Built-in logging with pino

The **remote JavaScript backend** is more feature-complete and analytics-rich with:

- Local ML embeddings (Xenova) for semantic search
- Complex quality score computation
- Rich analytics models (SearchLog, ReviewItem, AnalyticsEvent, FeedbackEvent)
- In-memory token blacklist (MVP, needs Redis in production)
- Detailed moderation workflow with review queue
- Hybrid search combining semantic + keyword matching
- No Spurti Points system

**The two backends are at different maturity levels:** Local is a cleaner, typed MVP; Remote is a more feature-complete but less type-safe implementation with production analytics infrastructure.

---
