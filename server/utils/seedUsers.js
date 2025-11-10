import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { config, mongoOptions } from '../config.js';
import User from '../models/User.js';

// Complete user data with phone numbers
const usersData = [
  { username: 'System Admin', email: 'superadmin@system.com', password: 'SuperAdmin@123', phone: '9999999999', role: 'superadmin' },
  { username: 'Ajay Kumar Jha', email: 'ajay@123', password: 'Ajay@123', phone: '6280758617', role: 'employee' },
  { username: 'Sanjiv Mittal', email: 'sanjiv@123', password: 'Sanjiv@123', phone: '9915982900', role: 'employee' },
  { username: 'Pratibha Bedi', email: 'pratibha@123', password: 'Pratibha@123', phone: '9668624803', role: 'employee' },
  { username: 'Gurjeevan Singh', email: 'gurjeevan@123', password: 'Gurjeevan@123', phone: '9417371882', role: 'employee' },
  { username: 'Deepak Kumar Ratra', email: 'deepak@123', password: 'Deepak@123', phone: '9888003348', role: 'employee' },
  { username: 'Lalita Devi', email: 'lalita@123', password: 'Lalita@123', phone: '6284503081', role: 'employee' },
  { username: 'Pardeep Kaushal', email: 'pardeep@123', password: 'Pardeep@123', phone: '9888116684', role: 'employee' },
  { username: 'Jyoti Soni', email: 'jyoti@123', password: 'Jyoti@123', phone: '7087215305', role: 'employee' },
  { username: 'Vishal Khanna', email: 'vishal@123', password: 'Vishal@123', phone: '7973865156', role: 'employee' },
  { username: 'Sunaina Awasthi', email: 'sunaina@123', password: 'Sunaina@123', phone: '9463594707', role: 'admin' },
  { username: 'Satnam Electrical', email: 'satnam@123', password: 'Satnam@123', phone: '9815585518', role: 'employee' },
  { username: 'Ritesh Chaudhary', email: 'ritesh@123', password: 'Ritesh@123', phone: '8126008219', role: 'employee' },
  { username: 'Lovepreet Singh', email: 'lovepreet@123', password: 'Lovepreet@123', phone: '9781001071', role: 'employee' },
  { username: 'Satnam Singh', email: 'satnam.singh@123', password: 'SatnSingh@123', phone: '8968366656', role: 'employee' },
  { username: 'Samdeesh Arora', email: 'samdeesh@123', password: 'Samdeesh@123', phone: '9877580240', role: 'employee' },
  { username: 'Ravandeep Kaur', email: 'ravandeep@123', password: 'Ravandeep@123', phone: '8968743381', role: 'employee' },
  { username: 'Maninder Kaur', email: 'maninder@123', password: 'Maninder@123', phone: '9676366656', role: 'employee' },
  { username: 'Avinash Kumar', email: 'avinash@123', password: 'Avinash@123', phone: '8586926618', role: 'employee' },
  { username: 'Mandeep Singh', email: 'mandeep@123', password: 'Mandeep@123', phone: '9915440801', role: 'employee' },
  { username: 'Suresh Kumar Panjabi', email: 'suresh@123', password: 'Suresh@123', phone: '9622899199', role: 'employee' },
  { username: 'Ragha Malhotra', email: 'ragha@123', password: 'Ragha@123', phone: '9814437119', role: 'employee' },
  { username: 'Vijay Kumar', email: 'vijay@123', password: 'Vijay@123', phone: '8013700111', role: 'employee' },
  { username: 'Amardeep Singh Bains', email: 'amardeep@123', password: 'Amardeep@123', phone: '9501118451', role: 'employee' },
  { username: 'Satnam Jandu', email: 'satnam.jandu@123', password: 'SatnJandu@123', phone: '9004368410', role: 'employee' },
  { username: 'Harbalihar Singh', email: 'harbalihar@123', password: 'Harbalihar@123', phone: '9888946647', role: 'employee' },
  { username: 'Manik Gill', email: 'manik@123', password: 'Manik@123', phone: '7505230701', role: 'employee' },
  { username: 'Akanksha Jaggi', email: 'akanksha@123', password: 'Akanksha@123', phone: '9888490450', role: 'employee' },
  { username: 'Kawaljit Kaur', email: 'kawaljit@123', password: 'Kawaljit@123', phone: '', role: 'employee' },
  { username: 'Lalit Chander', email: 'lalit@123', password: 'Lalit@123', phone: '7009704004', role: 'employee' },
  { username: 'Rajeev Sachdeva', email: 'rajeev@123', password: 'Rajeev@123', phone: '9654296510', role: 'employee' },
  { username: 'Sohalpreet Kaur', email: 'sohalpreet@123', password: 'Sohalpreet@123', phone: '7087215304', role: 'employee' },
  { username: 'Amit Kumar', email: 'amit@123', password: 'Amit@123', phone: '9888989123', role: 'employee' },
  { username: 'Deepak Kumar', email: 'deepak.kumar@123', password: 'DeepakK@123', phone: '9915814908', role: 'employee' },
  { username: 'Manu Sharma', email: 'manu@123', password: 'Manu@123', phone: '8528685660', role: 'employee' },
  { username: 'Karamjit Singh', email: 'karamjit@123', password: 'Karamjit@123', phone: '9780600206', role: 'employee' },
  { username: 'Gaurav Sodhi', email: 'gaurav@123', password: 'Gaurav@123', phone: '9780600201', role: 'employee' },
  { username: 'Rajneet Ghuman', email: 'rajneet@123', password: 'Rajneet@123', phone: '9888320161', role: 'employee' },
  { username: 'Karan Malhotra', email: 'karan@123', password: 'Karan@123', phone: '9678620625', role: 'admin' },
  { username: 'Ashok Malhotra', email: 'ashok@123', password: 'Ashok@123', phone: '9814020625', role: 'admin' },
  { username: 'Test Doer', email: 'test@123', password: 'Test@123', phone: '', role: 'employee' },
  { username: 'Amrinder Singh', email: 'amrinder@123', password: 'Amrinder@123', phone: '9779102555', role: 'employee' },
  { username: 'Mukesh Bharti', email: 'mukesh@123', password: 'Mukesh@123', phone: '9815084000', role: 'employee' },
  { username: 'Surinder Sharma', email: 'surender@123', password: 'Surinder@123', phone: '9988800044', role: 'employee' },
  { username: 'Rakesh Kumar', email: 'rakesh@123', password: 'Rakesh@123', phone: '9915922816', role: 'employee' },
];

// Hash password function
async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
}

// Seed users function
export async function seedUsers() {
  let mongooseConnection = null;

  try {
    console.log('\n========================================');
    console.log('🚀 Starting User Seed');
    console.log('========================================\n');

    console.log(`📍 MongoDB URI: ${config.mongoURI}`);
    console.log('🔄 Connecting to MongoDB...');

    mongooseConnection = await mongoose.connect(config.mongoURI, mongoOptions);
    console.log('✅ Successfully connected to MongoDB\n');

    // Check if users already exist
    const existingCount = await User.countDocuments({});
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing users in database`);
      
      // Check if --force flag is present
      const forceReseed = process.argv.includes('--force');
      
      if (forceReseed) {
        console.log('⚠️  Force flag detected. Deleting all existing users...');
        await User.deleteMany({});
        console.log('✅ All existing users deleted\n');
      } else {
        console.log('❓ Do you want to:');
        console.log('  1. Keep existing users and add new ones');
        console.log('  2. Delete all and reseed (not recommended)\n');
        console.log('⚠️  Running in "add new users" mode...\n');
      }
    }

    let created = 0;
    let skipped = 0;
    let updated = 0;

    console.log('👥 Processing users...\n');

    for (const userData of usersData) {
      try {
        // Check if user exists
        const existingUser = await User.findOne({ username: userData.username });

        if (existingUser) {
          // Update phone number if provided
          if (userData.phone && !existingUser.phoneNumber) {
            await User.findByIdAndUpdate(existingUser._id, {
              phoneNumber: userData.phone,
              email: userData.email
            });
            console.log(`✏️  UPDATED: ${userData.username} - Added phone number ${userData.phone}`);
            updated++;
          } else {
            console.log(`⏭️  SKIPPED: ${userData.username} - Already exists`);
            skipped++;
          }
        } else {
          // Create new user
          const hashedPassword = await hashPassword(userData.password);

          const user = new User({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            phoneNumber: userData.phone || '',
            role: userData.role || 'employee',
            isActive: true,
            permissions: {
              canViewTasks: true,
              canViewAllTeamTasks: userData.role === 'admin',
              canAssignTasks: userData.role === 'admin',
              canDeleteTasks: userData.role === 'admin',
              canEditTasks: true,
              canManageUsers: userData.role === 'admin',
              canEditRecurringTaskSchedules: userData.role === 'admin'
            }
          });

          await user.save();
          console.log(`✅ CREATED: ${userData.username} (${userData.phone || 'No phone'}) - Role: ${userData.role}`);
          created++;
        }
      } catch (error) {
        console.error(`❌ ERROR: ${userData.username} - ${error.message}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`📊 SEED SUMMARY`);
    console.log(`========================================`);
    console.log(`✅ Created: ${created}`);
    console.log(`✏️  Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📁 Total Processed: ${created + updated + skipped}`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

    return { created, updated, skipped, total: created + updated + skipped };

  } catch (error) {
    console.error('\n❌ ============ SEED FAILED ============');
    console.error(`Error: ${error.message}`);
    console.error('==========================================\n');

    if (mongooseConnection) {
      await mongoose.disconnect().catch(() => {});
    }

    process.exit(1);
  }
}

// Run if called directly
seedUsers().then((result) => {
  console.log('🎉 Seed completed successfully!');
  console.log(`Summary: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
  process.exit(0);
}).catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
