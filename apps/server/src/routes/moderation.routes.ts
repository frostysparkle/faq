import { Router } from 'express';
import { moderateAnswerSchema } from '@samagama/shared';
import { moderationController } from '../controllers/moderation.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth, requireRole('moderator', 'admin'));

router.get('/pending-answers', asyncHandler(moderationController.listPending));
router.get(
  '/questions/:id/pending-answers',
  asyncHandler(moderationController.listPendingForQuestion),
);
router.post('/questions/:id/respond', asyncHandler(moderationController.respondToPersonal));
router.patch(
  '/answers/:id/approve',
  validate(moderateAnswerSchema),
  asyncHandler(moderationController.approveAnswer),
);
router.patch(
  '/answers/:id/reject',
  validate(moderateAnswerSchema),
  asyncHandler(moderationController.rejectAnswer),
);

export const moderationRouter = router;
