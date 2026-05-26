import type { Request, Response } from 'express';
import type {
  AnswerCreateInput,
  CheckExistingInput,
  QuestionCreateInput,
  TagMeInput,
} from '@samagama/shared';
import { qnaService } from '../services/qna.service.js';
import { created, noContent, ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const qnaController = {
  async checkExisting(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const result = await qnaService.checkExisting(req.body as CheckExistingInput, req.user.id);
    return ok(res, result);
  },

  async createQuestion(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const question = await qnaService.createQuestion(req.body as QuestionCreateInput, req.user.id);
    return created(res, question);
  },

  async tagMe(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { existingAnswerCheckToken } = req.body as TagMeInput;
    await qnaService.tagMe(req.params.id!, req.user.id, existingAnswerCheckToken);
    return noContent(res);
  },

  async listQuestions(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const type = req.query.type as 'personal' | 'community' | undefined;
    const status = req.query.status as string | undefined;
    const mineOnly = req.query.mine === 'true';
    const idleParam = req.query.idle as string | undefined;
    const idle =
      idleParam === 'last24h' || idleParam === 'over3days' || idleParam === 'over1week'
        ? idleParam
        : undefined;
    const items = await qnaService.listQuestions({
      role: req.user.role,
      userId: req.user.id,
      type,
      status,
      mineOnly,
      idle,
    });
    return ok(res, items);
  },

  async getQuestion(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const question = await qnaService.getQuestionById(req.params.id!, req.user.id, req.user.role);
    return ok(res, question);
  },

  async listAnswers(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const items = await qnaService.listAnswers(req.params.id!, req.user.id, req.user.role);
    return ok(res, items);
  },

  async submitAnswer(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const answer = await qnaService.submitAnswer(
      req.params.id!,
      req.body as AnswerCreateInput,
      req.user.id,
    );
    return created(res, answer);
  },

  async voteAnswer(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const direction = req.params.direction === 'up' ? 'up' : 'down';
    const result = await qnaService.voteAnswer(req.params.id!, req.user.id, direction);
    return ok(res, result);
  },
};
