import mongoose from 'mongoose';
import { config, mongoOptions } from '../config.js';
import User from '../models/User.js';

// User phone number data from the provided list
const userPhoneData = [
  { username: 'Ajay Kumar Jha', phone: '6280758617' },
  { username: 'Sanjiv Mittal', phone: '9915982900' },
  { username: 'Pratibha Bedi', phone: '9668624803' },
  { username: 'Gurjeevan Singh', phone: '9417371882' },
  { username: 'Deepak Kumar Ratra', phone: '9888003348' },
  { username: 'Lalita Devi', phone: '6284503081' },
  { username: 'Pardeep Kaushal', phone: '9888116684' },
  { username: 'Jyoti Soni', phone: '7087215305' },
  { username: 'Vishal Khanna', phone: '7973865156' },
  { username: 'Sunaina Awasthi', phone: '9463594707' },
  { username: 'Satnam Electrical', phone: '9815585518' },
  { username: 'Ritesh Chaudhary', phone: '8126008219' },
  { username: 'Lovepreet Singh', phone: '9781001071' },
  { username: 'Satnam Singh', phone: '8968366656' },
  { username: 'Samdeesh Arora', phone: '9877580240' },
  { username: 'Ravandeep Kaur', phone: '8968743381' },
  { username: 'Maninder Kaur', phone: '9676366656' },
  { username: 'Avinash Kumar', phone: '8586926618' },
  { username: 'Mandeep Singh', phone: '9915440801' },
  { username: 'Suresh Kumar Panjabi', phone: '9622899199' },
  { username: 'Ragha Malhotra', phone: '9814437119' },
  { username: 'Vijay Kumar', phone: '8013700111' },
  { username: 'Amardeep Singh Bains', phone: '9501118451' },
  { username: 'Satnam Jandu', phone: '9004368410' },
  { username: 'Harbalihar Singh', phone: '9888946647' },
  { username: 'Manik Gill', phone: '7505230701' },
  { username: 'Akanksha Jaggi', phone: '9888490450' },
  { username: 'Kawaljit Kaur', phone: '' },
  { username: 'Lalit Chander', phone: '7009704004' },
  { username: 'Rajeev Sachdeva', phone: '9654296510' },
  { username: 'Sohalpreet Kaur', phone: '7087215304' },
  { username: 'Amit Kumar', phone: '9888989123' },
  { username: 'Deepak Kumar', phone: '9915814908' },
  { username: 'Manu Sharma', phone: '8528685660' },
  { username: 'Karamjit Singh', phone: '9780600206' },
  { username: 'Gaurav Sodhi', phone: '9780600201' },
  { username: 'Rajneet Ghuman', phone: '9888320161' },
  { username: 'Karan Malhotra', phone: '9678620625' },
  { username: 'Ashok Malhotra', phone: '9814020625' },
  { username: 'Test Doer', phone: '' },
  { username: 'Amrinder Singh', phone: '9779102555' },
  { username: 'Mukesh Bharti', phone: '9815084000' },
  { username: 'Surinder Sharma', phone: '9988800044' },
  { username: 'Rakesh Kumar', phone: '9915922816' },
];

async function updateUserPhoneNumbers() {
  let mongooseConnection = null;

  try {
    console.log('\n========================================');
    console.log('🚀 Starting User Phone Number Update');
    console.log('========================================\n');

    console.log(`📍 MongoDB URI: ${config.mongoURI}`);
    console.log('🔄 Connecting to MongoDB...');

    mongooseConnection = await mongoose.connect(config.mongoURI, mongoOptions);
    console.log('✅ Successfully connected to MongoDB\n');

    let updated = 0;
    let notFound = 0;
    let skipped = 0;

    console.log('📝 Updating user phone numbers...\n');

    for (const userData of userPhoneData) {
      try {
        if (!userData.phone) {
          console.log(`⏭️  SKIPPED: ${userData.username} - No phone number provided`);
          skipped++;
          continue;
        }

        const user = await User.findOneAndUpdate(
          { username: userData.username },
          { phoneNumber: userData.phone },
          { new: true }
        );

        if (user) {
          console.log(`✅ UPDATED: ${userData.username} → ${userData.phone}`);
          updated++;
        } else {
          console.log(`❌ NOT FOUND: ${userData.username}`);
          notFound++;
        }
      } catch (error) {
        console.error(`❌ ERROR: ${userData.username} - ${error.message}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`📊 UPDATE SUMMARY`);
    console.log(`========================================`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Not Found: ${notFound}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📁 Total Processed: ${updated + notFound + skipped}`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('\n❌ ============ UPDATE FAILED ============');
    console.error(`Error: ${error.message}`);
    console.error('==========================================\n');

    if (mongooseConnection) {
      await mongoose.disconnect().catch(() => {});
    }

    process.exit(1);
  }
}

// Run the update
updateUserPhoneNumbers().then(() => {
  console.log('🎉 Phone number update completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Update failed:', error.message);
  process.exit(1);
});
