import { HTTP_STATUS } from "../constants/httpStatus.js";
import * as faqService from "../services/faqService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const searchFaqs = async (req, res) => {
  const result = await faqService.searchFaqs(req.user.id, req.user.role, req.query);
  return sendSuccess(res, result);
};

export const getFaqById = async (req, res) => {
  const result = await faqService.getFaqById(req.user.id, req.params.id);
  return sendSuccess(res, result);
};

export const createFaq = async (req, res) => {
  const result = await faqService.createFaq(req.user.id, req.body);
  return sendSuccess(res, result, HTTP_STATUS.CREATED);
};

export const updateFaq = async (req, res) => {
  const result = await faqService.updateFaq(req.user.id, req.params.id, req.body);
  return sendSuccess(res, result);
};

export const changeFaqStatus = async (req, res) => {
  const result = await faqService.changeFaqStatus(req.user.id, req.params.id, req.body.status);
  return sendSuccess(res, result);
};

export const trackFaqView = async (req, res) => {
  const result = await faqService.trackFaqView(req.user.id, req.params.id);
  return sendSuccess(res, result);
};

export const recordFeedback = async (req, res) => {
  const result = await faqService.recordFeedback(req.user.id, req.params.id, req.body.value);
  return sendSuccess(res, result);
};

export const checkSimilarity = async (req, res) => {
  const result = await faqService.checkSimilarity(req.body);
  return sendSuccess(res, result);
};
