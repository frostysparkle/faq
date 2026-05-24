import type {
  ANSWER_STATUSES,
  CHAT_FEEDBACK_RATINGS,
  FAQ_SOURCE_TYPES,
  FAQ_STATUSES,
  FLAG_REASONS,
  FLAG_STATUSES,
  QUESTION_STATUSES,
  USER_ROLES,
  USER_STATUSES
} from "./constants.js";

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type FaqStatus = (typeof FAQ_STATUSES)[number];
export type FaqSourceType = (typeof FAQ_SOURCE_TYPES)[number];
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];
export type FlagStatus = (typeof FLAG_STATUSES)[number];
export type FlagReason = (typeof FLAG_REASONS)[number];
export type ChatFeedbackRating = (typeof CHAT_FEEDBACK_RATINGS)[number];

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SourceReference {
  id: string;
  type: "faq" | "answer";
  title: string;
  score: number;
}
