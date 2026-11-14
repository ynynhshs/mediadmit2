const express = require('express');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { requirePermission } = require('../middleware/auth');
const { inputDate } = require('../utils/format');

const router = express.Router();
router.use(requirePermission('viewAudit'));
const PAGE_SIZE = 15;

function buildFilter(qs) {
  const filter = {};
  if (qs.user) filter.user = qs.user;
  if (qs.action) filter.action = qs.action;
  if (qs.module) filter.module = qs.module;
  const from = qs.from ? new Date(qs.from) : null;
  const to = qs.to ? new Date(qs.to) : null;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) { to.setHours(23, 59, 59, 999); filter.createdAt.$lte = to; }
  }
  if (qs.q) {
    const rx = new RegExp(qs.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ details: rx }, { userName: rx }];
  }
  return filter;
}

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = buildFilter(req.query);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [total, logs, users, actionsToday, activeUsers, changes, alerts] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    User.find().sort({ lastName: 1 }),
    AuditLog.countDocuments({ createdAt: { $gte: today } }),
    AuditLog.distinct('user', { createdAt: { $gte: today }, user: { $ne: null } }),
    AuditLog.countDocuments({ createdAt: { $gte: today }, action: { $in: ['CREATE', 'UPDATE', 'DELETE'] } }),
    AuditLog.countDocuments({ createdAt: { $gte: today }, action: 'FAILED LOGIN' }),
  ]);

  res.render('audit', {
    title: 'Audit Trail', logs, users, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    query: req.query, ACTIONS: AuditLog.ACTIONS, MODULES: AuditLog.MODULES,
    stats: { actionsToday, activeUsers: activeUsers.length, totalUsers: users.length, changes, alerts },
  });
});

// Download the filtered log as a CSV file (opens in Excel)
router.get('/export.csv', async (req, res) => {
  const logs = await AuditLog.find(buildFilter(req.query)).sort({ createdAt: -1 }).limit(10000);
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [['Date & Time', 'User', 'Role', 'Action', 'Module', 'Details', 'IP Address'].map(esc).join(',')];
  for (const l of logs) lines.push([l.createdAt.toISOString(), l.userName, l.role, l.action, l.module, l.details, l.ip].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${inputDate(new Date())}.csv"`);
  res.send(lines.join('\n'));
});

module.exports = router;
