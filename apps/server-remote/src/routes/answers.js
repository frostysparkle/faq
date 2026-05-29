import { createAnswerSchema, updateAnswerSchema } from "@samagama/shared/schemas";
import { answerService } from "../services/answerService.js";
import { createResourceRouter } from "./resourceRouter.js";

export default createResourceRouter({
  service: answerService,
  createSchema: createAnswerSchema,
  updateSchema: updateAnswerSchema
});
