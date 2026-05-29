'use strict';
const router = require('express').Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLog = require('../middleware/auditLogger');

// GET /api/users
router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter, '-passwordHash -tokenVersion').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/role
router.patch('/users/:id/role', authenticate, requireRole('admin'), auditLog('change_role', 'user'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, select: '-passwordHash -tokenVersion' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

// GET /api/audit-logs
router.get('/audit-logs', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find().populate('actorId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(),
    ]);
    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/stats/users
router.get('/stats/users', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const result = { student: 0, moderator: 0, admin: 0, total: 0 };
    for (const { _id, count } of counts) {
      result[_id] = count;
      result.total += count;
    }
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/settings
router.get('/settings', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const settings = await SystemSettings.get();
    res.json(settings);
  } catch (err) { next(err); }
});

// PATCH /api/settings
router.patch('/settings', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const allowed = ['confidenceThreshold', 'maxSources', 'fallbackMessage'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const settings = await SystemSettings.findOneAndUpdate(
      { _singleton: 'settings' },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(settings);
  } catch (err) { next(err); }
});

// GET /api/moderation/flags
router.get('/moderation/flags', authenticate, requireRole('moderator', 'admin'), async (req, res, next) => {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [flags, total] = await Promise.all([
      require('../models/Flag').find({ status }).populate('reportedBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      require('../models/Flag').countDocuments({ status }),
    ]);
    res.json({ flags, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// PATCH /api/moderation/flags/:id
router.patch('/moderation/flags/:id', authenticate, requireRole('moderator', 'admin'), auditLog('review_flag', 'flag'), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'status must be resolved or dismissed' });
    }
    const flag = await require('../models/Flag').findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.user._id, reviewNote: note },
      { new: true }
    );
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (err) { next(err); }
});

module.exports = router;
