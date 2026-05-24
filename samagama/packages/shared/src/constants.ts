export const USER_ROLES = ["student", "moderator", "admin"] as const;
export const USER_STATUSES = ["active", "suspended", "deleted"] as const;

export const FAQ_STATUSES = ["draft", "published", "outdated", "archived"] as const;
export const FAQ_SOURCE_TYPES = ["manual", "community_conversion", "imported"] as const;

export const QUESTION_STATUSES = ["open", "answered", "resolved", "duplicate", "archived"] as const;
export const ANSWER_STATUSES = ["pending", "approved", "rejected", "needs_changes"] as const;
export const FLAG_STATUSES = ["open", "under_review", "resolved", "dismissed"] as const;
export const FLAG_REASONS = ["incorrect", "outdated", "duplicate", "unclear", "other"] as const;
export const CHAT_FEEDBACK_RATINGS = ["helpful", "incorrect"] as const;

export const DEFAULT_CATEGORIES = [
  "NOC",
  "Technical Issues",
  "Login and Access",
  "Certificates",
  "Attendance",
  "Stipend",
  "Deadlines",
  "Project Submission",
  "Internship Guidelines",
  "General"
] as const;

export const SETTINGS_DEFAULTS = {
  duplicateWarningThreshold: 0.6,
  duplicateStrongThreshold: 0.8,
  chatbotRetrievalThreshold: 0.7,
  chatbotMaxSources: 6,
  requireAnswerModeration: true,
  allowStudentAnswers: true
} as const;
