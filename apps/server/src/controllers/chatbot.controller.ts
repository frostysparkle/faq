import type { Request, Response } from 'express';
import { chatbotService } from '../services/chatbot.service.js';
import { ok } from '../utils/api-response.js';

export const chatbotController = {
  async sendMessage(req: Request, res: Response) {
    const { message, sessionId } = req.body as { message: string; sessionId?: string };
    const userId = (req as Request & { user: { id: string } }).user.id;
    return ok(res, await chatbotService.processQuery(userId, sessionId, message));
  },

  async getSession(req: Request, res: Response) {
    const { sessionId } = req.params;
    return ok(res, chatbotService.getSession(sessionId));
  },

  async submitFeedback(req: Request, res: Response) {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { sessionId, messageIndex, rating, comment } = req.body as {
      sessionId: string;
      messageIndex: number;
      rating: 'helpful' | 'incorrect';
      comment?: string;
    };
    await chatbotService.submitFeedback({ userId, sessionId, messageIndex, rating, comment });
    return ok(res, { success: true });
  },

  async listFeedback(req: Request, res: Response) {
    const filter =
      (req.query.filter as 'all' | 'helpful' | 'unhelpful' | 'archived' | undefined) ?? 'all';
    return ok(res, await chatbotService.listFeedback(filter));
  },

  async getStats(_req: Request, res: Response) {
    return ok(res, await chatbotService.getStats());
  },

  async updateFeedbackStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body as { status: 'reviewed' | 'actioned' | 'archived' };
    await chatbotService.updateFeedbackStatus(id, status);
    return ok(res, { success: true });
  },

  async deleteFeedback(req: Request, res: Response) {
    const { id } = req.params;
    await chatbotService.deleteFeedback(id);
    return ok(res, { success: true });
  },
};
