import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { config, mongoOptions } from '../config.js';
import FMS from '../models/FMS.js';
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
      const nextChar = lines[i][j + 1];
      
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

// Parse checklist items from JSON string
function parseChecklist(checklistStr) {
  if (!checklistStr || checklistStr === '[]' || checklistStr.trim() === '') {
    return [];
  }
  
  try {
    return JSON.parse(checklistStr);
  } catch (e) {
    return [];
  }
}

// Import FMS data from CSV
export async function importFMSFromCSV(csvFilePath) {
  let mongooseConnection = null;
  
  try {
    console.log('\n========================================');
    console.log('🚀 Starting FMS CSV Import');
    console.log('========================================\n');
    
    console.log(`📍 MongoDB URI: ${config.mongoURI}`);
    console.log('🔄 Connecting to MongoDB...');
    
    mongooseConnection = await mongoose.connect(config.mongoURI, mongoOptions);
    console.log('✅ Successfully connected to MongoDB\n');

    // Read and parse CSV
    console.log('📖 Reading CSV file...');
    const csvData = parseCSV(csvFilePath);
    console.log(`✅ Parsed ${csvData.length} rows from CSV\n`);

    // Group data by FMS_ID
    console.log('📊 Grouping data by FMS_ID...');
    const fmsMap = {};
    for (const row of csvData) {
      const fmsId = row.FMS_ID;
      
      if (!fmsMap[fmsId]) {
        fmsMap[fmsId] = {
          fmsId,
          fmsName: row.FMS_Name,
          createdBy: row.Created_By,
          createdAt: new Date(row.Created_On),
          updatedAt: new Date(row.Last_Updated_On || row.Created_On),
          status: 'Active',
          steps: []
        };
      }
      
      // Find or create the step
      const stepNo = parseInt(row.Step_No);
      let step = fmsMap[fmsId].steps.find(s => s.stepNo === stepNo);
      
      if (!step) {
        // Handle triggersFMSId - could be empty string, [], or an actual ID
        let triggersFMSId = undefined;
        if (row.Triggers_FMS_ID && row.Triggers_FMS_ID !== '' && row.Triggers_FMS_ID !== '[]') {
          triggersFMSId = row.Triggers_FMS_ID;
        }
        
        step = {
          stepNo,
          what: row.WHAT,
          who: [row.WHO],
          how: row.HOW,
          when: parseFloat(row.WHEN) || 0,
          whenUnit: row.When_Unit,
          whenDays: row.When_Days ? parseInt(row.When_Days) : undefined,
          whenHours: row.When_Hours ? parseInt(row.When_Hours) : undefined,
          whenType: row.When_Type || 'fixed',
          requiresChecklist: row.Requires_Checklist === 'TRUE',
          checklistItems: parseChecklist(row.Checklist_Items),
          attachments: [],
          triggersFMSId: triggersFMSId
        };
        fmsMap[fmsId].steps.push(step);
      }
    }

    console.log(`✅ Grouped ${csvData.length} rows into ${Object.keys(fmsMap).length} FMS templates\n`);

    // Get all users for mapping
    console.log('👥 Fetching users from database...');
    const users = await User.find({});
    if (users.length === 0) {
      throw new Error('No users found in database! Please create users first.');
    }
    
    const userMap = {};
    users.forEach(user => {
      userMap[user.username] = user._id.toString();
    });
    console.log(`✅ Found ${users.length} users in database\n`);

    // Convert to MongoDB documents
    console.log('📝 Converting to MongoDB documents...');
    const fmsDocuments = [];
    
    for (const fmsId in fmsMap) {
      const fmsData = fmsMap[fmsId];
      
      // Map creator
      const creator = userMap[fmsData.createdBy];
      if (!creator) {
        console.warn(`⚠️  Creator "${fmsData.createdBy}" not found, using first user`);
        fmsData.createdBy = users[0]._id;
      } else {
        fmsData.createdBy = creator;
      }
      
      // Map assignees
      fmsData.steps.forEach(step => {
        step.who = step.who.map(username => {
          const userId = userMap[username.trim()];
          if (!userId) {
            console.warn(`⚠️  User "${username.trim()}" not found in step, using first user`);
            return users[0]._id;
          }
          return userId;
        }).filter(Boolean);
      });
      
      fmsDocuments.push(fmsData);
    }

    console.log(`✅ Converted ${fmsDocuments.length} templates\n`);

    // Check for duplicates and insert
    console.log('🔍 Checking for duplicates and inserting...\n');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const fmsDoc of fmsDocuments) {
      try {
        const existing = await FMS.findOne({ fmsId: fmsDoc.fmsId });
        
        if (existing) {
          console.log(`⏭️  SKIPPED: ${fmsDoc.fmsId} - already exists in database`);
          skipped++;
        } else {
          const newFMS = new FMS(fmsDoc);
          await newFMS.save();
          console.log(`✅ INSERTED: ${fmsDoc.fmsId} - ${fmsDoc.fmsName} (${newFMS.steps.length} steps)`);
          inserted++;
        }
      } catch (error) {
        console.error(`❌ ERROR: ${fmsDoc.fmsId} - ${error.message}`);
        errors++;
      }
    }

    console.log(`\n========================================`);
    console.log(`📊 IMPORT SUMMARY`);
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
const csvPath = path.join(__dirname, '../../assets/FMS UPDATIONS - FMS_MASTER (3).csv');

console.log(`\n📁 CSV File Path: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  console.error(`\n❌ ERROR: CSV file not found!`);
  console.error(`Expected location: ${csvPath}\n`);
  process.exit(1);
}

importFMSFromCSV(csvPath).then((result) => {
  console.log('🎉 Import completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Import failed:', error.message);
  process.exit(1);
});
