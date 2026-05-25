// Phase-6 prep: read-only chatbot feedback endpoints. Write paths (POST /feedback, /query)
// land alongside the chatbot itself.
import { Router } from 'express';
import { chatbotController } from '../controllers/chatbot.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(requireAuth, requireRole('moderator', 'admin'));

router.get('/feedback', asyncHandler(chatbotController.listFeedback));
router.get('/feedback/stats', asyncHandler(chatbotController.getStats));

export const chatbotRouter = router;
