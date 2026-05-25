// Top-level API router. New feature routes will mount here.
import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { categoryRouter } from './category.routes.js';
import { tagRouter } from './tag.routes.js';
import { faqRouter } from './faq.routes.js';
import { qnaRouter } from './qna.routes.js';
import { moderationRouter } from './moderation.routes.js';
import { statsRouter } from './stats.routes.js';
import { flagRouter } from './flag.routes.js';
import { chatbotRouter } from './chatbot.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/tags', tagRouter);
router.use('/faqs', faqRouter);
router.use('/qna', qnaRouter);
router.use('/moderation', moderationRouter);
router.use('/stats', statsRouter);
router.use('/flags', flagRouter);
router.use('/chat', chatbotRouter);
// Future mounts:
// router.use('/chat', chatRouter);
// router.use('/admin', adminRouter);

export const apiRouter = router;
