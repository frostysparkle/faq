// Read-only metrics endpoints. Each route picks its own role gate.
import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth);

// Moderator/admin metrics.
router.get('/faqs', requireRole('moderator', 'admin'), asyncHandler(statsController.getFaqStats));
router.get(
  '/moderator',
  requireRole('moderator', 'admin'),
  asyncHandler(statsController.getModeratorStats),
);

// Student dashboard metrics.
router.get('/student', requireRole('student'), asyncHandler(statsController.getStudentStats));

// Spurti Points leaderboard — students only (moderators/admins don't accumulate points).
router.get('/leaderboard', requireRole('student'), asyncHandler(statsController.getLeaderboard));

// Idle-bucket counts for the community queue. Available to all authenticated roles.
router.get('/community-idle', asyncHandler(statsController.getCommunityIdle));

export const statsRouter = router;
