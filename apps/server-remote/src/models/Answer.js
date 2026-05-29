import mongoose from "mongoose";
import { ANSWER_STATUS, ANSWER_STATUS_VALUES } from "../constants/statuses.js";

export const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    body: {
      type: String,
      required: true,
      minlength: 20
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ANSWER_STATUS_VALUES,
      default: ANSWER_STATUS.PENDING
    },
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    moderationNote: {
      type: String
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    notHelpfulCount: {
      type: Number,
      default: 0
    },
    approvedAt: {
      type: Date
    },
    eligibleForFaqConversion: {
      type: Boolean,
      default: false
    },
    convertedFaqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FAQ",
      index: { sparse: true }
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

answerSchema.index({ questionId: 1 });
answerSchema.index({ status: 1 });
answerSchema.index({ answeredBy: 1 });

export const Answer = mongoose.model("Answer", answerSchema);

export default Answer;
