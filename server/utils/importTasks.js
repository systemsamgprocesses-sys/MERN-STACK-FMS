import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import Task from '../models/Task.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// CSV file path
const CSV_PATH = path.join(__dirname, '../../assets/Management Dashboard _ Delegation System - MASTER (1).csv');

// Task frequency mapping
const FREQUENCY_MAP = {
  'One Time Only': 'one-time',
  'MONTHLY': 'monthly',
  'QUARTERLY': 'quarterly',
  'YEARLY': 'yearly',
  'DAILY': 'daily',
  'WEEKLY': 'weekly'
};

// Status mapping
const STATUS_MAP = {
  'Pending': 'pending',
  'In Progress': 'in-progress',
  'Completed': 'completed',
  'On-Hold': 'pending', // Map to pending but set isOnHold flag
  'HOLD BY MD': 'pending', // Map to pending but set isOnHold flag
  'Terminated': 'pending' // Map to pending but set isTerminated flag
};

/**
 * Parse date from DD/MM/YYYY format to Date object
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Handle DD/MM/YYYY format
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Try parsing as ISO date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

/**
 * Parse revision log from JSON string
 */
function parseRevisionLog(revisionLogStr) {
  if (!revisionLogStr || revisionLogStr.trim() === '' || revisionLogStr === '[]') {
    return [];
  }
  
  try {
    const revisions = JSON.parse(revisionLogStr);
    return Array.isArray(revisions) ? revisions : [];
  } catch (error) {
    console.warn(`Failed to parse revision log: ${revisionLogStr}`);
    return [];
  }
}

/**
 * Read and parse CSV file
 */
async function readCSV() {
  return new Promise((resolve, reject) => {
    const tasks = [];
    
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        tasks.push(row);
      })
      .on('end', () => {
        console.log(`✓ Read ${tasks.length} tasks from CSV`);
        resolve(tasks);
      })
      .on('error', reject);
  });
}

/**
 * Build user mapping (username/phone -> User document)
 */
async function buildUserMapping() {
  const users = await User.find({ isActive: true });
  const userMap = new Map();
  
  users.forEach(user => {
    // Map by username (case-insensitive)
    if (user.username) {
      userMap.set(user.username.toLowerCase(), user);
    }
    
    // Map by phone number
    if (user.phoneNumber) {
      userMap.set(user.phoneNumber.trim(), user);
    }
  });
  
  console.log(`✓ Built mapping for ${users.length} users`);
  return userMap;
}

/**
 * Find user by username or phone number
 */
function findUser(userMap, identifier) {
  if (!identifier) return null;
  
  const key = identifier.trim().toLowerCase();
  return userMap.get(key) || userMap.get(identifier.trim());
}

/**
 * Import tasks from CSV
 */
async function importTasks() {
  try {
    process.stdout.write('\n========================================\n');
    process.stdout.write('🚀 Starting Task Import Process\n');
    process.stdout.write('========================================\n\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/task-manager';
    process.stdout.write(`Connecting to MongoDB at ${mongoUri}...\n`);
    await mongoose.connect(mongoUri);
    process.stdout.write('✓ Connected to MongoDB\n');
    
    // Read CSV
    const csvTasks = await readCSV();
    
    // Build user mapping
    const userMap = await buildUserMapping();
    
    // Statistics
    const stats = {
      total: csvTasks.length,
      created: 0,
      skipped: 0,
      errors: 0,
      missingUsers: new Set()
    };
    
    console.log('\n📊 Processing tasks...\n');
    
    for (const [index, row] of csvTasks.entries()) {
      try {
        const taskId = row['Task Id'];
        
        // Skip empty rows
        if (!taskId || taskId.trim() === '') {
          stats.skipped++;
          continue;
        }
        
        // Check if task already exists
        const existingTask = await Task.findOne({ 
          title: row['TASK DESCRIPTION']?.trim(),
          'assignedTo': { $exists: true },
          'assignedBy': { $exists: true }
        });
        
        // Find assignedBy user
        const assignedByIdentifier = row['GIVEN BY']?.trim();
        const assignedByUser = findUser(userMap, assignedByIdentifier);
        
        if (!assignedByUser) {
          console.warn(`⚠️  Task ${taskId}: Could not find user "${assignedByIdentifier}" (GIVEN BY)`);
          stats.missingUsers.add(assignedByIdentifier);
          stats.skipped++;
          continue;
        }
        
        // Find assignedTo user (try username first, then phone number)
        const assignedToUsername = row['GIVEN TO USER ID']?.trim() || row['GIVEN TO']?.trim();
        const assignedToPhone = row['Numbers']?.trim();
        
        let assignedToUser = findUser(userMap, assignedToUsername);
        if (!assignedToUser && assignedToPhone) {
          assignedToUser = findUser(userMap, assignedToPhone);
        }
        
        if (!assignedToUser) {
          console.warn(`⚠️  Task ${taskId}: Could not find user "${assignedToUsername}" or phone "${assignedToPhone}" (GIVEN TO)`);
          stats.missingUsers.add(assignedToUsername || assignedToPhone);
          stats.skipped++;
          continue;
        }
        
        // Check for duplicate
        if (existingTask && 
            existingTask.assignedTo.toString() === assignedToUser._id.toString() &&
            existingTask.assignedBy.toString() === assignedByUser._id.toString()) {
          console.log(`⏭️  Task ${taskId}: Already exists, skipping`);
          stats.skipped++;
          continue;
        }
        
        // Parse task frequency
        const frequencyStr = row['TASK FREQUENCY']?.trim() || 'One Time Only';
        const taskType = FREQUENCY_MAP[frequencyStr] || 'one-time';
        
        // Parse planned date
        const plannedDate = parseDate(row['PLANNED DATE']);
        const dueDate = plannedDate || new Date();
        
        // Parse status
        const statusStr = row['Task Status']?.trim() || 'Pending';
        const status = STATUS_MAP[statusStr] || 'pending';
        
        // Check if on hold or terminated
        const isOnHold = statusStr === 'On-Hold' || statusStr === 'HOLD BY MD';
        const isTerminated = statusStr === 'Terminated';
        
        // Parse completion date
        const completedAt = parseDate(row['completed on']);
        
        // Parse revision data
        const revisionLogStr = row['Revision Status & Log']?.trim();
        const revisions = parseRevisionLog(revisionLogStr);
        const revisionCount = parseInt(row['Revision Count']) || 0;
        
        // Check if score impacted
        const scoringImpact = row['Scoring Impact']?.trim();
        const scoreImpacted = scoringImpact === 'Yes' || scoringImpact === 'YES';
        
        // Parse on time status
        const onTimeStatus = row['On time or not?']?.trim();
        const isOnTime = onTimeStatus === 'On Time';
        
        // Create task object
        const taskData = {
          title: row['TASK DESCRIPTION']?.trim() || 'Untitled Task',
          description: row['HOW TO DO- TUTORIAL LINKS (OPTIONAL)']?.trim() || '',
          taskType: taskType,
          assignedBy: assignedByUser._id,
          assignedTo: assignedToUser._id,
          dueDate: dueDate,
          originalPlannedDate: plannedDate,
          status: status,
          priority: 'normal',
          department: row['DEPARTMENT']?.trim() || '',
          phoneNumber: assignedToPhone || '',
          isOnHold: isOnHold,
          isTerminated: isTerminated,
          scoreImpacted: scoreImpacted,
          revisionCount: revisionCount,
          revisions: revisions,
          completedAt: completedAt,
          creationDate: new Date(),
          isActive: true
        };
        
        // Create task
        const task = new Task(taskData);
        await task.save();
        
        stats.created++;
        
        if ((index + 1) % 50 === 0) {
          console.log(`   Progress: ${index + 1}/${csvTasks.length} tasks processed...`);
        }
      } catch (error) {
        stats.errors++;
        console.error(`❌ Error processing task at row ${index + 1}:`, error.message);
      }
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('📊 Import Summary');
    console.log('========================================');
    console.log(`Total tasks in CSV:     ${stats.total}`);
    console.log(`✓ Successfully created: ${stats.created}`);
    console.log(`⏭️  Skipped:             ${stats.skipped}`);
    console.log(`❌ Errors:              ${stats.errors}`);
    
    if (stats.missingUsers.size > 0) {
      console.log('\n⚠️  Missing Users:');
      stats.missingUsers.forEach(user => {
        console.log(`   - ${user}`);
      });
    }
    
    console.log('\n✓ Import process completed!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  }
}

// Run import if called directly
const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
                     import.meta.url.endsWith('importTasks.js');

if (isMainModule) {
  console.log('Starting import...');
  importTasks()
    .then(() => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

export default importTasks;

