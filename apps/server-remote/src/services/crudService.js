import { AUDIT_EVENTS } from "../constants/eventTypes.js";
import { NotFoundError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";

const buildSearchQuery = (search, fields) => {
  if (!search || fields.length === 0) {
    return {};
  }

  return {
    $or: fields.map((field) => ({
      [field]: {
        $regex: search,
        $options: "i"
      }
    }))
  };
};

export const createCrudService = ({
  Model,
  entityType,
  searchableFields = [],
  mapInput = (payload) => payload,
  populate = []
}) => ({
  async list({ page, limit, search }) {
    const query = buildSearchQuery(search, searchableFields);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Model.find(query).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(query)
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async getById(id) {
    const item = await Model.findById(id).populate(populate);

    if (!item) {
      throw new NotFoundError(`${entityType} not found`);
    }

    return item;
  },

  async create(payload, actorId) {
    const item = await Model.create(mapInput(payload, { actorId, operation: "create" }));
    await logAudit(actorId, AUDIT_EVENTS.RECORD_CREATED, entityType, item._id, null, item.toObject());
    return item;
  },

  async update(id, payload, actorId) {
    const current = await Model.findById(id);

    if (!current) {
      throw new NotFoundError(`${entityType} not found`);
    }

    const before = current.toObject();
    current.set(mapInput(payload, { actorId, operation: "update", current }));
    await current.save();
    await logAudit(actorId, AUDIT_EVENTS.RECORD_UPDATED, entityType, current._id, before, current.toObject());
    return current;
  },

  async remove(id, actorId) {
    const current = await Model.findById(id);

    if (!current) {
      throw new NotFoundError(`${entityType} not found`);
    }

    const before = current.toObject();
    await current.deleteOne();
    await logAudit(actorId, AUDIT_EVENTS.RECORD_DELETED, entityType, current._id, before, null);
    return { id };
  }
});
