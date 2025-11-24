const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/tutes', require('./routes/tutes'));
app.use('/api/assignments', require('./routes/assignments'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'EduFlex API is running' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n⚠️  Authentication failed. Please check:');
      console.error('   1. Your MongoDB username and password in MONGODB_URI');
      console.error('   2. Make sure your IP is whitelisted in MongoDB Atlas');
      console.error('   3. Verify your database user has the correct permissions\n');
    }
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

