import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { config, mongoOptions } from '../config.js';
import User from '../models/User.js';

dotenv.config();

const hrUserData = {
  username: "HR User",
  email: "hr@amgrealty.in",
  password: "hrpassword123", // This will be hashed by the User model's pre-save hook
  role: "employee",
  permissions: {
    // Standard permissions
    canViewTasks: true,
    canViewAllTeamTasks: false,
    canAssignTasks: true,
    canDeleteTasks: false,
    canEditTasks: false,
    canManageUsers: false,
    canEditRecurringTaskSchedules: false,
    canCompleteTasksOnBehalf: false,
    // The special HR permission
    canManageStationery: true
  }
};

const seedHRUser = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI, mongoOptions);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: hrUserData.email });
    
    if (existingUser) {
      console.log(`ℹ️  HR User (${hrUserData.email}) already exists.`);
      console.log('');
      console.log('Existing user details:');
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Can Manage Stationery: ${existingUser.permissions.canManageStationery}`);
      console.log('');
      
      // Update the permission if it doesn't exist
      if (!existingUser.permissions.canManageStationery) {
        existingUser.permissions.canManageStationery = true;
        await existingUser.save();
        console.log('✅ Updated existing user with canManageStationery permission');
      }
      
      return;
    }

    // Create and save new user
    console.log('Creating new HR user...');
    const newUser = new User(hrUserData);
    await newUser.save(); // The pre-save hook in User.js will hash the password

    console.log('');
    console.log('✅ ================================================');
    console.log('✅ HR User created successfully!');
    console.log('✅ ================================================');
    console.log('');
    console.log('Login credentials for HR Portal (http://localhost:5174):');
    console.log(`   Email/Username: ${hrUserData.email} or ${hrUserData.username}`);
    console.log(`   Password: ${hrUserData.password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the password after first login!');
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding HR user:', error.message);
    if (error.code === 11000) {
      console.error('   This error typically means the user already exists.');
    }
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

seedHRUser();

