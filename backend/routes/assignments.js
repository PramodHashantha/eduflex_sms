const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Mark = require('../models/Mark');
const Class = require('../models/Class');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/assignments
// @desc    Get all assignments
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { class: classId, isDeleted } = req.query;
    const query = {};

    // Filters
    if (classId) query.class = classId;

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Teachers can only see assignments for their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({
        teacher: req.user._id,
        isDeleted: false,
      }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      query.class = { $in: classIds };
    }

    // Students can only see assignments for classes they're enrolled in
    if (req.user.role === 'student') {
      const Enrollment = require('../models/Enrollment');
      const enrollments = await Enrollment.find({
        student: req.user._id,
        status: 'active',
        isDeleted: false,
      }).select('class');
      const classIds = enrollments.map((e) => e.class);
      query.class = { $in: classIds };
    }

    const assignments = await Assignment.find(query)
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only view assignments for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class._id);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Students can only view assignments for classes they're enrolled in
    if (req.user.role === 'student') {
      const Enrollment = require('../models/Enrollment');
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        class: assignment.class._id,
        status: 'active',
        isDeleted: false,
      });
      if (!enrollment) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(assignment);
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/assignments
// @desc    Create assignment
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { class: classId, title, description, dueDate, totalMarks } = req.body;

    if (!classId || !title) {
      return res.status(400).json({ message: 'Please provide class and title' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only create assignments for their classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignment = new Assignment({
      class: classId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      totalMarks: totalMarks || 100,
      createdBy: req.user._id,
    });

    await assignment.save();

    const assignmentResponse = await Assignment.findById(assignment._id)
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    res.status(201).json(assignmentResponse);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { title, description, dueDate, totalMarks } = req.body;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only update assignments for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update fields
    if (title) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (totalMarks !== undefined) {
      if (totalMarks < 0) {
        return res.status(400).json({ message: 'Total marks must be positive' });
      }
      assignment.totalMarks = totalMarks;
    }

    await assignment.save();

    const assignmentResponse = await Assignment.findById(assignment._id)
      .populate('class', 'className description teacher')
      .populate('class.teacher', 'firstName lastName userId')
      .populate('createdBy', 'firstName lastName userId');

    res.json(assignmentResponse);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/assignments/:id
// @desc    Soft delete assignment
// @access  Private (Admin, Teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only delete assignments for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    assignment.isDeleted = true;
    assignment.deletedAt = new Date();
    await assignment.save();

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/assignments/:id/marks
// @desc    Get marks for an assignment
// @access  Private
router.get('/:id/marks', authenticate, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only view marks for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const query = { assignment: req.params.id, isDeleted: false };

    // Students can only view their own marks
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const marks = await Mark.find(query)
      .populate('student', 'firstName lastName userId')
      .populate('recordedBy', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(marks);
  } catch (error) {
    console.error('Get marks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/assignments/:id/marks
// @desc    Record marks for an assignment
// @access  Private (Admin, Teacher)
router.post('/:id/marks', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, marksObtained, remarks } = req.body;

    if (!student || marksObtained === undefined) {
      return res.status(400).json({ message: 'Please provide student and marksObtained' });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment || assignment.isDeleted) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only record marks for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Validate marks
    if (marksObtained < 0 || marksObtained > assignment.totalMarks) {
      return res.status(400).json({
        message: `Marks must be between 0 and ${assignment.totalMarks}`,
      });
    }

    // Check if mark already exists
    const existingMark = await Mark.findOne({
      student,
      assignment: req.params.id,
      isDeleted: false,
    });

    if (existingMark) {
      // Update existing mark
      existingMark.marksObtained = marksObtained;
      if (remarks !== undefined) existingMark.remarks = remarks;
      await existingMark.save();

      const markResponse = await Mark.findById(existingMark._id)
        .populate('student', 'firstName lastName userId')
        .populate('recordedBy', 'firstName lastName userId');

      return res.json(markResponse);
    }

    // Create new mark
    const mark = new Mark({
      student,
      assignment: req.params.id,
      marksObtained,
      remarks,
      recordedBy: req.user._id,
    });

    await mark.save();

    const markResponse = await Mark.findById(mark._id)
      .populate('student', 'firstName lastName userId')
      .populate('recordedBy', 'firstName lastName userId');

    res.status(201).json(markResponse);
  } catch (error) {
    console.error('Record mark error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/assignments/:id/marks/:markId
// @desc    Update mark
// @access  Private (Admin, Teacher)
router.put('/:id/marks/:markId', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { marksObtained, remarks } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || assignment.isDeleted) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const mark = await Mark.findById(req.params.markId);
    if (!mark || mark.isDeleted) {
      return res.status(404).json({ message: 'Mark not found' });
    }

    // Teachers can only update marks for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update fields
    if (marksObtained !== undefined) {
      if (marksObtained < 0 || marksObtained > assignment.totalMarks) {
        return res.status(400).json({
          message: `Marks must be between 0 and ${assignment.totalMarks}`,
        });
      }
      mark.marksObtained = marksObtained;
    }
    if (remarks !== undefined) mark.remarks = remarks;

    await mark.save();

    const markResponse = await Mark.findById(mark._id)
      .populate('student', 'firstName lastName userId')
      .populate('recordedBy', 'firstName lastName userId');

    res.json(markResponse);
  } catch (error) {
    console.error('Update mark error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/assignments/:id/marks/:markId
// @desc    Soft delete mark
// @access  Private (Admin, Teacher)
router.delete('/:id/marks/:markId', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || assignment.isDeleted) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const mark = await Mark.findById(req.params.markId);
    if (!mark || mark.isDeleted) {
      return res.status(404).json({ message: 'Mark not found' });
    }

    // Teachers can only delete marks for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(assignment.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    mark.isDeleted = true;
    mark.deletedAt = new Date();
    await mark.save();

    res.json({ message: 'Mark deleted successfully' });
  } catch (error) {
    console.error('Delete mark error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

