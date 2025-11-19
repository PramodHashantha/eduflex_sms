const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Class = require('../models/Class');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/fees
// @desc    Get all fee records
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { student, class: classId, status, paymentType, isDeleted } = req.query;
    const query = {};

    // Filters
    if (student) query.student = student;
    if (classId) query.class = classId;
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Teachers can only see fees for their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({
        teacher: req.user._id,
        isDeleted: false,
      }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      query.class = { $in: classIds };
    }

    // Students can only see their own fees
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const fees = await Fee.find(query)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('recordedBy', 'firstName lastName userId')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.json(fees);
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/fees/:id
// @desc    Get fee by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('recordedBy', 'firstName lastName userId');

    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    // Teachers can only view fees for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(fee.class._id);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Students can only view their own fees
    if (req.user.role === 'student' && fee.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(fee);
  } catch (error) {
    console.error('Get fee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/fees
// @desc    Record fee payment
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, class: classId, paymentType, amount, paymentDate, dueDate, status, notes } = req.body;

    if (!student || !classId || !paymentType || !amount) {
      return res.status(400).json({ message: 'Please provide student, class, paymentType, and amount' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only record fees for their classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify student is enrolled
    const enrollment = await Enrollment.findOne({
      student,
      class: classId,
      status: 'active',
      isDeleted: false,
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'Student is not enrolled in this class' });
    }

    // Validate payment type
    if (!['daily', 'per-session', 'monthly'].includes(paymentType)) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }

    // Validate amount
    if (amount < 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    const fee = new Fee({
      student,
      class: classId,
      paymentType,
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: status || 'pending',
      notes,
      recordedBy: req.user._id,
    });

    await fee.save();

    const feeResponse = await Fee.findById(fee._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('recordedBy', 'firstName lastName userId');

    res.status(201).json(feeResponse);
  } catch (error) {
    console.error('Record fee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/fees/:id
// @desc    Update fee record
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { paymentType, amount, paymentDate, dueDate, status, notes } = req.body;

    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    // Teachers can only update fees for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(fee.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update fields
    if (paymentType) fee.paymentType = paymentType;
    if (amount !== undefined) {
      if (amount < 0) {
        return res.status(400).json({ message: 'Amount must be positive' });
      }
      fee.amount = amount;
    }
    if (paymentDate) fee.paymentDate = new Date(paymentDate);
    if (dueDate !== undefined) fee.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (status) fee.status = status;
    if (notes !== undefined) fee.notes = notes;

    await fee.save();

    const feeResponse = await Fee.findById(fee._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('recordedBy', 'firstName lastName userId');

    res.json(feeResponse);
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/fees/:id
// @desc    Soft delete fee record
// @access  Private (Admin, Teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    // Teachers can only delete fees for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(fee.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    fee.isDeleted = true;
    fee.deletedAt = new Date();
    await fee.save();

    res.json({ message: 'Fee record deleted successfully' });
  } catch (error) {
    console.error('Delete fee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

