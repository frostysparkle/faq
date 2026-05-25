import type { Request, Response } from 'express';
import type { ModerateAnswerInput } from '@samagama/shared';
import { moderationService } from '../services/moderation.service.js';
import { noContent, ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const moderationController = {
  async listPending(_req: Request, res: Response) {
    return ok(res, await moderationService.listPendingAnswers());
  },

  /** Pending answers scoped to one question — drives the Show More cycle. */
  async listPendingForQuestion(req: Request, res: Response) {
    const limit = Number(req.query.limit ?? 10);
    return ok(res, await moderationService.listPendingAnswersForQuestion(req.params.id!, limit));
  },

  /** Moderator posts a direct response to a personal question. */
  async respondToPersonal(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const body = (req.body as { body?: string }).body ?? '';
    await moderationService.respondToPersonalQuestion(req.params.id!, req.user.id, body);
    return noContent(res);
  },

  async approveAnswer(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await moderationService.approveAnswer(
      req.params.id!,
      req.user.id,
      req.body as ModerateAnswerInput,
    );
    return noContent(res);
  },

  async rejectAnswer(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await moderationService.rejectAnswer(
      req.params.id!,
      req.user.id,
      req.body as ModerateAnswerInput,
    );
    return noContent(res);
  },
};
