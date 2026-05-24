import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { QUESTION_STATUSES } from "@samagama/shared";

const existingAnswerCheckSchema = new Schema(
  {
    checkedAt: { type: Date, required: true },
    token: { type: String, required: true },
    matchedFaqs: [{ type: Schema.Types.ObjectId, ref: "Faq" }],
    matchedQuestions: [{ type: Schema.Types.ObjectId, ref: "Question" }]
  },
  { _id: false }
);

const questionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag", index: true }],
    status: { type: String, enum: QUESTION_STATUSES, default: "open", index: true },
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Question" },
    askedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    existingAnswerCheck: { type: existingAnswerCheckSchema, required: true },
    viewCount: { type: Number, default: 0 },
    answerCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

questionSchema.index({ title: "text", description: "text" });
questionSchema.index({ status: 1, updatedAt: -1 });

export type Question = InferSchemaType<typeof questionSchema>;
export type QuestionDocument = HydratedDocument<Question>;
export const QuestionModel = model("Question", questionSchema);
