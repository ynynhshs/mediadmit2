const mongoose = require('mongoose');

// Keeps running numbers so Patient IDs and Admission numbers are unique and sequential
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', counterSchema, 'admit_counters');

async function nextSeq(name) {
  const c = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

// PT-2026-01483
async function nextPatientId() {
  const year = new Date().getFullYear();
  const n = await nextSeq(`patient-${year}`);
  return `PT-${year}-${String(n).padStart(5, '0')}`;
}

// ADM-26-0915
async function nextAdmissionNo() {
  const yy = String(new Date().getFullYear()).slice(-2);
  const n = await nextSeq(`admission-${yy}`);
  return `ADM-${yy}-${String(n).padStart(4, '0')}`;
}

// ASM-26-0001
async function nextAssessmentNo() {
  const yy = String(new Date().getFullYear()).slice(-2);
  const n = await nextSeq(`assessment-${yy}`);
  return `ASM-${yy}-${String(n).padStart(4, '0')}`;
}

module.exports = { Counter, nextSeq, nextPatientId, nextAdmissionNo, nextAssessmentNo };
