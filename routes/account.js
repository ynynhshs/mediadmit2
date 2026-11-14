// "My Account" page: every user can change their own name, email and password.
// Only an Administrator can change their own Employee ID.
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const audit = require('../utils/audit');

const router = express.Router();

function render(res, extra = {}) {
  res.render('account', { title: 'My Account', profileError: null, passwordError: null, ...extra });
}

router.get('/', (req, res) => render(res));

// ---------- UPDATE PROFILE (name, email, employee ID) ----------
router.post('/profile', async (req, res) => {
  const user = req.user;
  const f = req.body;
  const firstName = (f.firstName || '').trim();
  const lastName = (f.lastName || '').trim();
  const email = (f.email || '').trim().toLowerCase();
  const employeeId = (f.employeeId || '').trim();
  const isAdmin = user.role === 'Administrator';

  if (!firstName || !lastName || !email) return render(res, { profileError: 'Please fill in your name and email.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return render(res, { profileError: 'Please enter a valid email address.' });
  if (isAdmin && !employeeId) return render(res, { profileError: 'Employee ID cannot be empty.' });

  // Make sure no other account already uses this email / employee ID
  const or = [{ email }];
  if (isAdmin) or.push({ employeeId });
  const taken = await User.findOne({ _id: { $ne: user._id }, $or: or });
  if (taken) return render(res, { profileError: 'Another account already uses that email or employee ID.' });

  const changes = [];
  if (user.email !== email) changes.push(`email ${user.email} → ${email}`);
  if (isAdmin && user.employeeId !== employeeId) changes.push(`employee ID ${user.employeeId} → ${employeeId}`);
  if (user.firstName !== firstName || user.lastName !== lastName) changes.push('name');

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  if (isAdmin) user.employeeId = employeeId;
  await user.save();

  if (changes.length) await audit(req, 'UPDATE', 'Users', `Updated own account: ${changes.join(', ')}`);
  req.session.flash = { type: 'ok', text: changes.length ? 'Your account details were saved. Use your new email next time you sign in.' : 'No changes to save.' };
  res.redirect('/account');
});

// ---------- CHANGE PASSWORD ----------
router.post('/password', async (req, res) => {
  const user = req.user;
  const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body;

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return render(res, { passwordError: 'Your current password is incorrect.' });
  }
  if (newPassword.length < 8) return render(res, { passwordError: 'The new password must be at least 8 characters.' });
  if (newPassword !== confirmPassword) return render(res, { passwordError: 'The new passwords do not match.' });
  if (newPassword === currentPassword) return render(res, { passwordError: 'The new password must be different from the current one.' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await audit(req, 'UPDATE', 'Users', 'Changed own password');

  req.session.flash = { type: 'ok', text: 'Your password was changed. Use the new password next time you sign in.' };
  res.redirect('/account');
});

module.exports = router;
