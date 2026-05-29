import mongoose from "mongoose";

export const analyticsEventSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    eventType: {
      type: String,
      required: true
    },
    entityType: {
      type: String
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

analyticsEventSchema.index({ eventType: 1 });
analyticsEventSchema.index({ entityType: 1 });
analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 730 * 24 * 60 * 60 });

export const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
