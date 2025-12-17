// src/models/LabResult.js
const mongoose = require('mongoose');

const LabResultSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    uploadedBy: { // Tracks who uploaded the file (Patient or Practitioner)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    title: {
        type: String,
        required: [true, 'Please add a title for the report']
    },
    dateTaken: { // The date the lab test was performed
        type: Date,
        required: true,
    },
    fileUrl: { // Link to the stored file (e.g., S3 URL, local path)
        type: String,
        required: true,
    },
    notes: String, // Any context provided by the uploader
}, { timestamps: true });

module.exports = mongoose.model('LabResult', LabResultSchema);