import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { CHAT_FEEDBACK_RATINGS } from "@samagama/shared";

const chatMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sourceFaqIds: [{ type: Schema.Types.ObjectId, ref: "Faq" }],
    sourceAnswerIds: [{ type: Schema.Types.ObjectId, ref: "Answer" }],
    confidenceScore: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const chatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    messages: { type: [chatMessageSchema], default: [] }
  },
  { timestamps: true }
);

const chatFeedbackSchema = new Schema(
  {
    chatSessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", required: true, index: true },
    messageIndex: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: String, enum: CHAT_FEEDBACK_RATINGS, required: true, index: true },
    comment: { type: String },
    status: { type: String, enum: ["open", "reviewed", "resolved"], default: "open", index: true }
  },
  { timestamps: true }
);

export type ChatSession = InferSchemaType<typeof chatSessionSchema>;
export type ChatFeedback = InferSchemaType<typeof chatFeedbackSchema>;
export type ChatSessionDocument = HydratedDocument<ChatSession>;
export type ChatFeedbackDocument = HydratedDocument<ChatFeedback>;

export const ChatSessionModel = model("ChatSession", chatSessionSchema);
export const ChatFeedbackModel = model("ChatFeedback", chatFeedbackSchema);
