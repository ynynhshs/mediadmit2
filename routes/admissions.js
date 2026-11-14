const express = require('express');
const Admission = require('../models/Admission');
const Patient = require('../models/Patient');
const Assessment = require('../models/Assessment');
const { nextAdmissionNo } = require('../models/Counter');
const { requirePermission } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
const PAGE_SIZE = 10;

// ---------- LIST ----------
router.get('/', async (req, res) => {
  const status = req.query.status || '';
  const physician = req.query.physician || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const filter = {};
  if (status) filter.status = status;
  if (physician) filter.physician = physician;

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [total, admissions, physicians, currentlyAdmitted, dischargedThisMonth, thisMonth, stays] = await Promise.all([
    Admission.countDocuments(filter),
    Admission.find(filter).populate('patient').populate('assessment').sort({ admittedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    Admission.distinct('physician'),
    Admission.countDocuments({ status: 'Admitted' }),
    Admission.countDocuments({ dischargedAt: { $gte: monthStart } }),
    Admission.countDocuments({ admittedAt: { $gte: monthStart } }),
    Admission.find({ status: 'Discharged', dischargedAt: { $ne: null } }).select('admittedAt dischargedAt').limit(500),
  ]);

  const avgStay = stays.length
    ? (stays.reduce((s, a) => s + (a.dischargedAt - a.admittedAt), 0) / stays.length / 86400000).toFixed(1)
    : '—';

  res.render('admissions/index', {
    title: 'Admissions', admissions, status, physician, physicians: physicians.sort(), page, total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), statuses: Admission.STATUSES,
    stats: { currentlyAdmitted, dischargedThisMonth, thisMonth, avgStay },
  });
});

// ---------- NEW ADMISSION ----------
// The patient's assessment that leads to this admission: the one given, or the latest one from the last 3 days
async function findAssessment(patientId, assessmentId) {
  if (!patientId) return null;
  if (assessmentId) {
    const a = await Assessment.findOne({ _id: assessmentId, patient: patientId }).catch(() => null);
    if (a) return a;
  }
  return Assessment.findOne({ patient: patientId, assessedAt: { $gte: new Date(Date.now() - 3 * 86400000) } }).sort({ assessedAt: -1 });
}

async function renderNew(res, { selectedPatient = '', assessmentId = '', error = null, form = {} }) {
  const patients = await Patient.find({ status: { $ne: 'Admitted' } }).sort({ createdAt: -1 }).limit(300);
  const assessment = await findAssessment(selectedPatient, assessmentId);
  res.status(error ? 400 : 200).render('admissions/new', {
    title: 'Admissions', patients, selectedPatient: String(selectedPatient || ''), assessment, error, form,
  });
}

router.get('/new', requirePermission('admitDischarge'), (req, res) =>
  renderNew(res, { selectedPatient: req.query.patient || '', assessmentId: req.query.assessment || '' }));

router.post('/new', requirePermission('admitDischarge'), async (req, res) => {
  const { patient: patientId, physician, reason, notes, assessment: assessmentId } = req.body;
  const patient = await Patient.findById(patientId).catch(() => null);
  const fail = (error) => renderNew(res, { selectedPatient: patientId, assessmentId, error, form: req.body });
  if (!patient) return fail('Please select a patient.');
  if (!physician || !reason) return fail('Admitting physician and reason for admission are required.');
  if (patient.status === 'Admitted') return fail('This patient is already admitted.');

  const assessment = await findAssessment(patient._id, assessmentId);
  const admission = await Admission.create({
    admissionNo: await nextAdmissionNo(), patient: patient._id, assessment: assessment ? assessment._id : null,
    physician, reason, notes, status: 'Admitted', admittedBy: req.user._id,
  });
  patient.status = 'Admitted';
  await patient.save();

  await audit(req, 'CREATE', 'Admissions', `Admitted ${patient.patientId} (${admission.admissionNo})${assessment ? ` based on ${assessment.assessmentNo}` : ''}`);
  req.session.flash = { type: 'ok', text: `${admission.admissionNo} created for ${patient.fullName}.` };
  res.redirect('/admissions');
});

// ---------- DISCHARGE ----------
router.post('/:id/discharge', requirePermission('admitDischarge'), async (req, res) => {
  const admission = await Admission.findById(req.params.id).populate('patient');
  if (!admission || admission.status === 'Discharged') return res.redirect('/admissions');

  admission.status = 'Discharged';
  admission.dischargedAt = new Date();
  await admission.save();
  admission.patient.status = 'Discharged';
  await admission.patient.save();

  await audit(req, 'UPDATE', 'Admissions', `Discharged ${admission.patient.patientId} (${admission.admissionNo})`);
  req.session.flash = { type: 'ok', text: `${admission.patient.fullName} has been discharged.` };
  res.redirect('/admissions');
});

module.exports = router;
