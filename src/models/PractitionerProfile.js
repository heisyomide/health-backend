// src/models/PractitionerProfile.js
const mongoose = require('mongoose');

const PractitionerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    specialization: {
      type: String,
      enum: [
        'General Practice',
        'Pediatrics',
        'Cardiology',
        'Mental Health',
        'Other'
      ],
      required: true
    },

    licenseNumber: { type: String, unique: true },
    ninNumber: { type: String, unique: true },

    phoneNumber: String,
    address: String,
    hospitalAffiliation: String,
    bio: String,

    licenseDocument: String,

    nextOfKin: {
      name: String,
      phone: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'PractitionerProfile',
  PractitionerProfileSchema
);