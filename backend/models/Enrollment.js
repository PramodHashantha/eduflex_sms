const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  dateJoined: {
    type: Date,
    default: Date.now,
  },
  dateLeft: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
enrollmentSchema.index({ student: 1, class: 1 });
enrollmentSchema.index({ class: 1, status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

