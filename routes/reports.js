const express = require('express');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const Assessment = require('../models/Assessment');
const { requirePermission } = require('../middleware/auth');
const audit = require('../utils/audit');
const { inputDate } = require('../utils/format');

const router = express.Router();

const TYPES = {
  registrations: 'Patient Registration Report',
  patients: 'Patient Records Report',
  assessments: 'Patient Assessment Report',
  admissions: 'Admissions Report',
};

function range(req) {
  const now = new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = req.query.to ? new Date(req.query.to) : now;
  const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
  return { from, to: toEnd };
}

router.get('/', requirePermission('generateReports'), async (req, res) => {
  const type = TYPES[req.query.type] ? req.query.type : 'admissions';
  const { from, to } = range(req);

  // Last 6 months of admissions (chart)
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = type === 'registrations' || type === 'patients'
      ? await Patient.countDocuments({ createdAt: { $gte: start, $lt: end } })
      : type === 'assessments'
        ? await Assessment.countDocuments({ assessedAt: { $gte: start, $lt: end } })
        : await Admission.countDocuments({ admittedAt: { $gte: start, $lt: end } });
    months.push({ label: start.toLocaleDateString('en-US', { month: 'short' }), count });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  // Table rows for the selected report
  let rows = [];
  let columns = [];
  if (type === 'registrations') {
    columns = ['Patient ID', 'Name', 'Sex', 'Age', 'City', 'Registered'];
    const list = await Patient.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: -1 }).limit(500);
    rows = list.map((p) => [p.patientId, p.fullName, p.sex, p.age, p.city || '—', res.locals.fmt.dateTime(p.createdAt)]);
  } else if (type === 'patients') {
    columns = ['Patient ID', 'Name', 'Contact No.', 'Blood', 'Insurance', 'Status'];
    const list = await Patient.find({}).sort({ lastName: 1 }).limit(1000);
    rows = list.map((p) => [p.patientId, p.fullName, p.contactNo || '—', p.medical.bloodType || '—', p.insurance.provider || 'None', p.status]);
  } else if (type === 'assessments') {
    columns = ['Assessment No.', 'Patient', 'Chief Complaint', 'BP', 'Temp', 'Triage', 'Impression', 'Recommendation', 'Date & Time'];
    const list = await Assessment.find({ assessedAt: { $gte: from, $lte: to } }).populate('patient').sort({ assessedAt: -1 }).limit(500);
    rows = list.map((x) => [x.assessmentNo, x.patient ? x.patient.fullName : '—', x.chiefComplaint,
      x.vitals.bpSystolic ? `${x.vitals.bpSystolic}/${x.vitals.bpDiastolic || '—'}` : '—',
      x.vitals.temperature != null ? `${x.vitals.temperature} °C` : '—', x.triageLevel, x.impression, x.recommendation, res.locals.fmt.dateTime(x.assessedAt)]);
  } else {
    columns = ['Admission No.', 'Patient', 'Physician', 'Reason', 'Assessment', 'Date & Time', 'Discharged', 'Status'];
    const list = await Admission.find({ admittedAt: { $gte: from, $lte: to } }).populate('patient').populate('assessment').sort({ admittedAt: -1 }).limit(500);
    rows = list.map((a) => [a.admissionNo, a.patient ? a.patient.fullName : '—', a.physician, a.reason,
      a.assessment ? a.assessment.assessmentNo : '—', res.locals.fmt.dateTime(a.admittedAt), a.dischargedAt ? res.locals.fmt.dateTime(a.dischargedAt) : '—', a.status]);
  }

  // Assessments by triage level + top physicians (in range)
  const byTriage = await Assessment.aggregate([
    { $match: { assessedAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$triageLevel', count: { $sum: 1 } } },
  ]);
  const triage = Assessment.TRIAGE.map((t) => ({ _id: t, count: (byTriage.find((x) => x._id === t) || {}).count || 0 }));
  const assessTotal = triage.reduce((s2, t) => s2 + t.count, 0);
  const topPhysicians = await Admission.aggregate([
    { $match: { admittedAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$physician', count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 5 },
  ]);
  const rangeTotal = await Admission.countDocuments({ admittedAt: { $gte: from, $lte: to } });

  res.render('reports', {
    title: 'Reports', type, TYPES, months, maxMonth, rows, columns, triage, assessTotal, topPhysicians, rangeTotal,
    from: inputDate(from), to: inputDate(to),
  });
});

// Called by the Print / Save as PDF button so the export is recorded.
router.post('/log', requirePermission('generateReports'), async (req, res) => {
  const name = TYPES[req.body.type] || 'Report';
  await audit(req, 'EXPORT', 'Reports', `Printed ${name} (${req.body.from} to ${req.body.to})`);
  res.json({ ok: true });
});

module.exports = router;
