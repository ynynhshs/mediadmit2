// Small helpers available in every EJS view (see server.js).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

function date(d) {
  if (!d) return '—';
  d = new Date(d);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function time(d) {
  if (!d) return '';
  d = new Date(d);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function dateTime(d) {
  if (!d) return '—';
  d = new Date(d);
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${time(d)}`;
}
function fullDateTime(d) {
  d = new Date(d);
  return `${date(d)} · ${time(d)}:${pad(d.getSeconds())}`;
}
function inputDate(d) {
  if (!d) return '';
  d = new Date(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isToday(d) {
  const t = new Date(); d = new Date(d);
  return d.toDateString() === t.toDateString();
}
function lastLogin(d) {
  if (!d) return '—';
  return isToday(d) ? `Today · ${time(d)}` : dateTime(d);
}

// Colour class for a status tag (see .tag classes in style.css)
const TAG = {
  'Admitted': 'g', 'Active': 'g', 'CREATE': 'g', 'Non-Urgent': 'g', 'Sent Home': 'g',
  'Pending': 'y', 'Pending Approval': 'y', 'UPDATE': 'y', 'Urgent': 'y', 'Outpatient Treatment': 'y',
  'LOGIN': 'b', 'Administrator': 'b', 'For Admission': 'b', 'Referral to Another Facility': 'b',
  'Deactivated': 'r', 'FAILED LOGIN': 'r', 'DELETE': 'r', 'Emergency': 'r',
};
function tagClass(s) { return TAG[s] || 's'; }

function initials(name) {
  const w = (name || '?').replace(/^Dr\.\s*/, '').split(/\s+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}

module.exports = { date, time, dateTime, fullDateTime, inputDate, isToday, lastLogin, tagClass, initials };

// Small SVG icon used on stat cards: fmt.icon('#eef0ff', '#4f46e5', 'user')
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  doc: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  out: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>',
};
module.exports.icon = (bg, fg, name) =>
  `<div class="ico" style="background:${bg}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg></div>`;

// Writes a style="..." attribute from code, e.g. <%- fmt.style(`width:${pct}%`) %>
// (keeps VS Code's CSS checker from flagging EJS inside style attributes)
module.exports.style = (css) => `style="${String(css).replace(/"/g, '&quot;')}"`;
