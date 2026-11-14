const express = require('express');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const { awaitingAdmission } = require('./assessments');

const router = express.Router();

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

router.get('/', async (req, res) => {
  const today = startOfDay();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const [registeredToday, registeredYesterday, assessedToday, emergencyToday, admittedToday, dischargedToday, currentlyAdmitted] = await Promise.all([
    Patient.countDocuments({ createdAt: { $gte: today } }),
    Patient.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
    Assessment.countDocuments({ assessedAt: { $gte: today } }),
    Assessment.countDocuments({ assessedAt: { $gte: today }, triageLevel: 'Emergency' }),
    Admission.countDocuments({ admittedAt: { $gte: today } }),
    Admission.countDocuments({ dischargedAt: { $gte: today } }),
    Admission.countDocuments({ status: 'Admitted' }),
  ]);

  // Last 7 days: registrations, assessments and admissions
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const from = new Date(today); from.setDate(today.getDate() - i);
    const to = new Date(from); to.setDate(from.getDate() + 1);
    const [r, s, a] = await Promise.all([
      Patient.countDocuments({ createdAt: { $gte: from, $lt: to } }),
      Assessment.countDocuments({ assessedAt: { $gte: from, $lt: to } }),
      Admission.countDocuments({ admittedAt: { $gte: from, $lt: to } }),
    ]);
    days.push({ label: i === 0 ? 'Today' : from.toLocaleDateString('en-US', { weekday: 'short' }), registrations: r, assessments: s, admissions: a });
  }
  const maxDay = Math.max(1, ...days.map((d) => Math.max(d.registrations, d.assessments, d.admissions)));

  // Triage levels of today's assessments
  const triageAgg = await Assessment.aggregate([{ $match: { assessedAt: { $gte: today } } }, { $group: { _id: '$triageLevel', n: { $sum: 1 } } }]);
  const triage = Assessment.TRIAGE.map((t) => ({ level: t, n: (triageAgg.find((x) => x._id === t) || {}).n || 0 }));

  const waiting = (await awaitingAdmission(5));
  const recentAssessments = await Assessment.find({}).populate('patient').sort({ assessedAt: -1 }).limit(5);

  // "Getting started" checklist (shown until the basics are done)
  const [patientCount, assessmentCount, admissionCount, staffCount] = await Promise.all([
    Patient.estimatedDocumentCount(), Assessment.estimatedDocumentCount(), Admission.estimatedDocumentCount(),
    User.countDocuments({ _id: { $ne: req.user._id } }),
  ]);
  const setup = { patients: patientCount > 0, assessments: assessmentCount > 0, admissions: admissionCount > 0, staff: staffCount > 0 };

  const pct = registeredYesterday ? Math.round(((registeredToday - registeredYesterday) / registeredYesterday) * 100) : null;

  res.render('dashboard', {
    title: 'Dashboard',
    stats: { registeredToday, pct, assessedToday, emergencyToday, admittedToday, dischargedToday, currentlyAdmitted },
    days, maxDay, triage, waiting, recentAssessments, setup,
  });
});

module.exports = router;
