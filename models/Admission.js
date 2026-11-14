const mongoose = require('mongoose');

const STATUSES = ['Admitted', 'Discharged'];

const admissionSchema = new mongoose.Schema({
  admissionNo: { type: String, required: true, unique: true }, // e.g. ADM-26-0001 (auto-generated)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null }, // assessment that led to this admission
  physician: { type: String, required: [true, 'Admitting physician is required'], trim: true },
  reason: { type: String, required: [true, 'Reason for admission is required'], trim: true },
  notes: { type: String, trim: true, default: '' },
  admittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: STATUSES, default: 'Admitted' },
  dischargedAt: Date,
  admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

admissionSchema.index({ admittedAt: -1 });
admissionSchema.index({ status: 1 });

const Admission = mongoose.model('Admission', admissionSchema, 'admit_admissions');
Admission.STATUSES = STATUSES;
module.exports = Admission;
