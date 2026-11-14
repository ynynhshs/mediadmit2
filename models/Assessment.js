const mongoose = require('mongoose');

const TRIAGE = ['Emergency', 'Urgent', 'Non-Urgent'];
const CONSCIOUSNESS = ['Alert', 'Responds to Voice', 'Responds to Pain', 'Unresponsive']; // AVPU scale
const RECOMMENDATIONS = ['For Admission', 'Outpatient Treatment', 'Referral to Another Facility', 'Sent Home'];

const num = (min, max, label) => ({
  type: Number, min: [min, `${label} must be at least ${min}`], max: [max, `${label} must be at most ${max}`],
});

const assessmentSchema = new mongoose.Schema({
  assessmentNo: { type: String, required: true, unique: true }, // e.g. ASM-26-0001 (auto-generated)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  assessedAt: { type: Date, default: Date.now },
  assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assessorName: { type: String, default: '' },   // name + role at the time, e.g. "Uriel Gamba (Nurse)"

  // Subjective
  chiefComplaint: { type: String, required: [true, 'Chief complaint is required'], trim: true },
  historyOfIllness: { type: String, trim: true, default: '' },
  painScore: num(0, 10, 'Pain score'),

  // Vital signs
  vitals: {
    bpSystolic: num(40, 300, 'Systolic BP'),
    bpDiastolic: num(20, 200, 'Diastolic BP'),
    heartRate: num(20, 250, 'Heart rate'),
    respiratoryRate: num(4, 80, 'Respiratory rate'),
    temperature: num(30, 45, 'Temperature'),
    spo2: num(50, 100, 'Oxygen saturation'),
    weightKg: num(1, 400, 'Weight'),
    heightCm: num(20, 250, 'Height'),
  },

  // Objective
  consciousness: { type: String, enum: CONSCIOUSNESS, default: 'Alert' },
  physicalExam: { type: String, trim: true, default: '' },

  // Assessment and plan
  triageLevel: { type: String, enum: TRIAGE, required: [true, 'Triage level is required'] },
  impression: { type: String, required: [true, 'Initial impression / diagnosis is required'], trim: true },
  recommendation: { type: String, enum: RECOMMENDATIONS, required: [true, 'Recommendation is required'] },
  plan: { type: String, trim: true, default: '' },
}, { timestamps: true });

assessmentSchema.index({ assessedAt: -1 });
assessmentSchema.index({ patient: 1, assessedAt: -1 });

// Body Mass Index from weight and height (not stored)
assessmentSchema.virtual('bmi').get(function () {
  const v = this.vitals || {};
  if (!v.weightKg || !v.heightCm) return null;
  return +(v.weightKg / ((v.heightCm / 100) ** 2)).toFixed(1);
});

// Which vital signs are outside the normal adult range (used to show them in red)
assessmentSchema.methods.flags = function () {
  const v = this.vitals || {};
  const f = {};
  if (v.bpSystolic >= 140 || v.bpDiastolic >= 90 || (v.bpSystolic && v.bpSystolic < 90)) f.bp = true;
  if (v.heartRate > 100 || (v.heartRate && v.heartRate < 60)) f.heartRate = true;
  if (v.respiratoryRate > 20 || (v.respiratoryRate && v.respiratoryRate < 12)) f.respiratoryRate = true;
  if (v.temperature >= 37.5 || (v.temperature && v.temperature < 36)) f.temperature = true;
  if (v.spo2 && v.spo2 < 95) f.spo2 = true;
  if (this.painScore >= 7) f.pain = true;
  return f;
};

const Assessment = mongoose.model('Assessment', assessmentSchema, 'admit_assessments');
Assessment.TRIAGE = TRIAGE;
Assessment.CONSCIOUSNESS = CONSCIOUSNESS;
Assessment.RECOMMENDATIONS = RECOMMENDATIONS;
module.exports = Assessment;
