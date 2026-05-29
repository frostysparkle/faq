import AuditLog from "../models/AuditLog.js";

export const logAudit = async (actorId, action, entityType, entityId, before = null, after = null) =>
  AuditLog.create({
    actorId,
    action,
    entityType,
    entityId,
    before,
    after
  });
