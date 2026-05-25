import { Router } from 'express';
import { tagCreateSchema, tagUpdateSchema } from '@samagama/shared';
import { tagController } from '../controllers/tag.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(tagController.list));
router.post(
  '/',
  requireRole('admin', 'moderator'),
  validate(tagCreateSchema),
  asyncHandler(tagController.create),
);
router.patch(
  '/:id',
  requireRole('admin', 'moderator'),
  validate(tagUpdateSchema),
  asyncHandler(tagController.update),
);
router.delete('/:id', requireRole('admin', 'moderator'), asyncHandler(tagController.archive));

export const tagRouter = router;
