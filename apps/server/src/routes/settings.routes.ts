import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', asyncHandler(settingsController.get));
router.patch('/', asyncHandler(settingsController.update));

export const settingsRouter = router;
