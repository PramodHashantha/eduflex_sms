const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Class = require('../models/Class');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/enrollments
// @desc    Get all enrollments
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { student, class: classId, status, isDeleted } = req.query;
    const query = {};

    // Filters
    if (student) query.student = student;
    if (classId) query.class = classId;
    if (status) query.status = status;

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Teachers can only see enrollments for their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({
        teacher: req.user._id,
        isDeleted: false,
      }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      query.class = { $in: classIds };
    }

    // Students can only see their own enrollments
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const enrollments = await Enrollment.find(query)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/enrollments/:id
// @desc    Get enrollment by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Teachers can only view enrollments for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(enrollment.class._id);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Students can only view their own enrollments
    if (req.user.role === 'student' && enrollment.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/enrollments
// @desc    Create enrollment
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, class: classId } = req.body;

    if (!student || !classId) {
      return res.status(400).json({ message: 'Please provide student and class' });
    }

    // Verify student exists and is a student
    const studentUser = await User.findById(student);
    if (!studentUser || studentUser.role !== 'student' || studentUser.isDeleted) {
      return res.status(400).json({ message: 'Invalid student' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only enroll students in their own classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      student,
      class: classId,
      isDeleted: false,
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return res.status(400).json({ message: 'Student is already enrolled in this class' });
      } else {
        // Reactivate enrollment
        existingEnrollment.status = 'active';
        existingEnrollment.dateJoined = new Date();
        existingEnrollment.dateLeft = undefined;
        await existingEnrollment.save();

        const enrollmentResponse = await Enrollment.findById(existingEnrollment._id)
          .populate('student', 'firstName lastName userId')
          .populate('class', 'className description teacher')
          .populate('class.teacher', 'firstName lastName userId');

        return res.json(enrollmentResponse);
      }
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      student,
      class: classId,
      status: 'active',
      dateJoined: new Date(),
    });

    await enrollment.save();

    const enrollmentResponse = await Enrollment.findById(enrollment._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId');

    res.status(201).json(enrollmentResponse);
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/enrollments/:id
// @desc    Update enrollment
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { status, dateLeft } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Teachers can only update enrollments for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(enrollment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update fields
    if (status) {
      enrollment.status = status;
      if (status === 'inactive' && !enrollment.dateLeft) {
        enrollment.dateLeft = new Date();
      } else if (status === 'active') {
        enrollment.dateLeft = undefined;
      }
    }
    if (dateLeft) enrollment.dateLeft = dateLeft;

    await enrollment.save();

    const enrollmentResponse = await Enrollment.findById(enrollment._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId');

    res.json(enrollmentResponse);
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/enrollments/:id
// @desc    Soft delete enrollment
// @access  Private (Admin, Teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Teachers can only delete enrollments for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(enrollment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    enrollment.isDeleted = true;
    enrollment.deletedAt = new Date();
    enrollment.status = 'deleted';
    await enrollment.save();

    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/enrollments/:id/restore
// @desc    Restore soft-deleted enrollment
// @access  Private (Admin)
router.post('/:id/restore', authenticate, authorize('admin'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    enrollment.isDeleted = false;
    enrollment.deletedAt = undefined;
    enrollment.status = 'active';
    await enrollment.save();

    const enrollmentResponse = await Enrollment.findById(enrollment._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId');

    res.json(enrollmentResponse);
  } catch (error) {
    console.error('Restore enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

