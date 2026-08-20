const mongoose = require('mongoose');

const coverPhotoSubmissionSchema = new mongoose.Schema({
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true,
    index: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  filename: {
    type: String,
    required: true,
    match: /^[A-Za-z0-9._-]+$/,
  },
  note: { type: String, trim: true, maxlength: 240 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'superseded'],
    default: 'pending',
    index: true,
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

coverPhotoSubmissionSchema.index({ establishment: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('CoverPhotoSubmission', coverPhotoSubmissionSchema);

