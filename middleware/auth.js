const User = require('../models/User');

// Loads the logged-in user (if any) into req.user and res.locals.currentUser.
async function loadUser(req, res, next) {
  res.locals.currentUser = null;
  if (req.session.userId) {
    const user = await User.findById(req.session.userId);
    if (user && user.status === 'Active') {
      req.user = user;
      res.locals.currentUser = user;
    } else {
      req.session.userId = null;
    }
  }
  res.locals.can = (perm) => !!(req.user && req.user.permissions && req.user.permissions[perm]);
  next();
}

// Blocks pages for people who are not logged in.
function requireLogin(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// Blocks pages for users without a given privilege, e.g. requirePermission('manageUsers')
function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login');
    if (!req.user.permissions || !req.user.permissions[perm]) {
      return res.status(403).render('error', {
        title: 'Access denied',
        message: 'Your account does not have permission to use this feature. Ask an administrator to update your privileges.',
      });
    }
    next();
  };
}

module.exports = { loadUser, requireLogin, requirePermission };
