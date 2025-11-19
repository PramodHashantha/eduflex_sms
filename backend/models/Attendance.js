const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  sessionDate: {
    type: Date,
    required: true,
  },
  isPresent: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
attendanceSchema.index({ student: 1, class: 1, sessionDate: 1 });
attendanceSchema.index({ class: 1, sessionDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

