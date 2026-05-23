import mongoose from "mongoose";
import {
  FEEDBACK_ENTITY_TYPE_VALUES,
  FEEDBACK_VALUE_VALUES
} from "../constants/statuses.js";

export const feedbackEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    entityType: {
      type: String,
      enum: FEEDBACK_ENTITY_TYPE_VALUES,
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    value: {
      type: String,
      enum: FEEDBACK_VALUE_VALUES,
      required: true
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

feedbackEventSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });
feedbackEventSchema.index({ entityType: 1, entityId: 1 });

export const FeedbackEvent = mongoose.model("FeedbackEvent", feedbackEventSchema);

export default FeedbackEvent;
