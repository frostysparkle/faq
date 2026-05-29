import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { USER_ROLE_VALUES, USER_ROLES } from "../constants/roles.js";
import { USER_STATUS, USER_STATUS_VALUES } from "../constants/statuses.js";

export const recentlyViewedFaqSchema = new mongoose.Schema(
  {
    faqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FAQ",
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false,
    strict: true
  }
);

export const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      default: USER_ROLES.STUDENT
    },
    status: {
      type: String,
      enum: USER_STATUS_VALUES,
      default: USER_STATUS.ACTIVE
    },
    recentlyViewedFaqs: {
      type: [recentlyViewedFaqSchema],
      default: []
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

userSchema.index({ role: 1 });

userSchema.pre("save", async function hashPasswordHash() {
  if (!this.isModified("passwordHash") || this.passwordHash.startsWith("$2")) {
    return;
  }

  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function comparePassword(plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

userSchema.statics.findActiveByEmail = function findActiveByEmail(email) {
  return this.findOne({
    email: email.toLowerCase().trim(),
    status: USER_STATUS.ACTIVE
  }).select("+passwordHash");
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model("User", userSchema);

export default User;
