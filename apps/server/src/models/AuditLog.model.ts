// Audit log collection. Records admin/moderator actions for traceability.
// PRD §12.10 + Admin spec §9.
import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100, index: true },
    entityType: { type: String, required: true, trim: true, maxlength: 50, index: true },
    entityId: { type: Schema.Types.ObjectId, index: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export type AuditLogDocument = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;
export const AuditLogModel = model('AuditLog', auditLogSchema);
