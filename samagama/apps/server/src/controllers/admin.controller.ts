import type { Request, Response } from "express";
import { ok } from "../utils/apiResponse.js";
import * as adminService from "../services/admin.service.js";
import * as faqService from "../services/faq.service.js";

export async function stats(_req: Request, res: Response) {
  ok(res, await adminService.getAdminStats());
}

export async function duplicateCandidates(_req: Request, res: Response) {
  ok(res, []);
}

export async function unansweredSearches(_req: Request, res: Response) {
  ok(res, await adminService.getUnansweredSearches());
}

export async function chatbotFeedbackStats(_req: Request, res: Response) {
  ok(res, await adminService.getChatbotFeedbackStats());
}

export async function duplicateCheck(req: Request, res: Response) {
  ok(
    res,
    await faqService.checkFaqDuplicates(req.body.title, req.body.body, req.body.excludeFaqId)
  );
}
