import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const taxonomyBase = {
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  description: { type: String, default: "" },
  keywords: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true }
};

const categorySchema = new Schema(taxonomyBase, { timestamps: true });
const tagSchema = new Schema(taxonomyBase, { timestamps: true });

export type Category = InferSchemaType<typeof categorySchema>;
export type Tag = InferSchemaType<typeof tagSchema>;
export type CategoryDocument = HydratedDocument<Category>;
export type TagDocument = HydratedDocument<Tag>;

export const CategoryModel = model("Category", categorySchema);
export const TagModel = model("Tag", tagSchema);
