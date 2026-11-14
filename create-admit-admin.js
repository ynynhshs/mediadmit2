require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI, { dbName: 'medilink_lab_dev' });
  console.log('Connected...');

  const existing = await User.findOne({ email: 'admitadmin@medilink.com' });
  if (existing) {
    console.log('Admin already exists!');
    process.exit(0);
  }

  await User.create({
    firstName: 'Admissions',
    lastName: 'Admin',
    employeeId: 'ADM-00001',
    email: 'admitadmin@medilink.com',
    username: 'admitadmin', // 👈 This prevents the null conflict
    passwordHash: await bcrypt.hash('Admin123!', 10),
    role: 'Administrator', 
    status: 'Active',
    subsystems: ['admissions'],
    permissions: User.ROLE_DEFAULTS.Administrator
  });

  console.log('✅ Admissions Admin created!');
  console.log('Email: admitadmin@medilink.com | Password: Admin123!');
  process.exit(0);
}

createAdmin();