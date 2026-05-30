import { Router } from 'express';
import {
  faqCreateSchema,
  faqFeedbackSchema,
  faqListQuerySchema,
  faqUpdateSchema,
} from '@samagama/shared';
import { faqController } from '../controllers/faq.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth);

// Recently-viewed lives under /api/faqs/recent — a fixed segment so it doesn't conflict with /:id.
router.get('/recent', asyncHandler(faqController.recentlyViewed));

router.get('/', validate(faqListQuerySchema, 'query'), asyncHandler(faqController.list));
router.get('/:id', asyncHandler(faqController.getById));

router.post(
  '/',
  requireRole('admin', 'moderator'),
  validate(faqCreateSchema),
  asyncHandler(faqController.create),
);
router.patch(
  '/:id',
  requireRole('admin', 'moderator'),
  validate(faqUpdateSchema),
  asyncHandler(faqController.update),
);
router.patch(
  '/:id/archive',
  requireRole('admin', 'moderator'),
  asyncHandler(faqController.archive),
);

// Authenticated student/mod/admin can record a view or leave feedback.
router.post('/:id/view', asyncHandler(faqController.recordView));
router.post(
  '/:id/feedback',
  validate(faqFeedbackSchema),
  asyncHandler(faqController.submitFeedback),
);

// Similarity check — mirrors remote POST /api/faqs/check-similar.
router.post(
  '/check-similar',
  requireRole('admin', 'moderator'),
  asyncHandler(faqController.checkSimilarity),
);

export const faqRouter = router;
