export {
  ANSWER_STATUS,
  FAQ_REVIEW_STATE,
  FAQ_SOURCE_TYPE,
  FAQ_STATUS,
  QUESTION_STATUS,
  REVIEW_STATUS,
  REVIEW_TYPE,
  USER_STATUS
} from "./statuses.js";

export const ENTITY_TYPES = Object.freeze({
  USER: "user",
  FAQ: "faq",
  CATEGORY: "category",
  TAG: "tag",
  QUESTION: "question",
  ANSWER: "answer",
  AUDIT_LOG: "audit_log"
});
