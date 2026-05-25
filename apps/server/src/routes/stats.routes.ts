// Read-only metrics endpoints. Both routes require an authenticated moderator/admin.
import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth, requireRole('moderator', 'admin'));

router.get('/faqs', asyncHandler(statsController.getFaqStats));
router.get('/moderator', asyncHandler(statsController.getModeratorStats));

export const statsRouter = router;
