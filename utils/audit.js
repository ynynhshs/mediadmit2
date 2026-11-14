const AuditLog = require('../models/AuditLog');

// Records one action in the Audit Trail.
// Usage: await audit(req, 'CREATE', 'Registration', 'Registered new patient PT-2026-01483');
async function audit(req, action, module, details, userOverride) {
  const u = userOverride || req.user || null;
  try {
    await AuditLog.create({
      user: u ? u._id : null,
      userName: u ? `${u.firstName} ${u.lastName}` : 'Unknown user',
      role: u ? u.role : '—',
      action,
      module,
      details,
      ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().replace('::ffff:', ''),
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = audit;
