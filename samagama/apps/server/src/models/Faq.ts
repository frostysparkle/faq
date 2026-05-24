import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { FAQ_SOURCE_TYPES, FAQ_STATUSES } from "@samagama/shared";

const faqSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    answer: { type: String, required: true },
    summary: { type: String, required: true },
    categories: [{ type: Schema.Types.ObjectId, ref: "Category", required: true, index: true }],
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag", index: true }],
    status: { type: String, enum: FAQ_STATUSES, default: "draft", index: true },
    sourceType: { type: String, enum: FAQ_SOURCE_TYPES, default: "manual" },
    sourceQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
    embedding: { type: [Number], default: [] },
    indexingStatus: {
      type: String,
      enum: ["pending", "indexed", "failed"],
      default: "pending",
      index: true
    },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0, index: true },
    flagCount: { type: Number, default: 0, index: true },
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Faq" },
    duplicateOverrideJustification: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date },
    lastReviewedAt: { type: Date }
  },
  { timestamps: true }
);

faqSchema.index({ title: "text", answer: "text", summary: "text" });
faqSchema.index({ status: 1, updatedAt: -1 });
faqSchema.index({ categories: 1, status: 1 });
faqSchema.index({ tags: 1, status: 1 });

export type Faq = InferSchemaType<typeof faqSchema>;
export type FaqDocument = HydratedDocument<Faq>;
export const FaqModel = model("Faq", faqSchema);
