import type { Request, Response } from "express";
import { ok, created } from "../utils/apiResponse.js";
import * as faqService from "../services/faq.service.js";
import { AppError } from "../utils/AppError.js";
import { requiredParam } from "../utils/request.js";
import type { FaqSearchInput } from "@samagama/shared";

function userId(req: Request): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  return req.user.id;
}

export async function list(req: Request, res: Response) {
  ok(res, await faqService.listFaqs(req.query as unknown as FaqSearchInput, req.user?.id));
}

export async function detail(req: Request, res: Response) {
  ok(res, await faqService.getFaqById(requiredParam(req, "id")));
}

export async function recentlyUpdated(req: Request, res: Response) {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 8;
  ok(res, await faqService.listRecentlyUpdatedFaqs(limit));
}

export async function recentlyViewed(req: Request, res: Response) {
  ok(res, await faqService.listRecentlyViewedFaqs(userId(req)));
}

export async function create(req: Request, res: Response) {
  created(res, await faqService.createFaq(req.body, userId(req)));
}

export async function update(req: Request, res: Response) {
  ok(res, await faqService.updateFaq(requiredParam(req, "id"), req.body, userId(req)));
}

export async function archive(req: Request, res: Response) {
  ok(res, await faqService.archiveFaq(requiredParam(req, "id"), userId(req)));
}

export async function recordView(req: Request, res: Response) {
  ok(res, await faqService.recordFaqView(requiredParam(req, "id"), userId(req)));
}

export async function feedback(req: Request, res: Response) {
  ok(res, await faqService.rateFaq(requiredParam(req, "id"), req.body.rating));
}

export async function checkDuplicate(req: Request, res: Response) {
  ok(
    res,
    await faqService.checkFaqDuplicates(req.body.title, req.body.body, req.body.excludeFaqId)
  );
}
