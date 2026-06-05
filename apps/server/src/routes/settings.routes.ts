// /api/settings — global system settings. Readable by any authenticated user; writable by admins only.
import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// Any authenticated user may read settings (students need communityAnswerCap for UI).
router.get('/', requireAuth, asyncHandler(settingsController.get));

// Only admins may change settings.
router.patch('/', requireAuth, requireRole('admin'), asyncHandler(settingsController.update));

export const settingsRouter = router;
