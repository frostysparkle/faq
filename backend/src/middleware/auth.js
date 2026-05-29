'use strict';
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
  const user = await User.findById(payload.sub).lean();
  if (!user || user.tokenVersion !== payload.tv) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  req.user = user;
  next();
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (user && user.tokenVersion === payload.tv) req.user = user;
  } catch { /* ignore */ }
  next();
}

const ROLE_ORDER = ['student', 'moderator', 'admin'];

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userLevel = ROLE_ORDER.indexOf(req.user.role);
    const minLevel = Math.min(...roles.map((r) => ROLE_ORDER.indexOf(r)));
    if (userLevel < minLevel) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

module.exports = { authenticate, optionalAuth, requireRole };
