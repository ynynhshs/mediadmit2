// Sets a new temporary password for one account, without deleting any data.
// Use it if the Administrator forgets their password.
// Run with:  npm run reset-password -- admin@hospital.ph     (or the Employee ID)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediadmit';
const login = (process.argv[2] || '').trim();

(async () => {
  if (!login) {
    console.log('Please type the email or Employee ID after the command, for example:');
    console.log('  npm run reset-password -- admin@hospital.ph');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const user = await User.findOne({ $or: [{ email: login.toLowerCase() }, { employeeId: login }] });
  if (!user) {
    console.log(`No account found for "${login}".`);
    const admins = await User.find({ role: 'Administrator' }).select('email employeeId');
    if (admins.length) console.log('Administrator accounts:', admins.map((a) => `${a.email} (${a.employeeId})`).join(', '));
  } else {
    const temp = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
    user.passwordHash = await bcrypt.hash(temp, 10);
    if (user.status !== 'Active') user.status = 'Active';
    user.resetRequestedAt = undefined;
    await user.save();
    console.log(`\n✓ New temporary password for ${user.firstName} ${user.lastName} (${user.email}):\n\n    ${temp}\n`);
    console.log('Sign in with it, then change it on My Account (click your name at the top right).');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
