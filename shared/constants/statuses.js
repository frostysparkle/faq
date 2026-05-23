export const RECORD_STATUS = Object.freeze({
  ACTIVE: "active",
  ARCHIVED: "archived"
});

export const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INVITED: "invited",
  SUSPENDED: "suspended"
});

export const FAQ_STATUS = Object.freeze({
  DRAFT: "draft",
  IN_REVIEW: "in_review",
  PUBLISHED: "published",
  ARCHIVED: "archived"
});

export const QUESTION_STATUS = Object.freeze({
  OPEN: "open",
  TRIAGED: "triaged",
  ANSWERED: "answered",
  ARCHIVED: "archived"
});

export const ANSWER_STATUS = Object.freeze({
  DRAFT: "draft",
  APPROVED: "approved",
  REJECTED: "rejected"
});

export const RECORD_STATUS_VALUES = Object.freeze(Object.values(RECORD_STATUS));
export const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUS));
export const FAQ_STATUS_VALUES = Object.freeze(Object.values(FAQ_STATUS));
export const QUESTION_STATUS_VALUES = Object.freeze(Object.values(QUESTION_STATUS));
export const ANSWER_STATUS_VALUES = Object.freeze(Object.values(ANSWER_STATUS));
