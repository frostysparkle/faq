import { AnswerModel } from "../models/Answer.js";
import { ChatFeedbackModel } from "../models/Chat.js";
import { FaqModel } from "../models/Faq.js";
import { FlagModel } from "../models/Flag.js";
import { QuestionModel } from "../models/Question.js";
import { SearchLogModel } from "../models/SearchLog.js";

export async function getAdminStats() {
  const [
    totalFaqs,
    publishedFaqs,
    openQuestions,
    unresolvedQuestions,
    pendingAnswers,
    openFlags,
    incorrectFeedback
  ] = await Promise.all([
    FaqModel.countDocuments(),
    FaqModel.countDocuments({ status: "published" }),
    QuestionModel.countDocuments({ status: "open" }),
    QuestionModel.countDocuments({ status: { $in: ["open", "answered"] } }),
    AnswerModel.countDocuments({ status: "pending" }),
    FlagModel.countDocuments({ status: "open" }),
    ChatFeedbackModel.countDocuments({ rating: "incorrect", status: "open" })
  ]);

  const mostFlaggedFaqs = await FaqModel.find({ flagCount: { $gt: 0 } })
    .sort({ flagCount: -1 })
    .limit(5)
    .lean();

  return {
    totalFaqs,
    publishedFaqs,
    openQuestions,
    unresolvedQuestions,
    pendingModerationItems: pendingAnswers + openFlags,
    pendingAnswers,
    openFlags,
    incorrectFeedback,
    mostFlaggedFaqs
  };
}

export async function getUnansweredSearches() {
  return SearchLogModel.find({ resultCount: 0 }).sort({ createdAt: -1 }).limit(50).lean();
}

export async function getChatbotFeedbackStats() {
  const [helpful, incorrect, openIncorrect] = await Promise.all([
    ChatFeedbackModel.countDocuments({ rating: "helpful" }),
    ChatFeedbackModel.countDocuments({ rating: "incorrect" }),
    ChatFeedbackModel.countDocuments({ rating: "incorrect", status: "open" })
  ]);
  return { helpful, incorrect, openIncorrect };
}
