require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const testAdminLogin = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not defined');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if admin exists
    const admin = await User.findOne({ 
      userId: 'A00001',
      isDeleted: false 
    });

    if (!admin) {
      console.log('❌ Admin user with ID A00001 not found!');
      console.log('\nPlease run the seed script first:');
      console.log('   npm run seed:admin\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ Admin user found:');
    console.log(`   User ID: ${admin.userId}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Email: ${admin.email || 'N/A'}`);
    console.log(`   Must Change Password: ${admin.mustChangePassword}`);
    console.log(`   Is Deleted: ${admin.isDeleted}\n`);

    // Test password comparison
    console.log('Testing password comparison...');
    const testPassword = 'eduflex';
    const isMatch = await admin.comparePassword(testPassword);
    
    if (isMatch) {
      console.log('✅ Password "eduflex" matches!\n');
      console.log('You should be able to login with:');
      console.log('   User ID: A00001');
      console.log('   Password: eduflex\n');
    } else {
      console.log('❌ Password "eduflex" does NOT match!');
      console.log('\nPossible issues:');
      console.log('   1. Password was changed after creation');
      console.log('   2. Password was hashed incorrectly');
      console.log('   3. Try running the seed script again\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testAdminLogin();

