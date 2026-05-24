import { Types } from "mongoose";
import { AnswerModel } from "../models/Answer.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { QuestionModel } from "../models/Question.js";
import { AppError } from "../utils/AppError.js";
import { embeddingService } from "./embedding.service.js";

export async function listPendingAnswers() {
  return AnswerModel.find({ status: "pending" })
    .populate("questionId answeredBy")
    .sort({ createdAt: 1 })
    .lean();
}

export async function approveAnswer(answerId: string, moderatorId: string, note?: string) {
  const answer = await AnswerModel.findById(answerId);
  if (!answer) throw new AppError(404, "ANSWER_NOT_FOUND", "Answer was not found.");
  const before = answer.toObject();
  answer.status = "approved";
  answer.moderatorId = new Types.ObjectId(moderatorId);
  if (note !== undefined) answer.moderationNote = note;
  answer.approvedAt = new Date();
  answer.embedding = await embeddingService.embed(answer.body);
  answer.indexingStatus = "indexed";
  answer.eligibleForFaqConversion = true;
  await answer.save();
  await QuestionModel.findByIdAndUpdate(answer.questionId, { status: "resolved" });
  await AuditLogModel.create({
    actorId: moderatorId,
    action: "answer.approved",
    entityType: "answer",
    entityId: answer._id,
    before,
    after: answer.toObject()
  });
  return answer;
}

export async function rejectAnswer(answerId: string, moderatorId: string, reason: string) {
  const answer = await AnswerModel.findById(answerId);
  if (!answer) throw new AppError(404, "ANSWER_NOT_FOUND", "Answer was not found.");
  const before = answer.toObject();
  answer.status = "rejected";
  answer.moderatorId = new Types.ObjectId(moderatorId);
  answer.moderationNote = reason;
  await answer.save();
  await AuditLogModel.create({
    actorId: moderatorId,
    action: "answer.rejected",
    entityType: "answer",
    entityId: answer._id,
    before,
    after: answer.toObject()
  });
  return answer;
}

export async function markQuestionResolved(questionId: string) {
  const question = await QuestionModel.findByIdAndUpdate(
    questionId,
    { status: "resolved" },
    { new: true }
  );
  if (!question) throw new AppError(404, "QUESTION_NOT_FOUND", "Question was not found.");
  return question;
}

export async function markQuestionDuplicate(questionId: string, duplicateOf: string) {
  const question = await QuestionModel.findByIdAndUpdate(
    questionId,
    { status: "duplicate", duplicateOf },
    { new: true }
  );
  if (!question) throw new AppError(404, "QUESTION_NOT_FOUND", "Question was not found.");
  return question;
}
