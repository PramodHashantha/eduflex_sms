const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/classes
// @desc    Get all classes
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { teacher, isDeleted, search, grade } = req.query;
    console.log('GET /api/classes Query Params:', req.query);
    const query = {};

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Teacher filter
    if (teacher) {
      query.teacher = teacher;
    }

    // Grade filter
    if (grade) {
      query.grade = grade;
    }

    // Search filter
    if (search) {
      query.$or = [
        { className: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Teachers can only see their own classes
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    }

    // Students can only see classes they're enrolled in
    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({
        student: req.user._id,
        status: 'active',
        isDeleted: false,
      }).select('class');
      const classIds = enrollments.map((e) => e.class);
      query._id = { $in: classIds };
    }

    console.log('GET /api/classes MongoDB Query:', query);
    const classes = await Class.find(query)
      .populate('teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id)
      .populate('teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Teachers can only view their own classes
    if (req.user.role === 'teacher' && classDoc.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Students can only view classes they're enrolled in
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        class: req.params.id,
        status: 'active',
        isDeleted: false,
      });
      if (!enrollment) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(classDoc);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/classes
// @desc    Create class
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, description, schedule, teacher, grade } = req.body;

    if (!className) {
      return res.status(400).json({ message: 'Please provide className' });
    }

    if (!grade) {
      return res.status(400).json({ message: 'Please provide grade' });
    }

    // Determine teacher
    let teacherId = teacher;
    if (req.user.role === 'teacher') {
      teacherId = req.user._id;
    }

    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher is required' });
    }

    // Verify teacher exists and is a teacher
    const teacherUser = await User.findById(teacherId);
    if (!teacherUser || teacherUser.role !== 'teacher' || teacherUser.isDeleted) {
      return res.status(400).json({ message: 'Invalid teacher' });
    }

    const classDoc = new Class({
      className,
      description,
      schedule,
      grade,
      teacher: teacherId,
      createdBy: req.user._id,
    });

    await classDoc.save();

    const classResponse = await Class.findById(classDoc._id)
      .populate('teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    res.status(201).json(classResponse);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/classes/:id
// @desc    Update class
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, description, schedule, teacher, grade } = req.body;

    const classDoc = await Class.findById(req.params.id);

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Teachers can only update their own classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    if (className) classDoc.className = className;
    if (description !== undefined) classDoc.description = description;
    if (schedule !== undefined) classDoc.schedule = schedule;
    if (grade) classDoc.grade = grade;

    // Only admin can change teacher
    if (teacher && req.user.role === 'admin') {
      const teacherUser = await User.findById(teacher);
      if (!teacherUser || teacherUser.role !== 'teacher' || teacherUser.isDeleted) {
        return res.status(400).json({ message: 'Invalid teacher' });
      }
      classDoc.teacher = teacher;
    }

    await classDoc.save();

    const classResponse = await Class.findById(classDoc._id)
      .populate('teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    res.json(classResponse);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/classes/:id
// @desc    Soft delete class
// @access  Private (Admin, Teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id);

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Teachers can only delete their own classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await classDoc.softDelete();

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/classes/:id/restore
// @desc    Restore soft-deleted class
// @access  Private (Admin)
router.post('/:id/restore', authenticate, authorize('admin'), async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id);

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    await classDoc.restore();

    const classResponse = await Class.findById(classDoc._id)
      .populate('teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    res.json(classResponse);
  } catch (error) {
    console.error('Restore class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

