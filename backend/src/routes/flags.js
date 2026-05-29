'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Flag = require('../models/Flag');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLog = require('../middleware/auditLogger');

// POST /api/flags
router.post('/', authenticate, [
  body('entityType').isIn(['faq', 'question', 'answer']),
  body('entityId').notEmpty(),
  body('reason').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { entityType, entityId, reason } = req.body;
    const flag = await Flag.create({ entityType, entityId, reason, reportedBy: req.user._id });
    res.status(201).json(flag);
  } catch (err) { next(err); }
});

// GET /api/flags
router.get('/', authenticate, requireRole('moderator', 'admin'), async (req, res, next) => {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [flags, total] = await Promise.all([
      Flag.find({ status }).populate('reportedBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Flag.countDocuments({ status }),
    ]);
    res.json({ flags, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// PATCH /api/flags/:id
router.patch('/:id', authenticate, requireRole('moderator', 'admin'), auditLog('review_flag', 'flag'), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'status must be resolved or dismissed' });
    }
    const flag = await Flag.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.user._id, reviewNote: note },
      { new: true }
    );
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (err) { next(err); }
});

module.exports = router;
