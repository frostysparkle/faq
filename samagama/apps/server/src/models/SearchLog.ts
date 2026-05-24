import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const searchLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    query: { type: String, required: true },
    source: {
      type: String,
      enum: ["faq", "question_check", "chatbot"],
      required: true,
      index: true
    },
    resultCount: { type: Number, required: true },
    topScore: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type SearchLog = InferSchemaType<typeof searchLogSchema>;
export type SearchLogDocument = HydratedDocument<SearchLog>;
export const SearchLogModel = model("SearchLog", searchLogSchema);
