// Deletes ALL MediAdmit data (users, patients, assessments, admissions, audit trail)
// so the system starts empty again. The next time you open the website it will
// ask you to create the Administrator account.
// Run with:  npm run reset
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediadmit';

async function wipe() {
  await mongoose.connect(MONGODB_URI);
  const name = mongoose.connection.db.databaseName;
  await mongoose.connection.db.dropDatabase();
  console.log(`\n✓ The "${name}" database is now empty.`);
  console.log('  Restart the website (npm start) and open http://localhost:3000 to create the Administrator account.');
  await mongoose.disconnect();
}

if (process.argv.includes('--yes')) {
  wipe().catch((e) => { console.error(e.message); process.exit(1); });
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('⚠️  This will DELETE ALL DATA: users, patients, assessments, admissions and the audit trail.');
  rl.question('Type DELETE and press Enter to continue: ', (answer) => {
    rl.close();
    if (answer.trim() !== 'DELETE') { console.log('Cancelled. Nothing was deleted.'); return; }
    wipe().catch((e) => { console.error(e.message); process.exit(1); });
  });
}
