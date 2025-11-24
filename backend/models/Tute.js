const mongoose = require('mongoose');

const tuteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  grade: {
    type: String,
    required: true,
    trim: true,
  },
  month: {
    type: String, // Format: YYYY-MM
    required: true,
  },
  fileUrl: {
    type: String,
  },
  fileName: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Soft delete method
tuteSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Tute', tuteSchema);
