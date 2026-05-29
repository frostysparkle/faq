import * as analyticsService from "../services/analyticsService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getOverview = async (req, res) => {
  sendSuccess(res, await analyticsService.getOverview(req.query));
};

export const getIssueHeatmap = async (req, res) => {
  sendSuccess(res, await analyticsService.getIssueHeatmap(req.query));
};

export const getUnansweredSearches = async (req, res) => {
  sendSuccess(res, await analyticsService.getUnansweredSearches(req.query));
};

export const getFaqQuality = async (req, res) => {
  sendSuccess(res, await analyticsService.getFaqQuality(req.query));
};

export const getModerationLoad = async (req, res) => {
  sendSuccess(res, await analyticsService.getModerationLoad(req.query));
};

export const getAuditLogs = async (req, res) => {
  sendSuccess(res, await analyticsService.getAuditLogs(req.query));
};
