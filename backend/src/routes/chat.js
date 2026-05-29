'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const Faq = require('../models/Faq');
const Ticket = require('../models/Ticket');
const ChatFeedback = require('../models/ChatFeedback');
const { authenticate, optionalAuth } = require('../middleware/auth');
const llmService = require('../services/llmService');

const ESCALATE_RE = /^#(force)?escalate/i;

// POST /api/chat/query
router.post('/query', optionalAuth, [
  body('message').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { message, sessionId = randomUUID(), conversationHistory = [] } = req.body;

    if (ESCALATE_RE.test(message)) {
      const isForce = /forceescalate/i.test(message);
      let summary, isGeneralQuery;
      try {
        const result = await llmService.summarize({
          escalationType: isForce ? 'force' : 'standard',
          forceReason: isForce ? message.replace(/#forceescalate\s*/i, '') : undefined,
          conversationHistory,
        });
        summary = result.summary || 'No summary available';
        isGeneralQuery = result.is_general_query ?? false;
      } catch (e) {
        console.error('[chat] LLM summarize error:', e.message);
        summary = 'Could not summarize conversation.';
        isGeneralQuery = false;
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const ticket = await Ticket.create({
        summary,
        conversationHistory,
        isGeneralQuery,
        sessionId,
        createdBy: req.user?._id,
        expiresAt,
      });

      return res.json({
        response: `Your query has been escalated. Ticket ID: ${ticket._id}. Summary: ${summary}`,
        sessionId,
        fallback_triggered: false,
        ticketId: ticket._id,
      });
    }

    // Fetch relevant FAQs via text search (fallback for non-Atlas environments)
    const faqResults = await Faq.find(
      { $text: { $search: message }, status: 'published' },
      { score: { $meta: 'textScore' }, title: 1, answer: 1 }
    ).sort({ score: { $meta: 'textScore' } }).limit(5).lean();

    const ragContext = faqResults.map((f) => ({ title: f.title, content: f.answer }));

    let response, fallback_triggered;
    try {
      const result = await llmService.generate({ ragContext, conversationHistory, currentMessage: message });
      response = result.response_text;
      fallback_triggered = result.fallback_triggered ?? false;
    } catch (e) {
      console.error('[chat] LLM generate error:', e.message);
      response = "I don't have an answer for you at the moment. You can escalate it to the backend team: Type #escalate";
      fallback_triggered = true;
    }

    res.json({ response, sessionId, fallback_triggered });
  } catch (err) { next(err); }
});

// POST /api/chat/feedback
router.post('/feedback', optionalAuth, [
  body('chatSessionId').notEmpty(),
  body('messageIndex').isInt({ min: 0 }),
  body('rating').isIn(['helpful', 'unhelpful', 'incorrect']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { chatSessionId, messageIndex, rating, message, response } = req.body;
    const feedback = await ChatFeedback.create({
      chatSessionId,
      messageIndex,
      rating,
      message,
      response,
      userId: req.user?._id,
    });
    res.status(201).json(feedback);
  } catch (err) { next(err); }
});

// GET /api/chat/feedback
router.get('/feedback', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [feedbacks, total] = await Promise.all([
      ChatFeedback.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ChatFeedback.countDocuments(),
    ]);
    res.json({ feedbacks, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

module.exports = router;
