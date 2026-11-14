const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const audit = require('../utils/audit');

const router = express.Router();

// ---------- LOG IN ----------
router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { error: null, email: '' });
});

router.post('/login', async (req, res) => {
  const login = (req.body.login || '').trim();
  const password = req.body.password || '';

  // Accept either the email or the employee ID
  const user = await User.findOne({ $or: [{ email: login.toLowerCase() }, { employeeId: login }] });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await audit(req, 'FAILED LOGIN', 'Authentication', `Failed sign-in attempt for ${login || '(blank)'}`, null);
    return res.status(401).render('login', { error: 'Incorrect employee ID / email or password.', email: login });
  }
  if (user.status === 'Pending') {
    return res.status(403).render('login', { error: 'Your account is still waiting for administrator approval.', email: login });
  }
  if (user.status === 'Deactivated') {
    return res.status(403).render('login', { error: 'Your account has been deactivated. Please contact the administrator.', email: login });
  }
// Check if user has access to this subsystem or is a Super Admin
if (user.subsystems && !user.subsystems.includes('admissions') && !user.subsystems.includes('ALL')) {
  return res.status(403).render('login', { 
    error: 'Access Denied: You do not have permission to access the Admissions subsystem.', 
    form: req.body 
  });
}

  req.session.regenerate(async () => {
    req.session.userId = user._id.toString();
    if (req.body.remember) req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
    user.lastLogin = new Date();
    await user.save();
    await audit(req, 'LOGIN', 'Authentication', 'Signed in successfully', user);
    res.redirect('/');
  });

  // Check if user has access to this subsystem or is a Super Admin
if (!user.subsystems.includes('admissions') && !user.subsystems.includes('ALL')) {
  return res.status(403).render('login', { 
    error: 'Access Denied: You do not have permission to access the Admissions subsystem.', 
    form: req.body 
  });
}
});



// ---------- SIGN UP ----------
router.get('/signup', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('signup', { error: null, form: {}, roles: User.ROLES.filter((r) => r !== 'Administrator') });
});

router.post('/signup', async (req, res) => {
  const f = req.body;
  const roles = User.ROLES.filter((r) => r !== 'Administrator');
  const fail = (error) => res.status(400).render('signup', { error, form: f, roles });

  if (!f.firstName || !f.lastName || !f.employeeId || !f.email || !f.password) return fail('Please fill in all fields.');
  if (!roles.includes(f.role)) return fail('Please choose a valid role.');
  if (f.password.length < 8) return fail('Password must be at least 8 characters.');
  if (f.password !== f.confirmPassword) return fail('Passwords do not match.');
  if (!f.agree) return fail('You must agree to the Data Privacy Policy.');

  const exists = await User.findOne({ $or: [{ email: f.email.toLowerCase() }, { employeeId: f.employeeId.trim() }] });
  if (exists) return fail('An account with this email or employee ID already exists.');

  const user = await User.create({
    firstName: f.firstName, lastName: f.lastName, employeeId: f.employeeId.trim(), email: f.email,
    role: f.role, status: 'Pending', passwordHash: await bcrypt.hash(f.password, 10),
  });
  await audit(req, 'CREATE', 'Users', `New sign-up request: ${user.firstName} ${user.lastName} (${user.role})`, user);

  res.render('login', { error: null, email: user.email, success: 'Account created! You can sign in once an administrator approves your request.' });
});

// ---------- FORGOT PASSWORD (sends a request to the administrator) ----------
router.get('/forgot-password', (req, res) => res.render('forgot', { sent: false }));

router.post('/forgot-password', async (req, res) => {
  const login = (req.body.login || '').trim();
  const user = await User.findOne({ $or: [{ email: login.toLowerCase() }, { employeeId: login }] });
  if (user && user.status === 'Active') {
    user.resetRequestedAt = new Date();
    await user.save();
    await audit(req, 'UPDATE', 'Users', `Password reset requested by ${user.firstName} ${user.lastName}`, user);
  }
  // Same message either way, so nobody can use this page to guess accounts
  res.render('forgot', { sent: true });
});

// ---------- DATA PRIVACY POLICY ----------
router.get('/privacy', (req, res) => res.render('privacy'));

// ---------- LOG OUT ----------
router.get('/logout', async (req, res) => {
  if (req.user) await audit(req, 'LOGOUT', 'Authentication', 'Signed out');
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
