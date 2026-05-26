// Moderator/admin actions on community answers and questions.
// Implements PRD §8.7 + Change Spec §5.5 (edit-and-approve).
import { Types } from 'mongoose';
import type { ModerateAnswerInput } from '@samagama/shared';
import { SPURTI_POINTS } from '@samagama/shared';
import { AnswerModel } from '../models/Answer.model.js';
import { QuestionModel } from '../models/Question.model.js';
import { UserModel } from '../models/User.model.js';
import { ApiError } from '../utils/api-error.js';
export interface PendingAnswerRow {
  id: string;
  body: string;
  questionId: string;
  questionTitle: string;
  author: { id: string; name: string };
  taggedStudents: { id: string; name: string }[];
  createdAt: string;
}

interface PopulatedPending {
  _id: Types.ObjectId;
  body: string;
  questionId: {
    _id: Types.ObjectId;
    title: string;
    taggedStudents: { _id: Types.ObjectId; name: string }[];
  };
  answeredBy: { _id: Types.ObjectId; name: string };
  createdAt: Date;
}

function projectPending(a: PopulatedPending): PendingAnswerRow {
  return {
    id: a._id.toString(),
    body: a.body,
    questionId: a.questionId._id.toString(),
    questionTitle: a.questionId.title,
    author: { id: a.answeredBy._id.toString(), name: a.answeredBy.name },
    taggedStudents: (a.questionId.taggedStudents ?? []).map((s) => ({
      id: s._id.toString(),
      name: s.name,
    })),
    createdAt: a.createdAt.toISOString(),
  };
}

export const moderationService = {
  /**
   * Approve an answer. Optionally edit the body in the same call (Change Spec §5.5).
   * Side effect: when the FIRST answer on a question is approved, mark the question resolved.
   */
  async approveAnswer(
    answerId: string,
    moderatorId: string,
    input: ModerateAnswerInput = {},
  ): Promise<void> {
    const answer = await AnswerModel.findById(answerId);
    if (!answer) throw ApiError.notFound('Answer not found');
    if (answer.status === 'approved') return; // idempotent

    if (input.editedBody) answer.body = input.editedBody;
    answer.status = 'approved';
    answer.moderatorId = new Types.ObjectId(moderatorId);
    if (input.note) answer.moderationNote = input.note;
    answer.approvedAt = new Date();
    await answer.save();

    // Spurti Points: award the answer's author once on first approval.
    // Moderator chooses a value in [-1, 5]; falls back to the configured default.
    // Award is idempotent because we early-return above when already approved.
    const pts = input.spurtiPoints ?? SPURTI_POINTS.ANSWER_APPROVED_DEFAULT;
    await UserModel.updateOne(
      { _id: answer.answeredBy },
      { $inc: { spurtiPoints: pts } },
    );

    // Flip the question to resolved on the first approval.
    const question = await QuestionModel.findById(answer.questionId);
    if (question && question.status !== 'resolved') {
      question.status = 'resolved';
      await question.save();
    }
  },

  async rejectAnswer(
    answerId: string,
    moderatorId: string,
    input: ModerateAnswerInput = {},
  ): Promise<void> {
    const answer = await AnswerModel.findById(answerId);
    if (!answer) throw ApiError.notFound('Answer not found');
    if (answer.status === 'rejected') return;

    answer.status = 'rejected';
    answer.moderatorId = new Types.ObjectId(moderatorId);
    if (input.note) answer.moderationNote = input.note;
    await answer.save();
  },

  /** Cross-question pending queue (FIFO) used by the global Unresolved Questions screen. */
  async listPendingAnswers(): Promise<PendingAnswerRow[]> {
    const pending = await AnswerModel.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('answeredBy', 'name')
      .populate({
        path: 'questionId',
        select: 'title taggedStudents',
        populate: { path: 'taggedStudents', select: 'name' },
      })
      .lean<PopulatedPending[]>();
    return pending.map(projectPending);
  },

  /**
   * Pending answers for a single question. Drives the per-card "Show More" cycle
   * (1 → +2 → all 10) on the moderator review surface.
   */
  async listPendingAnswersForQuestion(
    questionId: string,
    limit: number,
  ): Promise<PendingAnswerRow[]> {
    if (!Types.ObjectId.isValid(questionId)) throw ApiError.badRequest('Invalid question id');
    const safeLimit = Math.min(Math.max(limit, 1), 10);
    const pending = await AnswerModel.find({ questionId, status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(safeLimit)
      .populate('answeredBy', 'name')
      .populate({
        path: 'questionId',
        select: 'title taggedStudents',
        populate: { path: 'taggedStudents', select: 'name' },
      })
      .lean<PopulatedPending[]>();
    return pending.map(projectPending);
  },

  /**
   * Moderator answers a personal question directly. Bypasses peer-answer moderation since
   * the moderator IS the authority. Stored as an Answer row with status='approved' so the
   * existing projection lights up `displayState: 'responded'` for the asker (Change Spec §5.3).
   */
  async respondToPersonalQuestion(
    questionId: string,
    moderatorId: string,
    body: string,
  ): Promise<void> {
    const question = await QuestionModel.findById(questionId);
    if (!question) throw ApiError.notFound('Question not found');
    if (question.type !== 'personal') {
      throw ApiError.badRequest('Use the peer-answer flow for community questions');
    }

    const trimmed = body.trim();
    if (trimmed.length < 10) throw ApiError.badRequest('Response must be at least 10 characters');
    if (trimmed.length > 4000) throw ApiError.badRequest('Response is too long');

    await AnswerModel.create({
      questionId,
      body: trimmed,
      answeredBy: moderatorId,
      status: 'approved',
      moderatorId: new Types.ObjectId(moderatorId),
      approvedAt: new Date(),
    });

    question.answerCount += 1;
    question.status = 'resolved';
    await question.save();
  },
};
