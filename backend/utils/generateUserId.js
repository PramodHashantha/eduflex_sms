const User = require('../models/User');

/**
 * Generate unique user ID based on role
 * Format: S00001 for students, T00001 for teachers
 */
const generateUserId = async (role) => {
  if (role === 'student') {
    const prefix = 'S';
    const lastStudent = await User.findOne({
      role: 'student',
      userId: { $regex: `^${prefix}` }
    })
      .sort({ userId: -1 })
      .select('userId');

    if (!lastStudent) {
      return `${prefix}00001`;
    }

    const lastNumber = parseInt(lastStudent.userId.substring(1)) || 0;
    const nextNumber = lastNumber + 1;
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  } else if (role === 'teacher') {
    const prefix = 'T';
    const lastTeacher = await User.findOne({
      role: 'teacher',
      userId: { $regex: `^${prefix}` }
    })
      .sort({ userId: -1 })
      .select('userId');

    if (!lastTeacher) {
      return `${prefix}00001`;
    }

    const lastNumber = parseInt(lastTeacher.userId.substring(1)) || 0;
    const nextNumber = lastNumber + 1;
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  throw new Error('Invalid role for user ID generation');
};

module.exports = generateUserId;

