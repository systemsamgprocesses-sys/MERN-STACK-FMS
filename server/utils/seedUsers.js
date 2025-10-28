import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { config, mongoOptions } from '../config.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CSV parser function
function parseCSV(filePath) {
  console.log(`📂 Reading file from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at: ${filePath}`);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or contains only headers');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log(`📋 Found ${headers.length} columns`);
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    let currentIndex = 0;
    let insideQuotes = false;
    let currentValue = '';
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        obj[headers[currentIndex]] = currentValue.trim().replace(/^"|"$/g, '');
        currentValue = '';
        currentIndex++;
      } else {
        currentValue += char;
      }
    }
    
    if (currentIndex < headers.length) {
      obj[headers[currentIndex]] = currentValue.trim().replace(/^"|"$/g, '');
    }
    
    if (Object.keys(obj).length > 0) {
      data.push(obj);
    }
  }
  
  return data;
}

// Map role: "user" -> "employee", "Super Admin" -> "admin"
function mapRole(role) {
  const roleMap = {
    'user': 'employee',
    'Super Admin': 'admin',
    'employee': 'employee',
    'admin': 'admin'
  };
  
  return roleMap[role?.trim()] || 'employee';
}

// Hash password
async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
}

// Seed users from CSV
export async function seedUsersFromCSV(csvFilePath) {
  let mongooseConnection = null;
  
  try {
    console.log('\n========================================');
    console.log('🚀 Starting Users Seeding');
    console.log('========================================\n');
    
    console.log(`📍 MongoDB URI: ${config.mongoURI}`);
    console.log('🔄 Connecting to MongoDB...');
    
    mongooseConnection = await mongoose.connect(config.mongoURI, mongoOptions);
    console.log('✅ Successfully connected to MongoDB\n');

    // Read and parse CSV
    console.log('📖 Reading CSV file...');
    const csvData = parseCSV(csvFilePath);
    console.log(`✅ Parsed ${csvData.length} users from CSV\n`);

    // Convert to MongoDB documents
    console.log('📝 Converting to MongoDB documents...');
    const userDocuments = [];
    
    for (const row of csvData) {
      try {
        const username = row['Username']?.trim();
        const password = row['Password']?.trim();
        const name = row['Name']?.trim();
        const roleRaw = row['Role']?.trim();
        const department = row['Department']?.trim();
        
        if (!username || !password || !name) {
          console.warn(`⚠️  Skipping row with missing username/password/name`);
          continue;
        }
        
        const hashedPassword = await hashPassword(password);
        const role = mapRole(roleRaw);
        
        userDocuments.push({
          username,
          email: `${username.toLowerCase().replace(/\s+/g, '.')}@amg.com`,
          password: hashedPassword,
          name,
          role,
          department: department || 'General',
          isActive: true,
          permissions: {
            canViewTasks: true,
            canViewAllTeamTasks: role === 'admin' ? true : false,
            canAssignTasks: role === 'admin' ? true : false,
            canDeleteTasks: role === 'admin' ? true : false,
            canEditTasks: true,
            canManageUsers: role === 'admin' ? true : false,
            canEditRecurringTaskSchedules: role === 'admin' ? true : false
          }
        });
      } catch (error) {
        console.warn(`⚠️  Error processing user: ${error.message}`);
      }
    }

    console.log(`✅ Converted ${userDocuments.length} users\n`);

    // Check for duplicates and insert
    console.log('🔍 Checking for duplicates and inserting...\n');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const userDoc of userDocuments) {
      try {
        // Check if user already exists
        const existing = await User.findOne({ 
          $or: [
            { username: userDoc.username },
            { email: userDoc.email }
          ]
        });
        
        if (existing) {
          console.log(`⏭️  SKIPPED: ${userDoc.username} - ${userDoc.name} (already exists)`);
          skipped++;
        } else {
          const newUser = new User(userDoc);
          await newUser.save();
          console.log(`✅ INSERTED: ${userDoc.username} - ${userDoc.name} (${userDoc.role})`);
          inserted++;
        }
      } catch (error) {
        console.error(`❌ ERROR: ${userDoc.username} - ${error.message}`);
        errors++;
      }
    }

    console.log(`\n========================================`);
    console.log(`📊 SEEDING SUMMARY`);
    console.log(`========================================`);
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📁 Total Processed: ${inserted + skipped + errors}`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    
    return { inserted, skipped, errors, total: inserted + skipped + errors };

  } catch (error) {
    console.error('\n❌ ============ SEEDING FAILED ============');
    console.error(`Error: ${error.message}`);
    console.error('==========================================\n');
    
    if (mongooseConnection) {
      await mongoose.disconnect().catch(() => {});
    }
    
    process.exit(1);
  }
}

// Run if called directly
const csvPath = path.join(__dirname, '../../assets/users.csv');

console.log(`\n📁 CSV File Path: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  console.error(`\n❌ ERROR: CSV file not found!`);
  console.error(`Expected location: ${csvPath}\n`);
  process.exit(1);
}

seedUsersFromCSV(csvPath).then((result) => {
  console.log('🎉 User seeding completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
