const mongoose = require('mongoose');
const User = require('../models/User');

const ROLES = ['Administrator', 'Admitting Clerk', 'Nurse', 'Physician', 'Records Officer'];

// Privileges that can be switched on/off per user (shown on the Users page)
const PERMISSIONS = {
  registerPatients: 'Register patients',
  editPatients: 'Edit patient records',
  admitDischarge: 'Admit / discharge',
  assessPatients: 'Assess patients',
  generateReports: 'Generate reports',
  manageUsers: 'Manage users',
  viewAudit: 'View audit trail',
};

// Default privileges for each role (an administrator can change them per user)
const ROLE_DEFAULTS = {
  'Administrator':   { registerPatients: true,  editPatients: true,  assessPatients: true,  admitDischarge: true,   generateReports: true,  manageUsers: true,  viewAudit: true },
  'Admitting Clerk': { registerPatients: true,  editPatients: false, assessPatients: false, admitDischarge: true,   generateReports: false, manageUsers: false, viewAudit: false },
  'Nurse':           { registerPatients: false, editPatients: true,  assessPatients: true,  admitDischarge: false,  generateReports: false, manageUsers: false, viewAudit: false },
  'Physician':       { registerPatients: false, editPatients: true,  assessPatients: true,  admitDischarge: true,  generateReports: false, manageUsers: false, viewAudit: false },
  'Records Officer': { registerPatients: false, editPatients: false, assessPatients: false, admitDischarge: false, generateReports: true,  manageUsers: false, viewAudit: false },
};

const permissionFields = {};
for (const key of Object.keys(PERMISSIONS)) permissionFields[key] = { type: Boolean, default: false };

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  employeeId: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  username: { type: String, unique: true, sparse: true, trim: true }, // 👈 Must be here
  passwordHash: { type: String, required: true },
  role: { type: String, required: true }, // 👈 No strict enum
  subsystems: { type: [String], default: [] },
  status: { type: String, enum: ['Pending', 'Active', 'Deactivated'], default: 'Pending' },
  permissions: { type: permissionFields, default: () => ({}) },
  lastLogin: Date,
  resetRequestedAt: Date,
}, { timestamps: true });

userSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });
userSchema.virtual('initials').get(function () {
  return `${(this.firstName || '?')[0]}${(this.lastName || '')[0] || ''}`.toUpperCase();
});

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;
User.PERMISSIONS = PERMISSIONS;
User.ROLE_DEFAULTS = ROLE_DEFAULTS;
module.exports = User;