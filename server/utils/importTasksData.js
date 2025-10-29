import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { config, mongoOptions } from '../config.js';
import Task from '../models/Task.js';
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

// Parse date from DD/MM/YYYY format
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    return null;
  }
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  const year = parseInt(parts[2]);
  
  const date = new Date(year, month, day);
  
  // Validate if date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

// Convert task frequency to task type
function mapTaskFrequency(frequency) {
  const freqMap = {
    'One Time Only': 'one-time',
    'DAILY': 'daily',
    'WEEKLY': 'weekly',
    'MONTHLY': 'monthly',
    'QUARTERLY': 'quarterly',
    'YEARLY': 'yearly'
  };
  
  return freqMap[frequency?.trim()] || 'one-time';
}

// Convert task status
function mapTaskStatus(status) {
  const statusMap = {
    'Pending': 'pending',
    'In Progress': 'in-progress',
    'Completed': 'completed',
    'Overdue': 'overdue'
  };
  
  return statusMap[status?.trim()] || 'pending';
}

// Map completion score based on "On time or not?" field
function mapCompletionScore(onTimeStatus) {
  const trimmed = onTimeStatus?.trim().toLowerCase();
  if (trimmed === 'on time') {
    return 100;
  } else if (trimmed === 'not on time') {
    return 0;
  }
  return null; // No score for other cases (like empty, pending tasks, etc.)
}

// Hash password
async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
}

// Create user if not exists
async function getOrCreateUser(username, phoneNumber, userMap, createdUsers) {
  // Check if already in userMap
  if (userMap[username]) {
    return userMap[username];
  }
  
  // Check if already created in this session
  if (createdUsers[username]) {
    return createdUsers[username];
  }
  
  try {
    // Check database with case-insensitive search
    const existing = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (existing) {
      userMap[username] = existing._id.toString();
      userMap[existing.username] = existing._id.toString(); // Also map the actual case
      return existing._id.toString();
    }
    
    // Create new user with default password
    const email = `${username.toLowerCase().replace(/\s+/g, '.')}@amg.com`;
    const hashedPassword = await hashPassword('DefaultPass@123');
    
    const newUser = new User({
      username,
      email,
      phoneNumber: phoneNumber || '',
      password: hashedPassword,
      name: username,
      role: 'employee',
      department: 'General',
      isActive: true,
      permissions: {
        canViewTasks: true,
        canViewAllTeamTasks: false,
        canAssignTasks: false,
        canDeleteTasks: false,
        canEditTasks: true,
        canManageUsers: false,
        canEditRecurringTaskSchedules: false
      }
    });
    
    await newUser.save();
    console.log(`👤 Created missing user: ${username} (Phone: ${phoneNumber || 'N/A'})`);
    
    const userId = newUser._id.toString();
    userMap[username] = userId;
    createdUsers[username] = userId;
    
    return userId;
  } catch (error) {
    console.error(`❌ Failed to create user ${username}: ${error.message}`);
    return null;
  }
}

// Import Tasks data from CSV
export async function importTasksFromCSV(csvFilePath) {
  let mongooseConnection = null;
  
  try {
    console.log('\n========================================');
    console.log('🚀 Starting Tasks CSV Import');
    console.log('========================================\n');
    
    console.log(`📍 MongoDB URI: ${config.mongoURI}`);
    console.log('🔄 Connecting to MongoDB...');
    
    mongooseConnection = await mongoose.connect(config.mongoURI, mongoOptions);
    console.log('✅ Successfully connected to MongoDB\n');

    // Read and parse CSV
    console.log('📖 Reading CSV file...');
    const csvData = parseCSV(csvFilePath);
    console.log(`✅ Parsed ${csvData.length} rows from CSV\n`);

    // Get all users for mapping
    console.log('👥 Fetching users from database...');
    const users = await User.find({});
    if (users.length === 0) {
      throw new Error('No users found in database! Please create users first.');
    }
    
    const userMap = {};
    const createdUsers = {};
    users.forEach(user => {
      userMap[user.username] = user._id.toString();
    });
    console.log(`✅ Found ${users.length} users in database\n`);

    // Convert to MongoDB documents
    console.log('📝 Converting to MongoDB documents...');
    const taskDocuments = [];
    
    for (const row of csvData) {
      try {
        // Parse and map data
        const assignedByName = row['GIVEN BY']?.trim();
        const assignedToName = row['GIVEN TO']?.trim();
        const phoneNumber = row['Numbers']?.trim() || '';
        const dueDate = parseDate(row['PLANNED DATE']);
        const completedDate = parseDate(row['completed on']);
        
        if (!dueDate) {
          console.warn(`⚠️  Skipping task ${row['Task Id']} - invalid due date`);
          continue;
        }
        
        // Get or create users
        const assignedBy = await getOrCreateUser(assignedByName, '', userMap, createdUsers);
        const assignedTo = await getOrCreateUser(assignedToName, phoneNumber, userMap, createdUsers);
        
        if (!assignedBy || !assignedTo) {
          console.warn(`⚠️  Skipping task ${row['Task Id']} - could not create/find users`);
          continue;
        }
        
        const taskType = mapTaskFrequency(row['TASK FREQUENCY']);
        const status = mapTaskStatus(row['Task Status']);
        
        const taskDoc = {
          title: row['TASK DESCRIPTION']?.trim() || 'Untitled Task',
          description: row['HOW TO DO- TUTORIAL LINKS (OPTIONAL)']?.trim() || '',
          taskType,
          originalTaskType: taskType,
          assignedBy,
          assignedTo,
          dueDate,
          priority: 'normal',
          status,
          completedAt: completedDate || (status === 'completed' ? new Date() : null),
          completionRemarks: row['Reason for Revision']?.trim() || '',
          revisionCount: parseInt(row['Revision Count']) || 0,
          isActive: true,
          attachments: [],
          completionScore: mapCompletionScore(row['On time or not?']),
          // Store additional metadata from CSV
          department: row['DEPARTMENT']?.trim() || '',
          phoneNumber: phoneNumber
        };
        
        taskDocuments.push({
          taskId: row['Task Id'],
          data: taskDoc
        });
      } catch (error) {
        console.warn(`⚠️  Error processing task ${row['Task Id']}: ${error.message}`);
      }
    }

    console.log(`✅ Converted ${taskDocuments.length} tasks\n`);

    // Check for duplicates and insert
    console.log('🔍 Checking for duplicates and inserting...\n');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const taskItem of taskDocuments) {
      try {
        // Check if task with same title and assigned to already exists
        const existing = await Task.findOne({
          title: taskItem.data.title,
          assignedTo: taskItem.data.assignedTo,
          dueDate: taskItem.data.dueDate
        });
        
        if (existing) {
          console.log(`⏭️  SKIPPED: ${taskItem.taskId} - ${taskItem.data.title} (already exists)`);
          skipped++;
        } else {
          const newTask = new Task(taskItem.data);
          await newTask.save();
          const scoreInfo = newTask.completionScore !== null ? ` (Score: ${newTask.completionScore})` : '';
          console.log(`✅ INSERTED: ${taskItem.taskId} - ${taskItem.data.title} (${taskItem.data.status})${scoreInfo}`);
          inserted++;
        }
      } catch (error) {
        console.error(`❌ ERROR: ${taskItem.taskId} - ${error.message}`);
        errors++;
      }
    }

    console.log(`\n========================================`);
    console.log(`📊 IMPORT SUMMARY`);
    console.log(`========================================`);
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`👤 Created Users: ${Object.keys(createdUsers).length}`);
    console.log(`📁 Total Processed: ${inserted + skipped + errors}`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    
    return { inserted, skipped, errors, createdUsers: Object.keys(createdUsers).length, total: inserted + skipped + errors };

  } catch (error) {
    console.error('\n❌ ============ IMPORT FAILED ============');
    console.error(`Error: ${error.message}`);
    console.error('==========================================\n');
    
    if (mongooseConnection) {
      await mongoose.disconnect().catch(() => {});
    }
    
    process.exit(1);
  }
}

// Run if called directly
const csvPath = path.join(__dirname, '../../assets/Management Dashboard _ Delegation System - MASTER.csv');

console.log(`\n📁 CSV File Path: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  console.error(`\n❌ ERROR: CSV file not found!`);
  console.error(`Expected location: ${csvPath}\n`);
  process.exit(1);
}

importTasksFromCSV(csvPath).then((result) => {
  console.log('🎉 Import completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Import failed:', error.message);
  process.exit(1);
});
