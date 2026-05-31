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
    // Personal questions are fully resolved by a moderator response.
    // Community questions stay 'answered' so peers can still contribute.
    question.status = question.type === 'personal' ? 'resolved' : 'answered';
    await question.save();
  },

  /** List approved answers eligible for FAQ conversion. */
  async listFaqCandidates(): Promise<FaqCandidateRow[]> {
    const candidates = await AnswerModel.find({
      status: 'approved',
      eligibleForFaqConversion: true,
      convertedFaqId: { $exists: false },
    })
      .sort({ approvedAt: -1 })
      .populate('answeredBy', 'name')
      .populate('moderatorId', 'name')
      .populate({
        path: 'questionId',
        select: 'title description category',
        populate: { path: 'category', select: 'name' },
      })
      .lean();

    return (candidates as unknown as PopulatedCandidate[]).map((c) => ({
      id: c._id.toString(),
      questionTitle: c.questionId?.title ?? 'Deleted question',
      questionDescription: c.questionId?.description ?? '',
      answerBody: c.body,
      category: c.questionId?.category?.name ?? '—',
      author: { id: c.answeredBy._id.toString(), name: c.answeredBy.name },
      moderator: c.moderatorId
        ? { id: c.moderatorId._id.toString(), name: c.moderatorId.name }
        : undefined,
      approvedAt: c.approvedAt?.toISOString() ?? c.createdAt.toISOString(),
    }));
  },

  /** Convert an approved answer to a new FAQ draft. Admin only. */
  async convertToFaq(
    answerId: string,
    actorId: string,
  ): Promise<{ faqId: string }> {
    const answer = await AnswerModel.findById(answerId).populate('questionId', 'title description category tags');
    if (!answer) throw ApiError.notFound('Answer not found');
    if (answer.status !== 'approved') throw ApiError.badRequest('Only approved answers can be converted');
    if (answer.convertedFaqId) throw ApiError.conflict('This answer has already been converted to a FAQ');

    const question = answer.questionId as unknown as {
      _id: Types.ObjectId;
      title: string;
      description: string;
      category: Types.ObjectId;
      tags: Types.ObjectId[];
    };

    // Import dynamically to avoid circular deps
    const { FaqModel } = await import('../models/Faq.model.js');

    const faq = await FaqModel.create({
      title: question.title,
      answer: answer.body,
      summary: question.description.substring(0, 280),
      categories: question.category ? [question.category] : [],
      tags: question.tags ?? [],
      status: 'draft',
      sourceType: 'community_conversion',
      sourceQuestionId: question._id,
      createdBy: actorId,
      updatedBy: actorId,
    });

    answer.convertedFaqId = faq._id as Types.ObjectId;
    await answer.save();

    return { faqId: faq._id.toString() };
  },

  /** Bulk approve multiple pending answers. */
  async bulkApprove(
    answerIds: string[],
    moderatorId: string,
  ): Promise<{ approved: number }> {
    let approved = 0;
    for (const id of answerIds) {
      try {
        await this.approveAnswer(id, moderatorId);
        approved++;
      } catch {
        // Skip invalid or already-processed answers
      }
    }
    return { approved };
  },

  /** Bulk reject multiple pending answers. */
  async bulkReject(
    answerIds: string[],
    moderatorId: string,
    note?: string,
  ): Promise<{ rejected: number }> {
    let rejected = 0;
    for (const id of answerIds) {
      try {
        await this.rejectAnswer(id, moderatorId, { note });
        rejected++;
      } catch {
        // Skip invalid or already-processed answers
      }
    }
    return { rejected };
  },

  /** Mark an approved answer as eligible for FAQ conversion. */
  async markForFaq(answerId: string): Promise<void> {
    const answer = await AnswerModel.findById(answerId);
    if (!answer) throw ApiError.notFound('Answer not found');
    if (answer.status !== 'approved') throw ApiError.badRequest('Only approved answers can be marked for FAQ');
    answer.eligibleForFaqConversion = true;
    await answer.save();
  },
};

// Internal types for populated candidates
interface PopulatedCandidate {
  _id: Types.ObjectId;
  body: string;
  questionId: {
    _id: Types.ObjectId;
    title: string;
    description: string;
    category?: { name: string };
  } | null;
  answeredBy: { _id: Types.ObjectId; name: string };
  moderatorId?: { _id: Types.ObjectId; name: string };
  approvedAt?: Date;
  createdAt: Date;
}

export interface FaqCandidateRow {
  id: string;
  questionTitle: string;
  questionDescription: string;
  answerBody: string;
  category: string;
  author: { id: string; name: string };
  moderator?: { id: string; name: string };
  approvedAt: string;
}

