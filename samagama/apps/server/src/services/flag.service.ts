import { FlagModel } from "../models/Flag.js";
import { FaqModel } from "../models/Faq.js";
import { AppError } from "../utils/AppError.js";

export async function upsertFlag(
  input: {
    entityType: "faq" | "question" | "answer" | "chatbot_response";
    entityId: string;
    reason: string;
    details?: string;
  },
  actorId: string
) {
  const flag = await FlagModel.findOneAndUpdate(
    { entityType: input.entityType, entityId: input.entityId, reportedBy: actorId, status: "open" },
    {
      $set: {
        reason: input.reason,
        details: input.details,
        status: "open"
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (input.entityType === "faq") {
    await FaqModel.findByIdAndUpdate(input.entityId, { $inc: { flagCount: 1 } });
  }
  return flag;
}

export async function listFlags(status?: string) {
  const filter = status ? { status } : {};
  return FlagModel.find(filter).populate("reportedBy reviewedBy").sort({ createdAt: -1 }).lean();
}

export async function updateFlagStatus(
  id: string,
  input: { status: string; resolutionNote?: string },
  actorId: string
) {
  const flag = await FlagModel.findByIdAndUpdate(
    id,
    { status: input.status, resolutionNote: input.resolutionNote, reviewedBy: actorId },
    { new: true }
  );
  if (!flag) throw new AppError(404, "FLAG_NOT_FOUND", "Flag was not found.");
  return flag;
}
