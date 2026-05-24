import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { FLAG_REASONS, FLAG_STATUSES } from "@samagama/shared";

const flagSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ["faq", "question", "answer", "chatbot_response"],
      required: true,
      index: true
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, enum: FLAG_REASONS, required: true, index: true },
    details: { type: String },
    status: { type: String, enum: FLAG_STATUSES, default: "open", index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolutionNote: { type: String }
  },
  { timestamps: true }
);

flagSchema.index(
  { entityType: 1, entityId: 1, reportedBy: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["open", "under_review"] } } }
);

export type Flag = InferSchemaType<typeof flagSchema>;
export type FlagDocument = HydratedDocument<Flag>;
export const FlagModel = model("Flag", flagSchema);
