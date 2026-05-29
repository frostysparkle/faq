import * as assistantService from "../services/assistantService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const search = async (req, res) => {
  sendSuccess(res, await assistantService.searchAssistant(req.user.id, req.body));
};
