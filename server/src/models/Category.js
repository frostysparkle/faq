import mongoose from "mongoose";
import slugify from "slugify";

const buildSlug = (value) => slugify(value, { lower: true, strict: true });

const assignUniqueSlug = async (doc) => {
  const baseSlug = buildSlug(doc.name);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await doc.constructor.exists({
      _id: { $ne: doc._id },
      slug: candidate
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  doc.slug = candidate;
};

export const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });

categorySchema.pre("validate", function generateCategorySlug(next) {
  if (this.isNew || this.isModified("name")) {
    this.slug = buildSlug(this.name);
  }

  next();
});

categorySchema.pre("save", async function ensureCategorySlugIsUnique() {
  if (this.isNew || this.isModified("name") || this.isModified("slug")) {
    await assignUniqueSlug(this);
  }
});

export const Category = mongoose.model("Category", categorySchema);

export default Category;
