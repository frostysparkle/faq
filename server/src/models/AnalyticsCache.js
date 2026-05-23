import mongoose from "mongoose";

export const analyticsCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    computedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

analyticsCacheSchema.index({ key: 1 }, { unique: true });
analyticsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AnalyticsCache = mongoose.model("AnalyticsCache", analyticsCacheSchema);

export default AnalyticsCache;
