// Community Q&A service. Implements PRD §8.6 + Change Spec §5–§6.
//
// Notable rules baked in:
//  - Existing-answer check returns top FAQ matches AND top open community-question matches.
//    A short-lived signed token is returned; createQuestion requires it (PRD QNA-002).
//  - Personal questions are visible only to the asker, moderators, and admins.
//  - Community-question answer cap: hard server-side guard at COMMUNITY_ANSWER_CAP (Change Spec §5.5).
//  - Tag-me: any student may register their interest in an existing community question.
//  - Vote toggling on answers is idempotent and atomic.
import { Types, type FilterQuery } from 'mongoose';
import jwt from 'jsonwebtoken';
import {
  COMMUNITY_ANSWER_CAP,
  type AnswerCreateInput,
  type CheckExistingInput,
  type ExistingAnswerCheckResult,
  type PublicAnswer,
  type PublicFaqMatch,
  type PublicQuestion,
  type PublicQuestionMatch,
  type QuestionCreateInput,
  type UserRole,
} from '@samagama/shared';
import { FaqModel } from '../models/Faq.model.js';
import { QuestionModel, type QuestionDocument } from '../models/Question.model.js';
import { AnswerModel, type AnswerDocument } from '../models/Answer.model.js';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';

/** Signed token TTL for the existing-answer check (15 minutes). Long enough to read suggestions, short enough to limit replay. */
const EXISTING_CHECK_TTL = 15 * 60;

interface CheckTokenPayload {
  uid: string;
  th: string; // title hash
}

function hashTitle(title: string): string {
  // FNV-1a-ish lightweight hash; collision-resistant enough for replay protection of a 15-min window.
  let h = 0x811c9dc5;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function signCheckToken(userId: string, title: string): string {
  const payload: CheckTokenPayload = { uid: userId, th: hashTitle(title) };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: EXISTING_CHECK_TTL });
}

function verifyCheckToken(token: string, userId: string, title: string): boolean {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as CheckTokenPayload;
    return decoded.uid === userId && decoded.th === hashTitle(title);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Projection helpers — never expose internal fields like vote arrays directly.
// ----------------------------------------------------------------------------

interface PopulatedQuestion extends Omit<QuestionDocument, 'category' | 'tags' | 'askedBy'> {
  category: { _id: Types.ObjectId; name: string; slug: string } | null;
  tags: { _id: Types.ObjectId; name: string; slug: string }[];
  askedBy: { _id: Types.ObjectId; name: string };
}

interface PopulatedAnswer extends Omit<AnswerDocument, 'answeredBy'> {
  answeredBy: { _id: Types.ObjectId; name: string };
}

function projectQuestion(q: PopulatedQuestion, viewerId?: string): PublicQuestion {
  const result: PublicQuestion = {
    id: q._id.toString(),
    title: q.title,
    description: q.description,
    type: q.type,
    status: q.status,
    category: q.category
      ? { id: q.category._id.toString(), name: q.category.name, slug: q.category.slug }
      : null,
    tags: q.tags.map((t) => ({ id: t._id.toString(), name: t.name, slug: t.slug })),
    author: { id: q.askedBy._id.toString(), name: q.askedBy.name },
    screenshotUrl: q.screenshotUrl ?? undefined,
    answerCount: q.answerCount,
    viewCount: q.viewCount,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };

  // Personal question display state — only emitted when the requester is the asker (Change Spec §5.3).
  if (q.type === 'personal' && viewerId && q.askedBy._id.toString() === viewerId) {
    if (q.answerCount > 0 || q.status === 'answered' || q.status === 'resolved') {
      result.displayState = 'responded';
    } else if (q.moderatorViewedAt) {
      result.displayState = 'seen';
    } else {
      result.displayState = 'posted';
    }
  }
  return result;
}

function projectAnswer(a: PopulatedAnswer, viewerId?: string): PublicAnswer {
  const result: PublicAnswer = {
    id: a._id.toString(),
    body: a.body,
    status: a.status,
    author: { id: a.answeredBy._id.toString(), name: a.answeredBy.name },
    upvoteCount: a.upvoteCount,
    downvoteCount: a.downvoteCount,
    moderationNote: a.moderationNote ?? undefined,
    approvedAt: a.approvedAt?.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
  if (viewerId) {
    const viewerObj = new Types.ObjectId(viewerId);
    if (a.upvotes?.some((v) => v.equals(viewerObj))) result.myVote = 'up';
    else if (a.downvotes?.some((v) => v.equals(viewerObj))) result.myVote = 'down';
    else result.myVote = null;
  }
  return result;
}

// ----------------------------------------------------------------------------
// Service
// ----------------------------------------------------------------------------

export const qnaService = {
  /**
   * Existing-answer check (PRD §8.6 / Change Spec §6.4):
   *   1. Look up top FAQ matches via the FAQ text index.
   *   2. Look up top OPEN community-question matches.
   *   3. Issue a short-lived token; createQuestion will require it.
   */
  async checkExisting(
    input: CheckExistingInput,
    userId: string,
  ): Promise<ExistingAnswerCheckResult> {
    const queryText = `${input.title} ${input.description ?? ''}`.trim();

    const [faqMatches, questionMatches] = await Promise.all([
      FaqModel.find(
        { status: 'published', $text: { $search: queryText } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(5)
        .lean(),
      // Change Spec §6.4: only OPEN/answered community questions, excluding the requester's own.
      QuestionModel.find(
        {
          type: 'community',
          status: { $in: ['open', 'answered'] },
          askedBy: { $ne: new Types.ObjectId(userId) },
          $text: { $search: queryText },
        },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(2)
        .lean(),
    ]);

    const matchedFaqs: PublicFaqMatch[] = faqMatches.map((f) => ({
      id: f._id.toString(),
      title: f.title,
      summary: f.summary ?? undefined,
      answer: f.answer,
      score: (f as { score?: number }).score ?? 0,
    }));

    const matchedQuestions: PublicQuestionMatch[] = questionMatches.map((q) => ({
      id: q._id.toString(),
      title: q.title,
      description: q.description,
      answerCount: q.answerCount,
      score: (q as { score?: number }).score ?? 0,
    }));

    return {
      token: signCheckToken(userId, input.title),
      matchedFaqs,
      matchedQuestions,
    };
  },

  /** Tag the current student onto an existing community question (Change Spec §6.5 / §9.1). */
  async tagMe(questionId: string, userId: string, token: string): Promise<void> {
    const question = await QuestionModel.findById(questionId);
    if (!question) throw ApiError.notFound('Question not found');
    if (question.type !== 'community') {
      throw ApiError.forbidden('Only community questions can be tagged');
    }
    if (!verifyCheckToken(token, userId, question.title)) {
      throw ApiError.forbidden('Existing-answer check token is missing or expired');
    }
    await QuestionModel.updateOne(
      { _id: questionId },
      { $addToSet: { taggedStudents: new Types.ObjectId(userId) } },
    );
  },

  /** Create a question. The check token is required to prove the user saw suggestions. */
  async createQuestion(input: QuestionCreateInput, userId: string): Promise<PublicQuestion> {
    if (!input.existingAnswerCheckToken) {
      throw ApiError.badRequest('Run existing-answer check before submitting');
    }
    if (!verifyCheckToken(input.existingAnswerCheckToken, userId, input.title)) {
      throw ApiError.forbidden('Existing-answer check token is invalid or expired');
    }
    const created = await QuestionModel.create({
      title: input.title,
      description: input.description,
      category: input.category,
      tags: input.tags,
      type: input.type,
      screenshotUrl: input.screenshotUrl,
      askedBy: userId,
      existingAnswerCheck: { checkedAt: new Date() },
    });
    return this.getQuestionById(created.id, userId, 'student');
  },

  async listQuestions(opts: {
    role: UserRole;
    userId: string;
    type?: 'personal' | 'community';
    status?: string;
    mineOnly?: boolean;
  }): Promise<PublicQuestion[]> {
    const filter: FilterQuery<QuestionDocument> = {};

    if (opts.type) filter.type = opts.type;
    if (opts.status) filter.status = opts.status;

    // Visibility:
    // - Students see community questions + their own personal questions.
    // - Moderators / admins see everything.
    if (opts.role === 'student') {
      const ownObjectId = new Types.ObjectId(opts.userId);
      if (opts.mineOnly) {
        filter.askedBy = ownObjectId;
      } else {
        filter.$or = [{ type: 'community' }, { askedBy: ownObjectId }];
      }
    } else if (opts.mineOnly) {
      filter.askedBy = new Types.ObjectId(opts.userId);
    }

    const questions = await QuestionModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('askedBy', 'name')
      .lean<PopulatedQuestion[]>();
    return questions.map((q) => projectQuestion(q, opts.userId));
  },

  async getQuestionById(id: string, viewerId: string, role: UserRole): Promise<PublicQuestion> {
    const question = await QuestionModel.findById(id)
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('askedBy', 'name')
      .lean<PopulatedQuestion>();
    if (!question) throw ApiError.notFound('Question not found');

    // Personal-question access control.
    if (
      question.type === 'personal' &&
      role === 'student' &&
      question.askedBy._id.toString() !== viewerId
    ) {
      throw ApiError.notFound('Question not found');
    }

    // Side effect: when a moderator/admin opens a personal question, set moderatorViewedAt
    // exactly once. This drives the "Seen" tick in My Questions (Change Spec §5.3).
    if (
      (role === 'moderator' || role === 'admin') &&
      question.type === 'personal' &&
      !question.moderatorViewedAt
    ) {
      await QuestionModel.updateOne(
        { _id: id, moderatorViewedAt: { $exists: false } },
        { $set: { moderatorViewedAt: new Date() } },
      );
    }

    // Increment view counter — fire-and-forget (don't block read).
    void QuestionModel.updateOne({ _id: id }, { $inc: { viewCount: 1 } });

    return projectQuestion(question, viewerId);
  },

  async listAnswers(questionId: string, viewerId: string, role: UserRole): Promise<PublicAnswer[]> {
    // Students only see approved answers. Moderators/admins see all.
    const filter: FilterQuery<AnswerDocument> = { questionId };
    if (role === 'student') filter.status = 'approved';

    const answers = await AnswerModel.find(filter)
      .select('+upvotes +downvotes')
      .sort({ upvoteCount: -1, createdAt: 1 })
      .populate('answeredBy', 'name')
      .lean<PopulatedAnswer[]>();
    return answers.map((a) => projectAnswer(a, viewerId));
  },

  /** Submit a peer answer. Server-side cap enforcement (Change Spec §5.5). */
  async submitAnswer(
    questionId: string,
    input: AnswerCreateInput,
    userId: string,
  ): Promise<PublicAnswer> {
    const question = await QuestionModel.findById(questionId);
    if (!question) throw ApiError.notFound('Question not found');
    if (question.type !== 'community') {
      throw ApiError.forbidden('Personal questions cannot receive peer answers');
    }
    if (question.status === 'resolved' || question.status === 'archived') {
      throw ApiError.forbidden('Question is closed for new answers');
    }
    if (question.answerCount >= COMMUNITY_ANSWER_CAP) {
      throw ApiError.forbidden(
        `This question has reached the maximum of ${COMMUNITY_ANSWER_CAP} answers`,
      );
    }
    // Prevent the asker from answering their own question.
    if (question.askedBy.toString() === userId) {
      throw ApiError.forbidden('You cannot answer your own question');
    }

    const answer = await AnswerModel.create({
      questionId,
      body: input.body,
      answeredBy: userId,
      status: 'pending',
    });

    await QuestionModel.updateOne(
      { _id: questionId },
      {
        $inc: { answerCount: 1 },
        ...(question.status === 'open' ? { $set: { status: 'answered' } } : {}),
      },
    );

    const populated = await AnswerModel.findById(answer.id)
      .select('+upvotes +downvotes')
      .populate('answeredBy', 'name')
      .lean<PopulatedAnswer>();
    return projectAnswer(populated!, userId);
  },

  /** Up/down vote on an answer. Toggling is idempotent: same vote twice cancels it. */
  async voteAnswer(
    answerId: string,
    userId: string,
    direction: 'up' | 'down',
  ): Promise<{ upvoteCount: number; downvoteCount: number; myVote: 'up' | 'down' | null }> {
    const userObjId = new Types.ObjectId(userId);
    const answer = await AnswerModel.findById(answerId).select('+upvotes +downvotes');
    if (!answer) throw ApiError.notFound('Answer not found');
    if (answer.status !== 'approved') throw ApiError.forbidden('Answer is not yet approved');
    if (answer.answeredBy.toString() === userId) {
      throw ApiError.forbidden('You cannot vote on your own answer');
    }

    const had = {
      up: answer.upvotes?.some((v) => v.equals(userObjId)) ?? false,
      down: answer.downvotes?.some((v) => v.equals(userObjId)) ?? false,
    };

    let myVote: 'up' | 'down' | null = direction;
    const update: Record<string, unknown> = {};

    if (direction === 'up') {
      if (had.up) {
        // Same vote again — cancel.
        update.$pull = { upvotes: userObjId };
        update.$inc = { upvoteCount: -1 };
        myVote = null;
      } else {
        update.$addToSet = { upvotes: userObjId };
        update.$pull = { downvotes: userObjId };
        update.$inc = {
          upvoteCount: 1,
          ...(had.down ? { downvoteCount: -1 } : {}),
        };
      }
    } else {
      if (had.down) {
        update.$pull = { downvotes: userObjId };
        update.$inc = { downvoteCount: -1 };
        myVote = null;
      } else {
        update.$addToSet = { downvotes: userObjId };
        update.$pull = { upvotes: userObjId };
        update.$inc = {
          downvoteCount: 1,
          ...(had.up ? { upvoteCount: -1 } : {}),
        };
      }
    }

    await AnswerModel.updateOne({ _id: answerId }, update);
    const fresh = await AnswerModel.findById(answerId).lean();
    return {
      upvoteCount: fresh?.upvoteCount ?? 0,
      downvoteCount: fresh?.downvoteCount ?? 0,
      myVote,
    };
  },
};
