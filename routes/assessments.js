const express = require('express');
const Assessment = require('../models/Assessment');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const { nextAssessmentNo } = require('../models/Counter');
const { requirePermission } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
const PAGE_SIZE = 10;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

// Turns the form fields into an Assessment document
function fromForm(b) {
  const n = (x) => (x === '' || x == null ? undefined : Number(x));
  return {
    chiefComplaint: b.chiefComplaint, historyOfIllness: b.historyOfIllness, painScore: n(b.painScore),
    vitals: {
      bpSystolic: n(b.bpSystolic), bpDiastolic: n(b.bpDiastolic), heartRate: n(b.heartRate),
      respiratoryRate: n(b.respiratoryRate), temperature: n(b.temperature), spo2: n(b.spo2),
      weightKg: n(b.weightKg), heightCm: n(b.heightCm),
    },
    consciousness: b.consciousness, physicalExam: b.physicalExam,
    triageLevel: b.triageLevel, impression: b.impression, recommendation: b.recommendation, plan: b.plan,
  };
}

// Mongoose validation errors → one readable sentence
const errText = (err) => (err.errors ? Object.values(err.errors).map((e) => e.message).join(' ') : err.message);

// Patients waiting for admission: last assessment says "For Admission" and they are not admitted
async function awaitingAdmission(limit = 50) {
  const recent = await Assessment.find({ recommendation: 'For Admission', assessedAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
    .populate('patient').sort({ assessedAt: -1 }).limit(200);
  const seen = new Set(); const out = [];
  for (const a of recent) {
    if (!a.patient || seen.has(String(a.patient._id))) continue;
    seen.add(String(a.patient._id));
    if (a.patient.status === 'Admitted') continue;
    if (await Admission.exists({ assessment: a._id })) continue;
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- LIST ----------
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const triage = req.query.triage || '';
  const recommendation = req.query.recommendation || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const filter = {};
  if (triage) filter.triageLevel = triage;
  if (recommendation) filter.recommendation = recommendation;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const ids = await Patient.find({ $or: [{ firstName: rx }, { lastName: rx }, { patientId: rx }] }).distinct('_id');
    filter.$or = [{ patient: { $in: ids } }, { assessmentNo: rx }, { chiefComplaint: rx }, { impression: rx }];
  }

  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [total, assessments, assessedToday, emergencyToday, thisMonth, waiting] = await Promise.all([
    Assessment.countDocuments(filter),
    Assessment.find(filter).populate('patient').sort({ assessedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    Assessment.countDocuments({ assessedAt: { $gte: today } }),
    Assessment.countDocuments({ assessedAt: { $gte: today }, triageLevel: 'Emergency' }),
    Assessment.countDocuments({ assessedAt: { $gte: monthStart } }),
    awaitingAdmission(),
  ]);

  res.render('assessments/index', {
    title: 'Assessments', assessments, q, triage, recommendation, page, total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    TRIAGE: Assessment.TRIAGE, RECOMMENDATIONS: Assessment.RECOMMENDATIONS,
    stats: { assessedToday, emergencyToday, thisMonth, waiting: waiting.length },
  });
});

// ---------- NEW ----------
async function renderForm(res, { assessment = null, error = null, form = {}, selectedPatient = '' } = {}) {
  const patients = assessment ? [] : await Patient.find({}).sort({ createdAt: -1 }).limit(300);
  const sel = assessment ? assessment.patient : (selectedPatient ? await Patient.findById(selectedPatient).catch(() => null) : null);
  const last = sel ? await Assessment.findOne({ patient: sel._id, ...(assessment ? { _id: { $ne: assessment._id } } : {}) }).sort({ assessedAt: -1 }) : null;
  res.status(error ? 400 : 200).render('assessments/form', {
    title: 'Assessments', assessment, error, form, patients, patient: sel, last,
    selectedPatient: sel ? String(sel._id) : '',
    TRIAGE: Assessment.TRIAGE, CONSCIOUSNESS: Assessment.CONSCIOUSNESS, RECOMMENDATIONS: Assessment.RECOMMENDATIONS,
  });
}

router.get('/new', requirePermission('assessPatients'), (req, res) => renderForm(res, { selectedPatient: req.query.patient || '' }));

router.post('/new', requirePermission('assessPatients'), async (req, res) => {
  const patient = await Patient.findById(req.body.patient).catch(() => null);
  if (!patient) return renderForm(res, { error: 'Please select a patient.', form: req.body });
  try {
    const a = await Assessment.create({
      ...fromForm(req.body), assessmentNo: await nextAssessmentNo(), patient: patient._id,
      assessedBy: req.user._id, assessorName: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
    });
    await audit(req, 'CREATE', 'Assessments', `Assessed ${patient.patientId} (${a.assessmentNo}) — ${a.triageLevel}, ${a.recommendation}`);
    req.session.flash = { type: 'ok', text: `Assessment ${a.assessmentNo} saved for ${patient.fullName}.` };
    if (req.body.next === 'admit') return res.redirect(`/admissions/new?patient=${patient._id}&assessment=${a._id}`);
    res.redirect(`/assessments/${a._id}`);
  } catch (err) {
    renderForm(res, { error: errText(err), form: req.body, selectedPatient: patient._id });
  }
});

// ---------- VIEW (printable) ----------
router.get('/:id', async (req, res, next) => {
  const a = await Assessment.findById(req.params.id).populate('patient').catch(() => null);
  if (!a) return next();
  const admission = await Admission.findOne({ assessment: a._id });
  const history = await Assessment.find({ patient: a.patient._id, _id: { $ne: a._id } }).sort({ assessedAt: -1 }).limit(5);
  res.render('assessments/view', { title: 'Assessments', a, admission, history });
});

// ---------- EDIT ----------
router.get('/:id/edit', requirePermission('assessPatients'), async (req, res, next) => {
  const a = await Assessment.findById(req.params.id).populate('patient').catch(() => null);
  if (!a) return next();
  renderForm(res, { assessment: a });
});

router.post('/:id/edit', requirePermission('assessPatients'), async (req, res, next) => {
  const a = await Assessment.findById(req.params.id).populate('patient').catch(() => null);
  if (!a) return next();
  try {
    a.set(fromForm(req.body));
    await a.save();
    await audit(req, 'UPDATE', 'Assessments', `Updated assessment ${a.assessmentNo} of ${a.patient.patientId}`);
    req.session.flash = { type: 'ok', text: 'Assessment updated.' };
    res.redirect(`/assessments/${a._id}`);
  } catch (err) {
    renderForm(res, { assessment: a, error: errText(err), form: req.body });
  }
});

module.exports = router;
module.exports.awaitingAdmission = awaitingAdmission;
