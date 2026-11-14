require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoStore } = require('connect-mongo');

const { loadUser, requireLogin } = require('./middleware/auth');
const fmt = require('./utils/format');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediadmit';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  // Sessions are saved in MongoDB, so users stay signed in even if the server restarts
  store: MongoStore.create({ mongoUrl: MONGODB_URI, dbName: 'medilink_lab_dev', collectionName: 'admit_sessions' }),
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8-hour shift
}));

// Helpers for every page
app.use((req, res, next) => {
  res.locals.fmt = fmt;
  res.locals.path = req.path;
  // Show a one-time message once (but not on file requests like images, so it isn't lost)
  const isFile = /\.[a-z0-9]+$/i.test(req.path);
  res.locals.flash = isFile ? null : req.session.flash || null;
  if (!isFile) delete req.session.flash;
  next();
});
app.use(loadUser);

// First-time setup: while the database has no users, every page goes to /setup
const User = require('./models/User');
app.use('/setup', require('./routes/setup'));
app.use(async (req, res, next) => {
  if (!app.locals.hasUsers) app.locals.hasUsers = !!(await User.exists({}));
  if (!app.locals.hasUsers) return res.redirect('/setup');
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/', requireLogin, require('./routes/dashboard'));
app.use('/patients', requireLogin, require('./routes/patients'));
app.use('/admissions', requireLogin, require('./routes/admissions'));
app.use('/assessments', requireLogin, require('./routes/assessments'));
app.use('/reports', requireLogin, require('./routes/reports'));
app.use('/users', requireLogin, require('./routes/users'));
app.use('/audit', requireLogin, require('./routes/audit'));
app.use('/account', requireLogin, require('./routes/account'));

// 404
app.use((req, res) => res.status(404).render('error', { title: 'Page not found', message: 'The page you are looking for does not exist.' }));

// Errors
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Something went wrong', message: err.message });
});

// Updates data saved by the older version (with Rooms & Beds) so it still works
async function upgradeOldData() {
  const db = mongoose.connection.db;
  await db.collection('patients').updateMany({ status: { $in: ['Pending Bed', 'Transferred'] } }, { $set: { status: 'Admitted' } });
  await db.collection('admit_admissions').updateMany({ status: { $in: ['Pending Bed', 'Transferred'] } }, { $set: { status: 'Admitted' } });
  await db.collection('admit_admissions').updateMany({ bed: { $exists: true } }, { $unset: { bed: '', bedLabel: '' } });
  
  // Only update users that belong to this subsystem (Administrator, Clerk, Nurse, etc.)
  const validRoles = ['Administrator', 'Admitting Clerk', 'Nurse', 'Physician', 'Records Officer'];
  for (const u of await User.find({ 'permissions.assessPatients': { $exists: false }, role: { $in: validRoles } })) {
    u.permissions.assessPatients = !!(User.ROLE_DEFAULTS[u.role] || {}).assessPatients;
    await u.save();
  }
}

mongoose.connect(MONGODB_URI, { dbName: 'medilink_lab_dev' })
  .then(async () => {
    console.log('Connected to MongoDB (medilink_lab_dev)');
    await upgradeOldData();
    app.listen(PORT, '0.0.0.0', () => console.log(`MediAdmit is running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB. Is MongoDB running?\n', err.message);
    process.exit(1);
  });
