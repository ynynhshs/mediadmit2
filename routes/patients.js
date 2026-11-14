const express = require('express');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const Assessment = require('../models/Assessment');
const { nextPatientId } = require('../models/Counter');
const { requirePermission } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
const PAGE_SIZE = 10;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Turns the flat form fields into a Patient document.
function patientFromForm(b) {
  return {
    firstName: b.firstName, middleName: b.middleName, lastName: b.lastName,
    birthDate: b.birthDate, sex: b.sex, civilStatus: b.civilStatus,
    address: b.address, city: b.city, contactNo: b.contactNo, email: b.email,
    emergencyContact: { name: b.ecName, relationship: b.ecRelationship, contactNo: b.ecContactNo },
    medical: {
      bloodType: b.bloodType || '', heightCm: b.heightCm || undefined, weightKg: b.weightKg || undefined,
      allergies: b.allergies, conditions: b.conditions, medications: b.medications, surgeries: b.surgeries,
      smoker: b.smoker === 'yes',
    },
    insurance: { provider: b.provider, memberNo: b.memberNo, hmo: b.hmo, validUntil: b.validUntil || undefined },
  };
}

// ---------- LIST + PROFILE ----------
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const status = req.query.status || '';
  const insurance = req.query.insurance || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { patientId: rx }, { contactNo: rx }];
  }
  if (status) filter.status = status;
  if (insurance) filter['insurance.provider'] = insurance;

  const [total, patients] = await Promise.all([
    Patient.countDocuments(filter),
    Patient.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
  ]);

  let selected = null;
  if (req.query.id) selected = await Patient.findById(req.query.id).catch(() => null);
  if (!selected) selected = patients[0] || null;
  const selectedHasAdmissions = selected ? !!(await Admission.exists({ patient: selected._id }) || await Assessment.exists({ patient: selected._id })) : false;
  const lastAssessment = selected ? await Assessment.findOne({ patient: selected._id }).sort({ assessedAt: -1 }) : null;

  res.render('patients/index', {
    title: 'Patients', patients, selected, selectedHasAdmissions, lastAssessment, q, status, insurance, page, total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), statuses: Patient.STATUSES,
  });
});

// ---------- REGISTER ----------
router.get('/register', requirePermission('registerPatients'), (req, res) => {
  res.render('patients/form', { title: 'Registration', patient: null, error: null, form: {} });
});

router.post('/register', requirePermission('registerPatients'), async (req, res) => {
  try {
    const data = patientFromForm(req.body);
    data.patientId = await nextPatientId();
    data.registeredBy = req.user._id;
    const patient = await Patient.create(data);
    await audit(req, 'CREATE', 'Registration', `Registered new patient ${patient.patientId}`);

    req.session.flash = { type: 'ok', text: `Patient ${patient.fullName} registered with ID ${patient.patientId}.` };
    if (req.body.next === 'assess') return res.redirect(`/assessments/new?patient=${patient._id}`);
    if (req.body.next === 'admit') return res.redirect(`/admissions/new?patient=${patient._id}`);
    res.redirect(`/patients?id=${patient._id}`);
  } catch (err) {
    res.status(400).render('patients/form', { title: 'Registration', patient: null, error: err.message, form: req.body });
  }
});

// ---------- EDIT ----------
router.get('/:id/edit', requirePermission('editPatients'), async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.redirect('/patients');
  res.render('patients/form', { title: 'Patients', patient, error: null, form: {} });
});

router.post('/:id/edit', requirePermission('editPatients'), async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.redirect('/patients');
  try {
    patient.set(patientFromForm(req.body));
    await patient.save();
    await audit(req, 'UPDATE', 'Patients', `Updated record of ${patient.patientId}`);
    req.session.flash = { type: 'ok', text: 'Patient record updated.' };
    res.redirect(`/patients?id=${patient._id}`);
  } catch (err) {
    res.status(400).render('patients/form', { title: 'Patients', patient, error: err.message, form: req.body });
  }
});

// ---------- DELETE (only patients with no admissions, e.g. registered by mistake) ----------
router.post('/:id/delete', requirePermission('editPatients'), async (req, res) => {
  const patient = await Patient.findById(req.params.id).catch(() => null);
  if (!patient) return res.redirect('/patients');
  if (await Admission.exists({ patient: patient._id }) || await Assessment.exists({ patient: patient._id })) {
    req.session.flash = { type: 'err', text: 'This patient has assessment or admission records, so the record is kept for the hospital history and cannot be deleted.' };
    return res.redirect(`/patients?id=${patient._id}`);
  }
  await patient.deleteOne();
  await audit(req, 'DELETE', 'Patients', `Deleted patient record ${patient.patientId} (${patient.fullName})`);
  req.session.flash = { type: 'ok', text: `Patient ${patient.fullName} (${patient.patientId}) was deleted.` };
  res.redirect('/patients');
});

// ---------- HISTORY ----------
router.get('/:id/history', async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.redirect('/patients');
  const admissions = await Admission.find({ patient: patient._id }).populate('assessment').sort({ admittedAt: -1 });
  const assessments = await Assessment.find({ patient: patient._id }).sort({ assessedAt: -1 });
  res.render('patients/history', { title: 'Patients', patient, admissions, assessments });
});

module.exports = router;
