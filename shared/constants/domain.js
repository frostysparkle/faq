export const FAQ_VISIBILITY = Object.freeze({
  INTERNAL: "internal",
  RESTRICTED: "restricted"
});

export const QUESTION_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
});

export const ANSWER_CONFIDENCE = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
});

export const FAQ_VISIBILITY_VALUES = Object.freeze(Object.values(FAQ_VISIBILITY));
export const QUESTION_PRIORITY_VALUES = Object.freeze(Object.values(QUESTION_PRIORITY));
export const ANSWER_CONFIDENCE_VALUES = Object.freeze(Object.values(ANSWER_CONFIDENCE));
