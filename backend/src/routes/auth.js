'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { JWT_SECRET, JWT_REFRESH_SECRET, BCRYPT_ROUNDS } = require('../config/env');

function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user._id, role: user.role, tv: user.tokenVersion },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: user._id, tv: user.tokenVersion },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').optional().trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password, name } = req.body;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, passwordHash, name });
    const tokens = issueTokens(user);
    res.status(201).json({ user: { _id: user._id, email: user.email, name: user.name, role: user.role }, ...tokens });
  } catch (err) { next(err); }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const tokens = issueTokens(user);
    res.json({ user: { _id: user._id, email: user.email, name: user.name, role: user.role }, ...tokens });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }
    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    const tokens = issueTokens(user);
    res.json(tokens);
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req, res) => {
  const { _id, email, name, role, spurtiPoints } = req.user;
  res.json({ _id, email, name, role, spurtiPoints });
});

module.exports = router;
