const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/attendance
// @desc    Get all attendance records
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { student, class: classId, sessionDate, startDate, endDate, isDeleted } = req.query;
    const query = {};

    // Filters
    if (student) query.student = student;
    if (classId) query.class = classId;

    if (startDate && endDate) {
      query.sessionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (sessionDate) {
      const date = new Date(sessionDate);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      query.sessionDate = { $gte: startOfDay, $lte: endOfDay };
    }

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Teachers can only see attendance for their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({
        teacher: req.user._id,
        isDeleted: false,
      }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      query.class = { $in: classIds };
    }

    // Students can only see their own attendance
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('markedBy', 'firstName lastName userId')
      .sort({ sessionDate: -1, createdAt: -1 });

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attendance/:id
// @desc    Get attendance by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('markedBy', 'firstName lastName userId');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Teachers can only view attendance for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(attendance.class._id);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Students can only view their own attendance
    if (req.user.role === 'student' && attendance.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/attendance
// @desc    Mark attendance
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { student, class: classId, sessionDate, isPresent, notes } = req.body;

    if (!student || !classId || !sessionDate) {
      return res.status(400).json({ message: 'Please provide student, class, and sessionDate' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only mark attendance for their classes
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

    // Check if attendance already exists for this session
    const sessionDateObj = new Date(sessionDate);
    const startOfDay = new Date(sessionDateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(sessionDateObj.setHours(23, 59, 59, 999));

    const existingAttendance = await Attendance.findOne({
      student,
      class: classId,
      sessionDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false,
    });

    if (existingAttendance) {
      // Update existing record
      existingAttendance.isPresent = isPresent !== undefined ? isPresent : true;
      if (notes !== undefined) existingAttendance.notes = notes;
      await existingAttendance.save();

      const attendanceResponse = await Attendance.findById(existingAttendance._id)
        .populate('student', 'firstName lastName userId')
        .populate('class', 'className description')
        .populate('markedBy', 'firstName lastName userId');

      return res.json(attendanceResponse);
    }

    // Create new attendance record
    const attendance = new Attendance({
      student,
      class: classId,
      sessionDate: new Date(sessionDate),
      isPresent: isPresent !== undefined ? isPresent : true,
      notes,
      markedBy: req.user._id,
    });

    await attendance.save();

    const attendanceResponse = await Attendance.findById(attendance._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('markedBy', 'firstName lastName userId');

    res.status(201).json(attendanceResponse);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/attendance/bulk
// @desc    Mark attendance for multiple students
// @access  Private (Admin, Teacher)
router.post('/bulk', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { class: classId, sessionDate, students } = req.body;

    if (!classId || !sessionDate || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Please provide class, sessionDate, and students array' });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.isDeleted) {
      return res.status(400).json({ message: 'Invalid class' });
    }

    // Teachers can only mark attendance for their classes
    if (req.user.role === 'teacher' && classDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sessionDateObj = new Date(sessionDate);
    const startOfDay = new Date(sessionDateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(sessionDateObj.setHours(23, 59, 59, 999));

    const results = [];

    for (const studentData of students) {
      const { student, isPresent, notes } = studentData;

      // Verify student is enrolled
      const enrollment = await Enrollment.findOne({
        student,
        class: classId,
        status: 'active',
        isDeleted: false,
      });

      if (!enrollment) {
        continue; // Skip if not enrolled
      }

      // Check if attendance already exists
      const existingAttendance = await Attendance.findOne({
        student,
        class: classId,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
        isDeleted: false,
      });

      if (existingAttendance) {
        existingAttendance.isPresent = isPresent !== undefined ? isPresent : true;
        if (notes !== undefined) existingAttendance.notes = notes;
        await existingAttendance.save();
        results.push(existingAttendance);
      } else {
        const attendance = new Attendance({
          student,
          class: classId,
          sessionDate: new Date(sessionDate),
          isPresent: isPresent !== undefined ? isPresent : true,
          notes,
          markedBy: req.user._id,
        });
        await attendance.save();
        results.push(attendance);
      }
    }

    const attendanceResponse = await Attendance.find({
      _id: { $in: results.map((r) => r._id) },
    })
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('markedBy', 'firstName lastName userId');

    res.status(201).json(attendanceResponse);
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { isPresent, notes, sessionDate } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Teachers can only update attendance for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(attendance.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update fields
    if (isPresent !== undefined) attendance.isPresent = isPresent;
    if (notes !== undefined) attendance.notes = notes;
    if (sessionDate) attendance.sessionDate = new Date(sessionDate);

    await attendance.save();

    const attendanceResponse = await Attendance.findById(attendance._id)
      .populate('student', 'firstName lastName userId')
      .populate('class', 'className description')
      .populate('markedBy', 'firstName lastName userId');

    res.json(attendanceResponse);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Soft delete attendance
// @access  Private (Admin, Teacher)
router.delete('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Teachers can only delete attendance for their classes
    if (req.user.role === 'teacher') {
      const classDoc = await Class.findById(attendance.class);
      if (classDoc.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    attendance.isDeleted = true;
    attendance.deletedAt = new Date();
    await attendance.save();

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

