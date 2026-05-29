'use strict';
const AuditLog = require('../models/AuditLog');

function auditLog(action, targetType) {
  return async (req, _res, next) => {
    const orig = _res.json.bind(_res);
    _res.json = function (body) {
      if (_res.statusCode < 400 && req.user) {
        const targetId = req.params?.id || body?._id;
        AuditLog.create({
          actorId: req.user._id,
          action,
          targetType,
          targetId,
          metadata: { method: req.method, path: req.path },
        }).catch((e) => console.error('[audit]', e));
      }
      return orig(body);
    };
    next();
  };
}

module.exports = auditLog;
