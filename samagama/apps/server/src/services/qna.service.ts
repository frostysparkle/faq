import crypto from "node:crypto";
import type { ExistingAnswerCheckInput } from "../validators/qna.validators.js";
import { AnswerModel } from "../models/Answer.js";
import { QuestionModel } from "../models/Question.js";
import { AppError } from "../utils/AppError.js";
import { embeddingService } from "./embedding.service.js";
import { checkFaqDuplicates } from "./faq.service.js";

export async function checkExistingAnswers(input: ExistingAnswerCheckInput, userId: string) {
  const faqMatches = await checkFaqDuplicates(input.title, input.description);
  const token = crypto
    .createHash("sha256")
    .update(`${userId}:${input.title}:${Date.now()}`)
    .digest("hex");
  return {
    token,
    matchedFaqs: faqMatches.slice(0, 5),
    matchedQuestions: []
  };
}

export async function createQuestion(
  input: {
    title: string;
    description: string;
    categoryId: string;
    tagIds: string[];
    existingAnswerCheckToken: string;
  },
  actorId: string
) {
  return QuestionModel.create({
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    tags: input.tagIds,
    askedBy: actorId,
    status: "open",
    existingAnswerCheck: {
      checkedAt: new Date(),
      token: input.existingAnswerCheckToken,
      matchedFaqs: [],
      matchedQuestions: []
    }
  });
}

export async function listQuestions(status?: string) {
  const filter = status ? { status } : {};
  return QuestionModel.find(filter)
    .populate("categoryId tags askedBy")
    .sort({ updatedAt: -1 })
    .lean();
}

export async function getQuestion(id: string) {
  const question = await QuestionModel.findById(id).populate("categoryId tags askedBy").lean();
  if (!question) throw new AppError(404, "QUESTION_NOT_FOUND", "Question was not found.");
  const answers = await AnswerModel.find({ questionId: id, status: { $ne: "rejected" } })
    .populate("answeredBy")
    .sort({ createdAt: -1 })
    .lean();
  return { question, answers };
}

export async function submitAnswer(questionId: string, body: string, actorId: string) {
  const question = await QuestionModel.findById(questionId);
  if (!question) throw new AppError(404, "QUESTION_NOT_FOUND", "Question was not found.");
  const answer = await AnswerModel.create({
    questionId,
    body,
    answeredBy: actorId,
    status: "pending",
    embedding: await embeddingService.embed(body)
  });
  question.answerCount += 1;
  if (question.status === "open") question.status = "answered";
  await question.save();
  return answer;
}
