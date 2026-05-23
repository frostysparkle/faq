export const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DELETED: "deleted"
});

export const FAQ_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
  NEEDS_REVIEW: "needs_review",
  ARCHIVED: "archived"
});

export const FAQ_SOURCE_TYPE = Object.freeze({
  MANUAL: "manual",
  COMMUNITY_CONVERSION: "community_conversion",
  IMPORTED: "imported"
});

export const FAQ_REVIEW_STATE = Object.freeze({
  NONE: "none",
  NEEDS_REWRITE: "needs_rewrite",
  CANDIDATE_DUPLICATE: "candidate_duplicate",
  ARCHIVE_CANDIDATE: "archive_candidate"
});

export const QUESTION_STATUS = Object.freeze({
  OPEN: "open",
  ANSWERED: "answered",
  RESOLVED: "resolved",
  DUPLICATE: "duplicate",
  ARCHIVED: "archived"
});

export const ANSWER_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  NEEDS_CHANGES: "needs_changes"
});

export const FEEDBACK_ENTITY_TYPE = Object.freeze({
  FAQ: "faq",
  ANSWER: "answer"
});

export const FEEDBACK_VALUE = Object.freeze({
  HELPFUL: "helpful",
  NOT_HELPFUL: "not_helpful"
});

export const REVIEW_ENTITY_TYPE = Object.freeze({
  FAQ: "faq",
  QUESTION: "question",
  ANSWER: "answer"
});

export const REVIEW_TYPE = Object.freeze({
  NEEDS_REVIEW: "needs_review",
  NEEDS_REWRITE: "needs_rewrite",
  CANDIDATE_DUPLICATE: "candidate_duplicate",
  ARCHIVE_CANDIDATE: "archive_candidate",
  FAQ_CONVERSION_CANDIDATE: "faq_conversion_candidate"
});

export const REVIEW_STATUS = Object.freeze({
  OPEN: "open",
  IN_REVIEW: "in_review",
  RESOLVED: "resolved",
  DISMISSED: "dismissed"
});

export const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUS));
export const FAQ_STATUS_VALUES = Object.freeze(Object.values(FAQ_STATUS));
export const FAQ_SOURCE_TYPE_VALUES = Object.freeze(Object.values(FAQ_SOURCE_TYPE));
export const FAQ_REVIEW_STATE_VALUES = Object.freeze(Object.values(FAQ_REVIEW_STATE));
export const QUESTION_STATUS_VALUES = Object.freeze(Object.values(QUESTION_STATUS));
export const ANSWER_STATUS_VALUES = Object.freeze(Object.values(ANSWER_STATUS));
export const FEEDBACK_ENTITY_TYPE_VALUES = Object.freeze(Object.values(FEEDBACK_ENTITY_TYPE));
export const FEEDBACK_VALUE_VALUES = Object.freeze(Object.values(FEEDBACK_VALUE));
export const REVIEW_ENTITY_TYPE_VALUES = Object.freeze(Object.values(REVIEW_ENTITY_TYPE));
export const REVIEW_TYPE_VALUES = Object.freeze(Object.values(REVIEW_TYPE));
export const REVIEW_STATUS_VALUES = Object.freeze(Object.values(REVIEW_STATUS));
