'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Faq = require('../models/Faq');
const Question = require('../models/Question');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const auditLog = require('../middleware/auditLogger');

// GET /api/faqs
router.get('/faqs', optionalAuth, async (req, res, next) => {
  try {
    const { category, tag, search, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    } else if (!req.user || req.user.role === 'student') {
      filter.status = 'published';
    }
    if (category) filter.categories = category;
    if (tag) filter.tags = tag;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [faqs, total] = await Promise.all([
      Faq.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Faq.countDocuments(filter),
    ]);
    res.json({ faqs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/faqs/:id
router.get('/faqs/:id', optionalAuth, async (req, res, next) => {
  try {
    const faq = await Faq.findById(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    faq.viewCount += 1;
    await faq.save();
    res.json(faq);
  } catch (err) { next(err); }
});

// POST /api/faqs
router.post('/faqs', authenticate, requireRole('moderator', 'admin'), [
  body('title').trim().notEmpty(),
  body('answer').trim().notEmpty(),
], auditLog('create_faq', 'faq'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, answer, categories = [], tags = [], status = 'draft' } = req.body;
    const faq = await Faq.create({ title, answer, categories, tags, status, createdBy: req.user._id });
    res.status(201).json(faq);
  } catch (err) { next(err); }
});

// PATCH /api/faqs/:id
router.patch('/faqs/:id', authenticate, requireRole('moderator', 'admin'), auditLog('update_faq', 'faq'), async (req, res, next) => {
  try {
    const allowed = ['title', 'answer', 'categories', 'tags', 'status'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const faq = await Faq.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    res.json(faq);
  } catch (err) { next(err); }
});

// DELETE /api/faqs/:id
router.delete('/faqs/:id', authenticate, requireRole('admin'), auditLog('delete_faq', 'faq'), async (req, res, next) => {
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    res.json({ message: 'FAQ archived' });
  } catch (err) { next(err); }
});

// POST /api/faqs/:id/feedback
router.post('/faqs/:id/feedback', authenticate, [
  body('type').isIn(['helpful', 'unhelpful']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const inc = req.body.type === 'helpful' ? { helpfulCount: 1 } : { unhelpfulCount: 1 };
    const faq = await Faq.findByIdAndUpdate(req.params.id, { $inc: inc }, { new: true });
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    res.json({ helpfulCount: faq.helpfulCount, unhelpfulCount: faq.unhelpfulCount });
  } catch (err) { next(err); }
});

// POST /api/faqs/:id/view
router.post('/faqs/:id/view', optionalAuth, async (req, res, next) => {
  try {
    await Faq.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/categories
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await Faq.distinct('categories', { status: 'published' });
    res.json(categories.filter(Boolean));
  } catch (err) { next(err); }
});

// GET /api/tags
router.get('/tags', async (_req, res, next) => {
  try {
    const tags = await Faq.distinct('tags', { status: 'published' });
    res.json(tags.filter(Boolean));
  } catch (err) { next(err); }
});

// GET /api/stats/faqs
router.get('/stats/faqs', async (_req, res, next) => {
  try {
    const [total, published, draft, archived] = await Promise.all([
      Faq.countDocuments(),
      Faq.countDocuments({ status: 'published' }),
      Faq.countDocuments({ status: 'draft' }),
      Faq.countDocuments({ status: 'archived' }),
    ]);
    res.json({ total, published, draft, archived });
  } catch (err) { next(err); }
});

// GET /api/stats/questions
router.get('/stats/questions', authenticate, requireRole('moderator', 'admin'), async (_req, res, next) => {
  try {
    const [total, open, answered, closed] = await Promise.all([
      Question.countDocuments(),
      Question.countDocuments({ status: 'open' }),
      Question.countDocuments({ status: 'answered' }),
      Question.countDocuments({ status: 'closed' }),
    ]);
    res.json({ total, open, answered, closed });
  } catch (err) { next(err); }
});

module.exports = router;
