const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const generateUserId = require('../utils/generateUserId');

// @route   GET /api/users
// @desc    Get all users (with filters)
// @access  Private (Admin, Teacher)
router.get('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { role, isDeleted, search } = req.query;
    const query = {};

    // Role filter
    if (role) {
      query.role = role;
    }

    // Deleted filter
    if (isDeleted === 'true') {
      query.isDeleted = true;
    } else if (isDeleted === 'false' || !isDeleted) {
      query.isDeleted = false;
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
      ];
    }

    // Teacher can only see students
    if (req.user.role === 'teacher') {
      query.role = 'student';
    }

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'firstName lastName userId')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Teachers can only view students
    if (req.user.role === 'teacher' && user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Students can only view themselves
    if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create user (Admin or Teacher)
// @access  Private (Admin, Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, dateOfBirth, gender, role, password } = req.body;

    if (!firstName || !lastName || !role) {
      return res.status(400).json({ message: 'Please provide firstName, lastName, and role' });
    }

    // Teachers can only create students
    if (req.user.role === 'teacher' && role !== 'student') {
      return res.status(403).json({ message: 'Teachers can only create students' });
    }

    // Only admin can create teachers
    if (role === 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create teachers' });
    }

    // Only admin can create admin
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create admin users' });
    }

    // Generate user ID
    const userId = await generateUserId(role);

    // Create user
    const user = new User({
      userId,
      firstName,
      lastName,
      email,
      mobile,
      dateOfBirth,
      gender,
      role,
      password: password || 'eduflex',
      mustChangePassword: true,
      createdBy: req.user._id,
    });

    await user.save();

    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, dateOfBirth, gender } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Students can only update themselves
    if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Teachers can only update students
    if (req.user.role === 'teacher' && user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;

    await user.save();

    const userResponse = await User.findById(user._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Soft delete user
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cannot delete self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    await user.softDelete();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/:id/restore
// @desc    Restore soft-deleted user
// @access  Private (Admin)
router.post('/:id/restore', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.restore();

    const userResponse = await User.findById(user._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password (Admin only)
// @access  Private (Admin)
router.post('/:id/reset-password', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = 'eduflex';
    user.mustChangePassword = true;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


