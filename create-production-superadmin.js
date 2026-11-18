require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createSuperAdmin() {
  const uri = process.env.MONGODB_URI;
  const dbName = 'medilink_lab_dev';

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName });
    console.log(`Connected to production database: ${dbName}...`);

    const email = 'superadmin@medilink.com';
    const username = 'superadmin';
    const employeeId = 'SUPER-001';
    const password = 'SuperAdmin123!';

    // 1. Remove ANY existing account that matches the email, username, OR employeeId
    await User.deleteOne({ 
      $or: [
        { email: email }, 
        { username: username }, 
        { employeeId: employeeId }
      ] 
    });
    console.log('Cleared any existing super admin account (by email, username, or ID).');

    // 2. Hash the password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create the new super admin account
    await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      employeeId: employeeId,
      email: email,
      username: username,
      passwordHash: passwordHash,
      role: 'Administrator',
      status: 'Active',
      subsystems: ['ALL'], // Grants access to all subsystems
    });

    console.log('\n✅ Super Admin account created successfully in production!');
    console.log(`   Email:    ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB connection closed.');
  }
}

createSuperAdmin();