const mongoose = require('mongoose');

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED LOGIN', 'EXPORT'];
const MODULES = ['Authentication', 'Registration', 'Patients', 'Assessments', 'Admissions', 'Reports', 'Users'];

const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'Unknown user' },
  role: { type: String, default: '—' },
  action: { type: String, enum: ACTIONS, required: true },
  module: { type: String, enum: MODULES, required: true },
  details: { type: String, default: '' },
  ip: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditSchema);
AuditLog.ACTIONS = ACTIONS;
AuditLog.MODULES = MODULES;
module.exports = AuditLog;
