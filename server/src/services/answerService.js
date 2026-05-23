import Answer from "../models/Answer.js";
import { ENTITY_TYPES } from "../constants/statusEnums.js";
import { createCrudService } from "./crudService.js";

const mapAnswerInput = (payload, context = {}) => ({
  ...payload,
  answeredBy: payload.answeredBy ?? context.actorId
});

export const answerService = createCrudService({
  Model: Answer,
  entityType: ENTITY_TYPES.ANSWER,
  searchableFields: ["body"],
  mapInput: mapAnswerInput,
  populate: ["questionId", "answeredBy", "moderatorId", "convertedFaqId"]
});
