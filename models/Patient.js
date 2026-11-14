const mongoose = require('mongoose');

const STATUSES = ['Outpatient', 'Admitted', 'Discharged'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true }, // e.g. PT-2026-01483 (auto-generated)

  // Personal information
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  middleName: { type: String, trim: true, default: '' },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true },
  birthDate: { type: Date, required: [true, 'Birthdate is required'] },
  sex: { type: String, enum: ['Male', 'Female'], required: [true, 'Sex is required'] },
  civilStatus: { type: String, enum: ['Single', 'Married', 'Widowed', 'Separated'], default: 'Single' },

  // Contact details
  address: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  contactNo: { type: String, trim: true, required: [true, 'Contact number is required'] },
  email: { type: String, trim: true, lowercase: true, default: '' },

  // Emergency contact
  emergencyContact: {
    name: { type: String, trim: true, required: [true, 'Emergency contact name is required'] },
    relationship: { type: String, trim: true, default: '' },
    contactNo: { type: String, trim: true, required: [true, 'Emergency contact number is required'] },
  },

  // Medical history
  medical: {
    bloodType: { type: String, enum: [...BLOOD_TYPES, ''], default: '' },
    heightCm: Number,
    weightKg: Number,
    allergies: { type: String, trim: true, default: '' },
    conditions: { type: String, trim: true, default: '' },
    medications: { type: String, trim: true, default: '' },
    surgeries: { type: String, trim: true, default: '' },
    smoker: { type: Boolean, default: false },
  },

  // Insurance details
  insurance: {
    provider: { type: String, trim: true, default: 'None' },
    memberNo: { type: String, trim: true, default: '' },
    hmo: { type: String, trim: true, default: '' },
    validUntil: Date,
  },

  status: { type: String, enum: STATUSES, default: 'Outpatient' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

patientSchema.virtual('fullName').get(function () {
  const mi = this.middleName ? ` ${this.middleName[0]}.` : '';
  return `${this.firstName}${mi} ${this.lastName}`;
});
patientSchema.virtual('initials').get(function () {
  return `${(this.firstName || '?')[0]}${(this.lastName || '')[0] || ''}`.toUpperCase();
});
patientSchema.virtual('age').get(function () {
  if (!this.birthDate) return null;
  const now = new Date(); const b = this.birthDate;
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
});

patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ createdAt: -1 });

const Patient = mongoose.model('Patient', patientSchema);
Patient.STATUSES = STATUSES;
Patient.BLOOD_TYPES = BLOOD_TYPES;
module.exports = Patient;
