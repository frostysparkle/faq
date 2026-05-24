import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { USER_ROLES, USER_STATUSES } from "@samagama/shared";

const recentlyViewedFaqSchema = new Schema(
  {
    faqId: { type: Schema.Types.ObjectId, ref: "Faq", required: true },
    viewedAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true, default: "student", index: true },
    status: { type: String, enum: USER_STATUSES, required: true, default: "active", index: true },
    recentlyViewedFaqs: { type: [recentlyViewedFaqSchema], default: [] }
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel = model("User", userSchema);
