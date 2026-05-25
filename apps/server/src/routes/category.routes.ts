import { Router } from 'express';
import { categoryCreateSchema, categoryUpdateSchema } from '@samagama/shared';
import { categoryController } from '../controllers/category.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(categoryController.list));
router.post(
  '/',
  requireRole('admin', 'moderator'),
  validate(categoryCreateSchema),
  asyncHandler(categoryController.create),
);
router.patch(
  '/:id',
  requireRole('admin', 'moderator'),
  validate(categoryUpdateSchema),
  asyncHandler(categoryController.update),
);
router.delete('/:id', requireRole('admin', 'moderator'), asyncHandler(categoryController.archive));

export const categoryRouter = router;
