import mongoose from "mongoose";
import {
  REVIEW_ENTITY_TYPE_VALUES,
  REVIEW_STATUS,
  REVIEW_STATUS_VALUES,
  REVIEW_TYPE_VALUES
} from "../constants/statuses.js";

export const reviewItemSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: REVIEW_ENTITY_TYPE_VALUES,
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reviewType: {
      type: String,
      enum: REVIEW_TYPE_VALUES,
      required: true
    },
    status: {
      type: String,
      enum: REVIEW_STATUS_VALUES,
      default: REVIEW_STATUS.OPEN
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

reviewItemSchema.index({ status: 1 });
reviewItemSchema.index({ reviewType: 1 });
reviewItemSchema.index({ entityType: 1, entityId: 1 });

export const ReviewItem = mongoose.model("ReviewItem", reviewItemSchema);

export default ReviewItem;
