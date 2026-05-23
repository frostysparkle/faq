import mongoose from "mongoose";

export const searchLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    normalizedQuery: {
      type: String,
      required: true
    },
    filters: {
      type: mongoose.Schema.Types.Mixed
    },
    resultCount: {
      type: Number,
      required: true
    },
    clickedFaqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FAQ",
      index: { sparse: true }
    },
    ledToQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      index: { sparse: true }
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

searchLogSchema.index({ normalizedQuery: 1 });
searchLogSchema.index({ userId: 1 });
searchLogSchema.index({ createdAt: -1 });
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

searchLogSchema.pre("validate", function normalizeSearchQuery(next) {
  if (this.query) {
    this.normalizedQuery = this.query.toLowerCase().trim().replace(/\s+/g, " ");
  }

  next();
});

export const SearchLog = mongoose.model("SearchLog", searchLogSchema);

export default SearchLog;
