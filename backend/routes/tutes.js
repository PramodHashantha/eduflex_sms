const express = require('express');
const router = express.Router();
const Tute = require('../models/Tute');
const TuteAssignment = require('../models/TuteAssignment');
const Class = require('../models/Class');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/tutes
// @desc    Get all tutes (Materials)
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { grade, month, isDeleted, search } = req.query;
    const query = {};

    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    if (grade) query.grade = grade;
    if (month) query.month = month;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tutes = await Tute.find(query)
      .populate('createdBy', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(tutes);
  } catch (error) {
    console.error('Get tutes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tutes
// @desc    Create tute (Material)
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { title, description, grade, month, fileUrl, fileName } = req.body;

    if (!title || !grade || !month) {
      return res.status(400).json({ message: 'Please provide title, grade, and month' });
    }

    const tute = new Tute({
      title,
      description,
      grade,
      month,
      fileUrl,
      fileName,
      createdBy: req.user._id,
    });

    await tute.save();
    res.status(201).json(tute);
  } catch (error) {
    console.error('Create tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tutes/:id
// @desc    Update tute
// @access  Private (Admin, Teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const tute = await Tute.findById(req.params.id);
    if (!tute) return res.status(404).json({ message: 'Tute not found' });

    const { title, description, grade, month, fileUrl, fileName } = req.body;

    if (title) tute.title = title;
    if (description !== undefined) tute.description = description;
    if (grade) tute.grade = grade;
    if (month) tute.month = month;
    if (fileUrl !== undefined) tute.fileUrl = fileUrl;
    if (fileName !== undefined) tute.fileName = fileName;

    await tute.save();
    res.json(tute);
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
    if (!tute) return res.status(404).json({ message: 'Tute not found' });

    await tute.softDelete();
    res.json({ message: 'Tute deleted successfully' });
  } catch (error) {
    console.error('Delete tute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tutes/assignments
// @desc    Get tute assignments (History)
// @access  Private
router.get('/assignments', authenticate, async (req, res) => {
  try {
    const { classId, month } = req.query;

    if (!classId) {
      return res.status(400).json({ message: 'Class ID is required' });
    }

    // 1. Get Class to check Grade
    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).json({ message: 'Class not found' });

    // 2. Get Assignments for this class
    // Find Tutes for this Grade (Show ALL tutes for the grade, ignore month)
    const tutes = await Tute.find({
      grade: classDoc.grade,
      isDeleted: false
    });
    const tuteIds = tutes.map(t => t._id);

    // Find Assignments for these tutes in this class
    const assignments = await TuteAssignment.find({
      class: classId,
      tute: { $in: tuteIds }
    }).populate('student', 'firstName lastName userId')
      .populate('tute', 'title');

    res.json({
      tutes,
      assignments
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tutes/assign
// @desc    Bulk assign tutes
// @access  Private (Admin, Teacher)
router.post('/assign', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { classId, tuteId, students, date } = req.body;

    if (!classId || !tuteId || !students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const assignedAt = date ? new Date(date) : new Date();

    const operations = students.map(studentId => ({
      updateOne: {
        filter: { student: studentId, class: classId, tute: tuteId },
        update: {
          $setOnInsert: {
            student: studentId,
            class: classId,
            tute: tuteId,
            status: 'assigned',
            assignedAt: assignedAt
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await TuteAssignment.bulkWrite(operations);
    }

    res.json({ message: 'Tutes assigned successfully' });
  } catch (error) {
    console.error('Assign tutes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tutes/sync
// @desc    Sync tute assignments (Add new, Remove missing)
// @access  Private (Admin, Teacher)
router.post('/sync', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { classId, studentId, tuteIds, date } = req.body;

    if (!classId || !studentId || !Array.isArray(tuteIds)) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const assignedAt = date ? new Date(date) : new Date();

    // Calculate Month Range (to scope deletions to the viewed month)
    const startOfMonth = new Date(assignedAt.getFullYear(), assignedAt.getMonth(), 1);
    const endOfMonth = new Date(assignedAt.getFullYear(), assignedAt.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Find existing assignments for this student/class within the MONTH
    // We scope to month because the UI typically manages/displays a month's view.
    const existingAssignments = await TuteAssignment.find({
      student: studentId,
      class: classId,
      assignedAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 2. Determine Tutes to Remove (Present in DB for this month, but NOT in the new list)
    const toRemove = existingAssignments.filter(a => !tuteIds.includes(a.tute.toString()));

    const operations = [];

    // 3. Add/Update Operations (Upsert)
    // We use upsert to handle the unique constraint (student + tute).
    // $setOnInsert ensures we only set the date if it's a NEW assignment.
    // Existing assignments (even from other months) will be matched and left alone (preserving history).
    tuteIds.forEach(tuteId => {
      operations.push({
        updateOne: {
          filter: { student: studentId, tute: tuteId },
          update: {
            $setOnInsert: {
              student: studentId,
              class: classId,
              tute: tuteId,
              status: 'assigned',
              assignedAt: assignedAt
            }
          },
          upsert: true
        }
      });
    });

    // 4. Delete Operations
    if (toRemove.length > 0) {
      const removeIds = toRemove.map(a => a._id);
      operations.push({
        deleteMany: {
          filter: { _id: { $in: removeIds } }
        }
      });
    }

    if (operations.length > 0) {
      await TuteAssignment.bulkWrite(operations);
    }

    res.json({ message: 'Assignments synced successfully' });
  } catch (error) {
    console.error('Sync tutes error:', error);
    // Handle duplicate key error gracefully if it somehow slips through (though upsert should catch it)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate assignment detected' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
