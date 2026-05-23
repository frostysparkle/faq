import mongoose from "mongoose";
import { QUESTION_STATUS, QUESTION_STATUS_VALUES } from "../constants/statuses.js";

export const existingAnswerCheckSchema = new mongoose.Schema(
  {
    checkedAt: {
      type: Date
    },
    matchedFaqs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FAQ"
      }
    ],
    matchedQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
      }
    ]
  },
  {
    _id: false,
    strict: true
  }
);

export const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 300
    },
    description: {
      type: String,
      required: true,
      minlength: 20
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag"
      }
    ],
    status: {
      type: String,
      enum: QUESTION_STATUS_VALUES,
      default: QUESTION_STATUS.OPEN
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      index: { sparse: true }
    },
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    existingAnswerCheck: {
      type: existingAnswerCheckSchema,
      default: {}
    },
    priorityScore: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    answerCount: {
      type: Number,
      default: 0
    },
    resolvedAt: {
      type: Date
    },
    // NEVER EXPOSE TO CLIENT - internal vector only.
    embedding: {
      type: [Number],
      default: [],
      select: false,
      validate: {
        validator: (value) => value.length === 0 || value.length === 384,
        message: "Question embedding must contain exactly 384 dimensions"
      }
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

questionSchema.index({ title: "text", description: "text" });
questionSchema.index({ status: 1 });
questionSchema.index({ categoryId: 1 });
questionSchema.index({ askedBy: 1 });
questionSchema.index({ priorityScore: -1 });
questionSchema.index({ createdAt: -1 });

export const Question = mongoose.model("Question", questionSchema);

export default Question;
