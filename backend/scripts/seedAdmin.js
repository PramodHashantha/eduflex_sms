require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not defined in environment variables');
      console.error('Please create a .env file in the backend directory with your MongoDB connection string');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      role: 'admin', 
      isDeleted: false 
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   User ID: ${existingAdmin.userId}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log('\nIf you want to create a new admin, please delete or soft-delete the existing one first.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    // Note: Password will be automatically hashed by User model's pre-save hook
    const admin = new User({
      userId: 'A00001', // Admin ID format
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@eduflex.com',
      role: 'admin',
      password: 'eduflex', // Default password - will be hashed automatically
      mustChangePassword: true, // Force password change on first login
      isDeleted: false,
    });

    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   User ID: A00001');
    console.log('   Name: Admin User');
    console.log('   Email: admin@eduflex.com');
    console.log('   Password: eduflex');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Login with User ID: A00001 and Password: eduflex');
    console.log('   2. You will be required to change your password on first login');
    console.log('   3. After logging in, you can create more admin, teacher, and student accounts');
    console.log('   4. Consider changing the default password in production!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('   User ID A00001 already exists. Please delete it first or use a different ID.');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedAdmin();


