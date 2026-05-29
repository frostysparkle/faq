import mongoose from "mongoose";
import slugify from "slugify";
import {
  FEEDBACK_VALUE,
  FAQ_REVIEW_STATE,
  FAQ_REVIEW_STATE_VALUES,
  FAQ_SOURCE_TYPE,
  FAQ_SOURCE_TYPE_VALUES,
  FAQ_STATUS,
  FAQ_STATUS_VALUES,
  REVIEW_ENTITY_TYPE,
  REVIEW_STATUS,
  REVIEW_TYPE
} from "../constants/statuses.js";

const buildSlug = (value) => slugify(value, { lower: true, strict: true });

const assignUniqueSlug = async (doc) => {
  const baseSlug = buildSlug(doc.title);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await doc.constructor.exists({
      _id: { $ne: doc._id },
      slug: candidate
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  doc.slug = candidate;
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const faqSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    answer: {
      type: String,
      required: true
    },
    summary: {
      type: String,
      required: true,
      maxlength: 300
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      }
    ],
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag"
      }
    ],
    status: {
      type: String,
      enum: FAQ_STATUS_VALUES,
      default: FAQ_STATUS.DRAFT
    },
    sourceType: {
      type: String,
      enum: FAQ_SOURCE_TYPE_VALUES,
      default: FAQ_SOURCE_TYPE.MANUAL
    },
    sourceQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      index: { sparse: true }
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    qualityScore: {
      type: Number,
      default: 0
    },
    reviewState: {
      type: String,
      enum: FAQ_REVIEW_STATE_VALUES,
      default: FAQ_REVIEW_STATE.NONE
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FAQ",
      index: { sparse: true }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    publishedAt: {
      type: Date
    },
    lastReviewedAt: {
      type: Date
    },
    // NEVER EXPOSE TO CLIENT - internal vector only.
    embedding: {
      type: [Number],
      default: [],
      select: false,
      validate: {
        validator: (value) => value.length === 0 || value.length === 384,
        message: "FAQ embedding must contain exactly 384 dimensions"
      }
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

faqSchema.index({ title: "text", answer: "text", summary: "text" });
faqSchema.index({ status: 1 });
faqSchema.index({ categories: 1 });
faqSchema.index({ tags: 1 });
faqSchema.index({ qualityScore: -1 });
faqSchema.index({ createdAt: -1 });

faqSchema.virtual("helpfulnessRatio").get(function helpfulnessRatio() {
  const totalVotes = this.helpfulCount + this.notHelpfulCount;
  return totalVotes > 0 ? this.helpfulCount / totalVotes : 0;
});

faqSchema.pre("validate", function generateFaqSlug(next) {
  if (this.isNew || this.isModified("title")) {
    this.slug = buildSlug(this.title);
  }

  next();
});

faqSchema.pre("save", async function ensureFaqSlugIsUnique() {
  if (this.isNew || this.isModified("title") || this.isModified("slug")) {
    await assignUniqueSlug(this);
  }
});

faqSchema.statics.calculateQualityScore = async function calculateQualityScore(faqId) {
  const faq = await this.findById(faqId).select("updatedAt helpfulCount notHelpfulCount viewCount qualityScore");

  if (!faq) {
    return 0;
  }

  const FeedbackEvent = this.db.models.FeedbackEvent;
  const SearchLog = this.db.models.SearchLog;
  const Question = this.db.models.Question;
  const ReviewItem = this.db.models.ReviewItem;

  const feedbackCounts = FeedbackEvent
    ? await FeedbackEvent.aggregate([
        {
          $match: {
            entityType: REVIEW_ENTITY_TYPE.FAQ,
            entityId: faq._id
          }
        },
        {
          $group: {
            _id: "$value",
            count: { $sum: 1 }
          }
        }
      ])
    : [];
  const freshHelpfulCount = feedbackCounts.find((item) => item._id === FEEDBACK_VALUE.HELPFUL)?.count ?? faq.helpfulCount;
  const freshNotHelpfulCount =
    feedbackCounts.find((item) => item._id === FEEDBACK_VALUE.NOT_HELPFUL)?.count ?? faq.notHelpfulCount;
  const totalVotes = freshHelpfulCount + freshNotHelpfulCount;
  const helpfulnessRatio = totalVotes > 0 ? freshHelpfulCount / totalVotes : 0;

  const [searchesWithResults, clickedSearches, repeatQuestions, resolvedReviewItems, openReviewItems] = await Promise.all([
    SearchLog
      ? SearchLog.countDocuments({
      resultCount: { $gt: 0 },
      createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
    })
      : 0,
    SearchLog ? SearchLog.countDocuments({ clickedFaqId: faq._id }) : 0,
    Question ? Question.countDocuments({ "existingAnswerCheck.matchedFaqs": faq._id }) : 0,
    ReviewItem
      ? ReviewItem.countDocuments({
      entityType: REVIEW_ENTITY_TYPE.FAQ,
      entityId: faq._id,
      reviewType: { $in: [REVIEW_TYPE.NEEDS_REVIEW, REVIEW_TYPE.NEEDS_REWRITE] },
      status: REVIEW_STATUS.RESOLVED
    })
      : 0,
    ReviewItem
      ? ReviewItem.countDocuments({
      entityType: REVIEW_ENTITY_TYPE.FAQ,
      entityId: faq._id,
      status: { $in: [REVIEW_STATUS.OPEN, REVIEW_STATUS.IN_REVIEW] }
    })
      : 0
  ]);

  const searchableOpportunityCount = Math.max(searchesWithResults, faq.viewCount);
  const searchClickResolutionRate = searchableOpportunityCount > 0 ? clickedSearches / searchableOpportunityCount : 0;
  const daysSinceUpdate = (Date.now() - faq.updatedAt.getTime()) / (24 * 60 * 60 * 1000);
  const freshnessScore = Math.max(0, 1 - daysSinceUpdate / 180);
  const lowRepeatQuestionScore = clamp01(1 - repeatQuestions / 10);
  const moderatorReviewScore = resolvedReviewItems + openReviewItems > 0 ? resolvedReviewItems / (resolvedReviewItems + openReviewItems) : 0;

  const qualityScore =
    0.35 * clamp01(helpfulnessRatio) +
    0.25 * clamp01(searchClickResolutionRate) +
    0.2 * clamp01(freshnessScore) +
    0.1 * clamp01(lowRepeatQuestionScore) +
    0.1 * clamp01(moderatorReviewScore);

  return Number(qualityScore.toFixed(4));
};

faqSchema.set("toJSON", { virtuals: true });
faqSchema.set("toObject", { virtuals: true });

export const Faq = mongoose.model("FAQ", faqSchema);

export default Faq;
