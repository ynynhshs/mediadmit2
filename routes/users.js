const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ lastName: 1 });
    res.render('users', { title: 'Users', users });
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message });
  }
});

// Add new user form
router.get('/new', (req, res) => {
  res.render('users', { title: 'Add User', users: [], form: {} });
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, employeeId, email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, employeeId, email, passwordHash, role, status: 'Active' });
    res.redirect('/users');
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message });
  }
});

// Toggle status
router.post('/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.status = user.status === 'Active' ? 'Deactivated' : 'Active';
      await user.save();
    }
    res.redirect('/users');
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message });
  }
});

module.exports = router;