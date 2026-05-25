import type { Request, Response } from 'express';
import { chatbotService } from '../services/chatbot.service.js';
import { ok } from '../utils/api-response.js';

export const chatbotController = {
  async listFeedback(req: Request, res: Response) {
    const filter = (req.query.filter as 'all' | 'helpful' | 'flagged' | undefined) ?? 'all';
    return ok(res, await chatbotService.listFeedback(filter));
  },

  async getStats(_req: Request, res: Response) {
    return ok(res, await chatbotService.getStats());
  },
};
