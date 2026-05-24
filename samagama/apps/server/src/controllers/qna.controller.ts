import type { Request, Response } from "express";
import { created, ok } from "../utils/apiResponse.js";
import * as qnaService from "../services/qna.service.js";
import * as moderationService from "../services/moderation.service.js";
import { AppError } from "../utils/AppError.js";
import { requiredParam } from "../utils/request.js";

function userId(req: Request): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  return req.user.id;
}

export async function checkExisting(req: Request, res: Response) {
  ok(res, await qnaService.checkExistingAnswers(req.body, userId(req)));
}

export async function createQuestion(req: Request, res: Response) {
  created(res, await qnaService.createQuestion(req.body, userId(req)));
}

export async function listQuestions(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  ok(res, await qnaService.listQuestions(status));
}

export async function getQuestion(req: Request, res: Response) {
  ok(res, await qnaService.getQuestion(requiredParam(req, "id")));
}

export async function submitAnswer(req: Request, res: Response) {
  created(res, await qnaService.submitAnswer(requiredParam(req, "id"), req.body.body, userId(req)));
}

export async function approveAnswer(req: Request, res: Response) {
  ok(
    res,
    await moderationService.approveAnswer(requiredParam(req, "id"), userId(req), req.body.note)
  );
}

export async function rejectAnswer(req: Request, res: Response) {
  ok(
    res,
    await moderationService.rejectAnswer(requiredParam(req, "id"), userId(req), req.body.reason)
  );
}

export async function resolveQuestion(req: Request, res: Response) {
  ok(res, await moderationService.markQuestionResolved(requiredParam(req, "id")));
}

export async function markDuplicate(req: Request, res: Response) {
  ok(
    res,
    await moderationService.markQuestionDuplicate(requiredParam(req, "id"), req.body.duplicateOf)
  );
}
