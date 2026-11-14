require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createSuperAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI, { dbName: 'medilink_lab_dev' });
  console.log('Connected to database...');

  const existing = await User.findOne({ email: 'superadmin@medilink.com' });
  if (existing) {
    console.log('Super Admin already exists!');
    process.exit(0);
  }

  await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    employeeId: 'SUPER-001',
    email: 'superadmin@medilink.com',
    passwordHash: await bcrypt.hash('SuperAdmin123!', 10),
    role: 'Administrator', 
    status: 'Active',
    subsystems: ['ALL'], // 👈 The master key
    permissions: User.ROLE_DEFAULTS.Administrator
  });

  console.log('✅ Super Admin created!');
  console.log('Email: superadmin@medilink.com | Password: SuperAdmin123!');
  process.exit(0);
}

createSuperAdmin();