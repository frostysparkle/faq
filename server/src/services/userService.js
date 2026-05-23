import User from "../models/User.js";
import { AUDIT_EVENTS } from "../constants/eventTypes.js";
import { ENTITY_TYPES } from "../constants/statusEnums.js";
import { ConflictError, NotFoundError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";

export const sanitizeUser = (user) => {
  const value = typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  delete value.passwordHash;
  delete value.__v;
  return value;
};

const buildUserSearchQuery = (search) => {
  if (!search) {
    return {};
  }

  return {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } }
    ]
  };
};

export const listUsers = async ({ page, limit, search }) => {
  const query = buildUserSearchQuery(search);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query)
  ]);

  return {
    items: items.map(sanitizeUser),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return sanitizeUser(user);
};

export const createUser = async (payload, actorId) => {
  const existing = await User.findOne({ email: payload.email }).select("_id");

  if (existing) {
    throw new ConflictError("A user with this email already exists", { email: payload.email });
  }

  const user = await User.create({
    ...payload,
    passwordHash: payload.password
  });
  const sanitized = sanitizeUser(user);

  await logAudit(actorId, AUDIT_EVENTS.USER_CREATED, ENTITY_TYPES.USER, user._id, null, sanitized);
  return sanitized;
};

export const updateUser = async (id, payload, actorId) => {
  const user = await User.findById(id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const before = sanitizeUser(user);
  user.set(payload);
  await user.save();
  const after = sanitizeUser(user);

  await logAudit(actorId, AUDIT_EVENTS.USER_UPDATED, ENTITY_TYPES.USER, user._id, before, after);
  return after;
};

export const removeUser = async (id, actorId) => {
  const user = await User.findById(id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const before = sanitizeUser(user);
  await user.deleteOne();
  await logAudit(actorId, AUDIT_EVENTS.USER_DELETED, ENTITY_TYPES.USER, user._id, before, null);
  return { id };
};
