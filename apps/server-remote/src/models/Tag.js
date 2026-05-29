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

export const tagSchema = new mongoose.Schema(
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

tagSchema.index({ isActive: 1 });
tagSchema.index({ displayOrder: 1 });

tagSchema.pre("validate", function generateTagSlug(next) {
  if (this.isNew || this.isModified("name")) {
    this.slug = buildSlug(this.name);
  }

  next();
});

tagSchema.pre("save", async function ensureTagSlugIsUnique() {
  if (this.isNew || this.isModified("name") || this.isModified("slug")) {
    await assignUniqueSlug(this);
  }
});

export const Tag = mongoose.model("Tag", tagSchema);

export default Tag;
