import type { Request, Response } from "express";
import { created, ok } from "../utils/apiResponse.js";
import * as chatbotService from "../services/chatbot.service.js";
import { AppError } from "../utils/AppError.js";
import { requiredParam } from "../utils/request.js";

function userId(req: Request): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  return req.user.id;
}

export async function query(req: Request, res: Response) {
  ok(res, await chatbotService.queryChatbot(req.body, userId(req)));
}

export async function sessions(req: Request, res: Response) {
  ok(res, await chatbotService.listChatSessions(userId(req)));
}

export async function session(req: Request, res: Response) {
  ok(res, await chatbotService.getChatSession(requiredParam(req, "id"), userId(req)));
}

export async function feedback(req: Request, res: Response) {
  created(res, await chatbotService.submitChatFeedback(req.body, userId(req)));
}
