const mongoose = require('mongoose');

const tuteAssignmentSchema = new mongoose.Schema({
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
    tute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tute',
        required: true,
    },
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['assigned', 'received'],
        default: 'assigned',
    },
}, {
    timestamps: true,
});

// Index for efficient queries (checking if student has tute)
tuteAssignmentSchema.index({ student: 1, tute: 1 }, { unique: true });
tuteAssignmentSchema.index({ class: 1, tute: 1 });

module.exports = mongoose.model('TuteAssignment', tuteAssignmentSchema);
