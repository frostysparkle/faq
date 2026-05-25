// FAQ domain service.
//
// Responsibilities:
//  - CRUD with status transitions (draft -> published -> outdated -> archived)
//  - List/search with hybrid sort (text relevance OR recency/popularity/helpfulness)
//  - Default sort when no query: updatedAt desc, then viewCount desc (Change Spec §7.1)
//  - View count + recently-viewed list per user
//  - Helpful/unhelpful feedback with one-vote-per-user idempotency
//  - Role-aware projection: students see no raw counts; mods/admins do (Change Spec §7.3)
//
// NOT YET IMPLEMENTED (deferred to Phase 6):
//  - Vector search via MongoDB Atlas Vector Search
//  - Embedding generation on publish
//  - Duplicate detection via cosine similarity
import { Types, type FilterQuery } from 'mongoose';
import type {
  FaqCreateInput,
  FaqListQuery,
  FaqUpdateInput,
  PublicFaq,
  UserRole,
} from '@samagama/shared';
import { RECENT_FAQS_LIMIT } from '@samagama/shared';
import { FaqModel, type FaqDocument } from '../models/Faq.model.js';
import { UserModel } from '../models/User.model.js';
import { ApiError } from '../utils/api-error.js';

interface ListOptions {
  query: FaqListQuery;
  role: UserRole;
}

interface ListResult {
  items: PublicFaq[];
  total: number;
  page: number;
  pageSize: number;
}

interface PopulatedFaq extends Omit<FaqDocument, 'categories' | 'tags'> {
  categories: { _id: Types.ObjectId; name: string; slug: string }[];
  tags: { _id: Types.ObjectId; name: string; slug: string }[];
}

function projectFaq(faq: PopulatedFaq, role: UserRole, hasUserFeedback?: boolean): PublicFaq {
  const base: PublicFaq = {
    id: faq._id.toString(),
    title: faq.title,
    answer: faq.answer,
    summary: faq.summary ?? undefined,
    categories: faq.categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
    })),
    tags: faq.tags.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      slug: t.slug,
    })),
    status: faq.status,
    updatedAt: faq.updatedAt.toISOString(),
    createdAt: faq.createdAt.toISOString(),
  };
  // viewCount, helpfulCount, unhelpfulCount are moderator/admin-only (Dashboard Spec).
  // Students never see raw counts on Browse FAQs.
  if (role === 'moderator' || role === 'admin') {
    base.viewCount = faq.viewCount;
    base.helpfulCount = faq.helpfulCount;
    base.unhelpfulCount = faq.unhelpfulCount;
  }
  if (hasUserFeedback !== undefined) base.hasUserFeedback = hasUserFeedback;
  return base;
}

function buildFilter(query: FaqListQuery, role: UserRole): FilterQuery<FaqDocument> {
  const filter: FilterQuery<FaqDocument> = {};

  // Students only see published FAQs. Mods/admins can filter explicitly.
  if (role === 'student') {
    filter.status = 'published';
  } else if (query.status) {
    filter.status = query.status;
  } else {
    // Mod/admin default — exclude archived from main listings.
    filter.status = { $ne: 'archived' };
  }

  if (query.category && Types.ObjectId.isValid(query.category)) {
    filter.categories = new Types.ObjectId(query.category);
  }
  if (query.tag && Types.ObjectId.isValid(query.tag)) {
    filter.tags = new Types.ObjectId(query.tag);
  }
  if (query.q) {
    filter.$text = { $search: query.q };
  }
  // Dashboard Spec: helpful/flagged filters surface in FAQ Management.
  if (query.filter === 'helpful') {
    filter.helpfulCount = { $gt: 0 };
  } else if (query.filter === 'flagged') {
    filter.flagCount = { $gt: 0 };
  }
  return filter;
}

export const faqService = {
  async list({ query, role }: ListOptions): Promise<ListResult> {
    const filter = buildFilter(query, role);
    const skip = (query.page - 1) * query.pageSize;

    // Sort selection (Change Spec §7.1: default is recency-then-views when no query).
    type SortSpec = Record<string, 1 | -1 | { $meta: 'textScore' }>;
    let sort: SortSpec;
    let projection: Record<string, unknown> | undefined;
    if (query.q && query.sort === 'relevance') {
      sort = { score: { $meta: 'textScore' }, updatedAt: -1 };
      projection = { score: { $meta: 'textScore' } };
    } else {
      switch (query.sort) {
        case 'popular':
          sort = { viewCount: -1, updatedAt: -1 };
          break;
        case 'helpful':
          sort = { helpfulCount: -1, updatedAt: -1 };
          break;
        case 'relevance':
        case 'recent':
        default:
          // Change Spec §7.1: recently updated first, then most viewed.
          sort = { updatedAt: -1, viewCount: -1 };
      }
    }

    const [items, total] = await Promise.all([
      FaqModel.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(query.pageSize)
        .populate('categories', 'name slug')
        .populate('tags', 'name slug')
        .lean<PopulatedFaq[]>(),
      FaqModel.countDocuments(filter),
    ]);

    return {
      items: items.map((faq) => projectFaq(faq, role)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  async getById(id: string, role: UserRole, userId?: string): Promise<PublicFaq> {
    const faq = await FaqModel.findById(id)
      .select('+helpfulVotes +unhelpfulVotes')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug')
      .lean<
        PopulatedFaq & {
          helpfulVotes?: Types.ObjectId[];
          unhelpfulVotes?: Types.ObjectId[];
        }
      >();
    if (!faq) throw ApiError.notFound('FAQ not found');
    if (role === 'student' && faq.status !== 'published') {
      throw ApiError.notFound('FAQ not found');
    }
    const hasUserFeedback = userId
      ? Boolean(
          faq.helpfulVotes?.some((v) => v.toString() === userId) ||
          faq.unhelpfulVotes?.some((v) => v.toString() === userId),
        )
      : undefined;
    return projectFaq(faq, role, hasUserFeedback);
  },

  async create(input: FaqCreateInput, actorId: string) {
    const doc = await FaqModel.create({
      ...input,
      createdBy: actorId,
      updatedBy: actorId,
      publishedAt: input.status === 'published' ? new Date() : undefined,
    });
    return doc;
  },

  async update(id: string, input: FaqUpdateInput, actorId: string) {
    const current = await FaqModel.findById(id).select('+helpfulVotes +unhelpfulVotes');
    if (!current) throw ApiError.notFound('FAQ not found');

    // Stat-reset rule (Dashboard Spec): when the answer body changes, the previous helpful /
    // flagged metrics no longer reflect the current content. Reset them so users can re-vote.
    // Title/summary/category/tag edits do NOT trigger a reset — they don't change correctness.
    const answerChanged =
      typeof input.answer === 'string' && input.answer.trim() !== current.answer.trim();

    Object.assign(current, input, { updatedBy: actorId });
    if (input.status === 'published' && !current.publishedAt) {
      current.publishedAt = new Date();
    }

    if (answerChanged) {
      current.helpfulCount = 0;
      current.unhelpfulCount = 0;
      current.flagCount = 0;
      current.helpfulVotes = [];
      current.unhelpfulVotes = [];
      // Outstanding flags become 'resolved' — implicitly addressed by the edit.
      // We do this in a fire-and-forget update against the Flag collection inside the controller
      // so this service stays focused on the FAQ document.
    }

    await current.save();
    return { faq: current, statsReset: answerChanged };
  },

  async archive(id: string, actorId: string) {
    const updated = await FaqModel.findByIdAndUpdate(
      id,
      { status: 'archived', updatedBy: actorId },
      { new: true },
    );
    if (!updated) throw ApiError.notFound('FAQ not found');
    return updated;
  },

  /** Idempotent view recording: increments counter and prepends to user's recent list. */
  async recordView(faqId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(faqId)) throw ApiError.badRequest('Invalid FAQ id');

    // Atomic counter bump.
    await FaqModel.updateOne({ _id: faqId, status: 'published' }, { $inc: { viewCount: 1 } });

    // Maintain a bounded LRU of recently-viewed FAQs on the user.
    await UserModel.updateOne({ _id: userId }, { $pull: { recentlyViewedFaqs: { faqId } } });
    await UserModel.updateOne(
      { _id: userId },
      {
        $push: {
          recentlyViewedFaqs: {
            $each: [{ faqId, viewedAt: new Date() }],
            $position: 0,
            $slice: RECENT_FAQS_LIMIT,
          },
        },
      },
    );
  },

  /** One vote per user. Switching from helpful -> unhelpful is allowed. */
  async submitFeedback(
    faqId: string,
    userId: string,
    rating: 'helpful' | 'unhelpful',
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const faq = await FaqModel.findById(faqId).select('+helpfulVotes +unhelpfulVotes');
    if (!faq) throw ApiError.notFound('FAQ not found');
    if (faq.status !== 'published') throw ApiError.forbidden('FAQ is not open for feedback');

    const had = {
      helpful: faq.helpfulVotes?.some((v) => v.equals(userObjectId)) ?? false,
      unhelpful: faq.unhelpfulVotes?.some((v) => v.equals(userObjectId)) ?? false,
    };

    if (had[rating]) return; // Already voted this way — idempotent no-op.

    const update: Record<string, unknown> = {};
    if (rating === 'helpful') {
      update.$addToSet = { helpfulVotes: userObjectId };
      update.$pull = { unhelpfulVotes: userObjectId };
      update.$inc = {
        helpfulCount: 1,
        ...(had.unhelpful ? { unhelpfulCount: -1 } : {}),
      };
    } else {
      update.$addToSet = { unhelpfulVotes: userObjectId };
      update.$pull = { helpfulVotes: userObjectId };
      update.$inc = {
        unhelpfulCount: 1,
        ...(had.helpful ? { helpfulCount: -1 } : {}),
      };
    }

    await FaqModel.updateOne({ _id: faqId }, update);
  },

  async getRecentlyViewed(userId: string, role: UserRole): Promise<PublicFaq[]> {
    const user = await UserModel.findById(userId)
      .select('recentlyViewedFaqs')
      .lean<{ recentlyViewedFaqs: { faqId: Types.ObjectId; viewedAt: Date }[] }>();
    if (!user) return [];
    const ids = user.recentlyViewedFaqs.map((r) => r.faqId);
    if (ids.length === 0) return [];

    const faqs = await FaqModel.find({ _id: { $in: ids }, status: 'published' })
      .populate('categories', 'name slug')
      .populate('tags', 'name slug')
      .lean<PopulatedFaq[]>();

    // Preserve the user's recency order.
    const byId = new Map(faqs.map((f) => [f._id.toString(), f]));
    const ordered = ids
      .map((id) => byId.get(id.toString()))
      .filter((f): f is PopulatedFaq => Boolean(f));
    return ordered.map((f) => projectFaq(f, role));
  },
};
