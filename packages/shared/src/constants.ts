// Cross-cutting constants shared by client and server.
// Adding a new value here automatically narrows types in both apps via the schemas.

/** Supported FAQ categories shipped with the MVP. Aligned with PRD §24 Open Questions. */
export const FAQ_CATEGORIES = [
  'NOC',
  'Technical Issues',
  'Login & Access',
  'Certificates',
  'Attendance',
  'Stipend',
  'Deadlines',
  'Project Submission',
  'Internship Guidelines',
  'Other',
] as const;

/** Duplicate-detection thresholds (PRD §8.4). Configurable by admin in settings. */
export const DEFAULT_DUPLICATE_WARN_THRESHOLD = 0.6;
export const DEFAULT_DUPLICATE_STRONG_THRESHOLD = 0.8;

/** RAG retrieval defaults (PRD §16). */
export const DEFAULT_CHATBOT_CONFIDENCE_THRESHOLD = 0.7;
export const DEFAULT_CHATBOT_MAX_SOURCES = 6;

/** Community Q&A: cap on number of student answers per question (Change Spec §5.5). */
export const COMMUNITY_ANSWER_CAP = 10;

/** Pagination defaults applied across list endpoints. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** JWT expiry windows (seconds). */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Recently-viewed FAQ history cap per user. */
export const RECENT_FAQS_LIMIT = 25;

/** API route prefix. */
export const API_PREFIX = '/api';
