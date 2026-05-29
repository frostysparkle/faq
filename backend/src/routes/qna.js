'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLog = require('../middleware/auditLogger');

// POST /api/qna/check-existing — text-based similarity stub
router.post('/check-existing', authenticate, [
  body('title').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title } = req.body;
    const existing = await Question.find({ $text: { $search: title } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .lean();
    res.json({ similar: existing });
  } catch (err) { next(err); }
});

// POST /api/qna/questions
router.post('/questions', authenticate, [
  body('title').trim().notEmpty(),
  body('type').optional().isIn(['personal', 'community']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, description, type = 'community', tags = [] } = req.body;
    const question = await Question.create({ title, description, type, tags, askedBy: req.user._id });
    res.status(201).json(question);
  } catch (err) { next(err); }
});

// GET /api/qna/questions
router.get('/questions', authenticate, async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (req.user.role === 'student') filter.type = 'community';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
      Question.find(filter).populate('askedBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Question.countDocuments(filter),
    ]);
    res.json({ questions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// POST /api/qna/answers
router.post('/answers', authenticate, [
  body('questionId').notEmpty(),
  body('body').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { questionId, body: answerBody } = req.body;
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    const answer = await Answer.create({ questionId, body: answerBody, submittedBy: req.user._id });
    res.status(201).json(answer);
  } catch (err) { next(err); }
});

// GET /api/qna/pending-answers
router.get('/pending-answers', authenticate, requireRole('moderator', 'admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [answers, total] = await Promise.all([
      Answer.find({ status: 'pending' })
        .populate('questionId', 'title')
        .populate('submittedBy', 'name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Answer.countDocuments({ status: 'pending' }),
    ]);
    res.json({ answers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// PATCH /api/qna/answers/:id/approve
router.patch('/answers/:id/approve', authenticate, requireRole('moderator', 'admin'),
  auditLog('approve_answer', 'answer'), async (req, res, next) => {
    try {
      const answer = await Answer.findByIdAndUpdate(
        req.params.id,
        { status: 'approved', reviewedBy: req.user._id, reviewNote: req.body.note },
        { new: true }
      );
      if (!answer) return res.status(404).json({ error: 'Answer not found' });
      await Question.findByIdAndUpdate(answer.questionId, { status: 'answered' });
      res.json(answer);
    } catch (err) { next(err); }
  });

// PATCH /api/qna/answers/:id/reject
router.patch('/answers/:id/reject', authenticate, requireRole('moderator', 'admin'),
  auditLog('reject_answer', 'answer'), async (req, res, next) => {
    try {
      const answer = await Answer.findByIdAndUpdate(
        req.params.id,
        { status: 'rejected', reviewedBy: req.user._id, reviewNote: req.body.note },
        { new: true }
      );
      if (!answer) return res.status(404).json({ error: 'Answer not found' });
      res.json(answer);
    } catch (err) { next(err); }
  });

// GET /api/qna/answers/:questionId — approved answers for a question
router.get('/answers/:questionId', async (req, res, next) => {
  try {
    const answers = await Answer.find({ questionId: req.params.questionId, status: 'approved' })
      .populate('submittedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(answers);
  } catch (err) { next(err); }
});

module.exports = router;
