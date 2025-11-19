const express = require('express');
const router = express.Router();
const Tute = require('../models/Tute');
const Class = require('../models/Class');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/tutes
// @desc    Get all tutes
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { student, class: classId, month, year, isDeleted } = req.query;
    const query = {};

    // Filters
    if (student) query.student = student;
    if (classId) query.class = classId;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Teachers can only see tutes for their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({
        teacher: req.user._id,
        isDeleted: false,
      }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      query.class = { $in: classIds };
    }

    // Students can only see their own tutes
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const tutes = await Tute.find(query)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('assignedBy', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(tutes);
  } catch (error) {
    console.error('Get tutes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tutes/:id
// @desc    Get tute by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tute = await Tute.findById(req.params.id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('assignedBy', 'firstName lastName userId');

    if (!tute) {
      return res.status(404).json({ message: 'Tute not found' });
    }

    // Teachers can only view tutes for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(tute.class._id);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Students can only view their own tutes
    if (req.user.role === 'student' && tute.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(tute);
  } catch (error) {
    console.error('Get tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tutes
// @desc    Assign tute
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, class: classId, title, description, month, year, fileUrl, fileName } = req.body;

    if (!student || !classId || !title) {
      return res.status(400).json({ message: 'Please provide student, class, and title' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only assign tutes for their classes
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

    const tute = new Tute({
      student,
      class: classId,
      title,
      description,
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      fileUrl,
      fileName,
      assignedBy: req.user._id,
    });

    await tute.save();

    const tuteResponse = await Tute.findById(tute._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('assignedBy', 'firstName lastName userId');

    res.status(201).json(tuteResponse);
  } catch (error) {
    console.error('Assign tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tutes/bulk
// @desc    Assign tutes to multiple students
// @access  Private (Admin, Teacher)
router.post('/bulk', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { class: classId, title, description, month, year, fileUrl, fileName, students } = req.body;

    if (!classId || !title) {
      return res.status(400).json({ message: 'Please provide class and title' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only assign tutes for their classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If students array is provided, use it; otherwise assign to all enrolled students
    let studentIds = students;
    if (!studentIds || studentIds.length === 0) {
      const enrollments = await Enrollment.find({
        class: classId,
        status: 'active',
        isDeleted: false,
      }).select('student');
      studentIds = enrollments.map((e) => e.student);
    }

    const results = [];

    for (const studentId of studentIds) {
      // Verify student is enrolled
      const enrollment = await Enrollment.findOne({
        student: studentId,
        class: classId,
        status: 'active',
        isDeleted: false,
      });

      if (!enrollment) {
        continue; // Skip if not enrolled
      }

      const tute = new Tute({
        student: studentId,
        class: classId,
        title,
        description,
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
        fileUrl,
        fileName,
        assignedBy: req.user._id,
      });

      await tute.save();
      results.push(tute);
    }

    const tuteResponse = await Tute.find({
      _id: { $in: results.map((r) => r._id) },
    })
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('assignedBy', 'firstName lastName userId');

    res.status(201).json(tuteResponse);
  } catch (error) {
    console.error('Bulk assign tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tutes/:id
// @desc    Update tute
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { title, description, month, year, fileUrl, fileName } = req.body;

    const tute = await Tute.findById(req.params.id);

    if (!tute) {
      return res.status(404).json({ message: 'Tute not found' });
    }

    // Teachers can only update tutes for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(tute.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update fields
    if (title) tute.title = title;
    if (description !== undefined) tute.description = description;
    if (month !== undefined) tute.month = month ? parseInt(month) : undefined;
    if (year !== undefined) tute.year = year ? parseInt(year) : undefined;
    if (fileUrl !== undefined) tute.fileUrl = fileUrl;
    if (fileName !== undefined) tute.fileName = fileName;

    await tute.save();

    const tuteResponse = await Tute.findById(tute._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('assignedBy', 'firstName lastName userId');

    res.json(tuteResponse);
  } catch (error) {
    console.error('Update tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/tutes/:id
// @desc    Soft delete tute
// @access  Private (Admin, Teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const tute = await Tute.findById(req.params.id);

    if (!tute) {
      return res.status(404).json({ message: 'Tute not found' });
    }

    // Teachers can only delete tutes for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(tute.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    tute.isDeleted = true;
    tute.deletedAt = new Date();
    await tute.save();

    res.json({ message: 'Tute deleted successfully' });
  } catch (error) {
    console.error('Delete tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

