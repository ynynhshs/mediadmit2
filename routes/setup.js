// First-run setup: when the database has no users yet, the website asks
// for the Administrator account here. After that, this page is closed.
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const audit = require('../utils/audit');

const router = express.Router();

router.get('/', async (req, res) => {
  if (await User.exists({})) return res.redirect('/login');
  res.render('setup', { error: null, form: {} });
});

router.post('/', async (req, res) => {
  if (await User.exists({})) return res.redirect('/login');
  const f = req.body;
  const fail = (error) => res.status(400).render('setup', { error, form: f });

  const firstName = (f.firstName || '').trim();
  const lastName = (f.lastName || '').trim();
  const employeeId = (f.employeeId || '').trim();
  const email = (f.email || '').trim().toLowerCase();
  if (!firstName || !lastName || !employeeId || !email || !f.password) return fail('Please fill in all fields.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Please enter a valid email address.');
  if (f.password.length < 8) return fail('Password must be at least 8 characters.');
  if (f.password !== f.confirmPassword) return fail('Passwords do not match.');

  const admin = await User.create({
    firstName, lastName, employeeId, email, role: 'Administrator', status: 'Active',
    permissions: User.ROLE_DEFAULTS.Administrator, passwordHash: await bcrypt.hash(f.password, 10),
    lastLogin: new Date(),
  });
  req.app.locals.hasUsers = true;

  // Sign the new administrator in right away
  req.session.regenerate(async () => {
    req.session.userId = admin._id.toString();
    await audit(req, 'CREATE', 'Users', `Created the Administrator account (${admin.email}) during first-time setup`, admin);
    req.session.flash = { type: 'ok', text: 'Welcome! Your Administrator account is ready. Start by registering your first patient.' };
    res.redirect('/');
  });
});

module.exports = router;
