// String-literal enums consumed by both client and server.
// Each list is the single source of truth used by Mongoose schemas, Zod validators, and UI badges.

export const USER_ROLES = ['student', 'moderator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const FAQ_STATUSES = ['draft', 'published', 'outdated', 'archived'] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];

export const QUESTION_STATUSES = ['open', 'answered', 'resolved', 'duplicate', 'archived'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** Personal questions go to moderators privately; community questions are public (Change Spec §5.2). */
export const QUESTION_TYPES = ['personal', 'community'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ANSWER_STATUSES = ['pending', 'approved', 'rejected', 'needs_changes'] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

export const FLAG_REASONS = ['incorrect', 'outdated', 'duplicate', 'unclear', 'other'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const FLAG_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'] as const;
export type FlagStatus = (typeof FLAG_STATUSES)[number];

export const FLAG_ENTITY_TYPES = ['faq', 'question', 'answer', 'chatbot_response'] as const;
export type FlagEntityType = (typeof FLAG_ENTITY_TYPES)[number];

export const CHAT_FEEDBACK_RATINGS = ['helpful', 'incorrect'] as const;
export type ChatFeedbackRating = (typeof CHAT_FEEDBACK_RATINGS)[number];

/** Derived "WhatsApp-style" status states for personal questions in My Questions (Change Spec §5.3). */
export const PERSONAL_QUESTION_DISPLAY_STATES = ['posted', 'seen', 'responded'] as const;
export type PersonalQuestionDisplayState = (typeof PERSONAL_QUESTION_DISPLAY_STATES)[number];
