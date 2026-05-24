import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { ANSWER_STATUSES } from "@samagama/shared";

const answerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    body: { type: String, required: true },
    answeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ANSWER_STATUSES, default: "pending", index: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: "User" },
    moderationNote: { type: String },
    approvedAt: { type: Date },
    embedding: { type: [Number], default: [] },
    indexingStatus: {
      type: String,
      enum: ["pending", "indexed", "failed"],
      default: "pending",
      index: true
    },
    eligibleForFaqConversion: { type: Boolean, default: false, index: true },
    convertedFaqId: { type: Schema.Types.ObjectId, ref: "Faq" }
  },
  { timestamps: true }
);

answerSchema.index({ body: "text" });
answerSchema.index({ status: 1, createdAt: -1 });

export type Answer = InferSchemaType<typeof answerSchema>;
export type AnswerDocument = HydratedDocument<Answer>;
export const AnswerModel = model("Answer", answerSchema);
