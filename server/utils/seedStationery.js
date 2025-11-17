import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the model
import Stationery from '../models/Stationery.js';

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/task-management-system';

// Sample stationery items
// Valid categories: 'Writing', 'Paper', 'Binding', 'Storage', 'General', 'Office Supplies'
const stationeryItems = [
  // Writing
  { name: 'Pen (Blue)', category: 'Writing', quantity: 500, unit: 'piece' },
  { name: 'Pen (Black)', category: 'Writing', quantity: 500, unit: 'piece' },
  { name: 'Pen (Red)', category: 'Writing', quantity: 200, unit: 'piece' },
  { name: 'Pencil', category: 'Writing', quantity: 300, unit: 'piece' },
  { name: 'Marker (Permanent)', category: 'Writing', quantity: 100, unit: 'piece' },
  { name: 'Marker (Whiteboard)', category: 'Writing', quantity: 150, unit: 'piece' },
  { name: 'Highlighter', category: 'Writing', quantity: 200, unit: 'piece' },
  { name: 'Correction Fluid', category: 'Writing', quantity: 150, unit: 'piece' },
  
  // Paper
  { name: 'A4 Paper (Ream)', category: 'Paper', quantity: 100, unit: 'ream' },
  { name: 'A3 Paper (Ream)', category: 'Paper', quantity: 50, unit: 'ream' },
  { name: 'Notebook (100 pages)', category: 'Paper', quantity: 200, unit: 'piece' },
  { name: 'Sticky Notes', category: 'Paper', quantity: 300, unit: 'pack' },
  { name: 'Notepad', category: 'Paper', quantity: 150, unit: 'piece' },
  { name: 'Envelope (A4)', category: 'Paper', quantity: 500, unit: 'piece' },
  { name: 'Envelope (A5)', category: 'Paper', quantity: 500, unit: 'piece' },
  
  // Binding
  { name: 'Stapler', category: 'Binding', quantity: 75, unit: 'piece' },
  { name: 'Staples (Box)', category: 'Binding', quantity: 200, unit: 'box' },
  { name: 'Paper Clips', category: 'Binding', quantity: 300, unit: 'box' },
  { name: 'Rubber Bands', category: 'Binding', quantity: 150, unit: 'pack' },
  { name: 'Ring Binder', category: 'Binding', quantity: 150, unit: 'piece' },
  { name: 'Punch Machine', category: 'Binding', quantity: 30, unit: 'piece' },
  
  // Storage
  { name: 'File Folder', category: 'Storage', quantity: 300, unit: 'piece' },
  { name: 'Box File', category: 'Storage', quantity: 100, unit: 'piece' },
  { name: 'Clear Folder', category: 'Storage', quantity: 200, unit: 'piece' },
  { name: 'Document Tray', category: 'Storage', quantity: 50, unit: 'piece' },
  
  // Office Supplies
  { name: 'Scissors', category: 'Office Supplies', quantity: 100, unit: 'piece' },
  { name: 'Cutter', category: 'Office Supplies', quantity: 80, unit: 'piece' },
  { name: 'Glue Stick', category: 'Office Supplies', quantity: 200, unit: 'piece' },
  { name: 'Tape Dispenser', category: 'Office Supplies', quantity: 80, unit: 'piece' },
  { name: 'Scotch Tape', category: 'Office Supplies', quantity: 250, unit: 'piece' },
  { name: 'Whiteboard Eraser', category: 'Office Supplies', quantity: 50, unit: 'piece' },
  { name: 'Ruler (30cm)', category: 'Office Supplies', quantity: 100, unit: 'piece' },
  { name: 'Stamp Pad', category: 'Office Supplies', quantity: 80, unit: 'piece' },
  
  // General
  { name: 'Pen Stand', category: 'General', quantity: 50, unit: 'piece' },
  { name: 'Desktop Organizer', category: 'General', quantity: 30, unit: 'piece' },
  { name: 'Calendar (Desktop)', category: 'General', quantity: 100, unit: 'piece' },
  { name: 'Calculator', category: 'General', quantity: 50, unit: 'piece' },
  { name: 'USB Drive (16GB)', category: 'General', quantity: 50, unit: 'piece' },
  { name: 'USB Drive (32GB)', category: 'General', quantity: 30, unit: 'piece' },
  { name: 'Mouse Pad', category: 'General', quantity: 100, unit: 'piece' },
  { name: 'Keyboard Cleaning Kit', category: 'General', quantity: 40, unit: 'kit' }
];

async function seedStationery() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing stationery items
    console.log('🗑️ Clearing existing stationery items...');
    await Stationery.deleteMany({});
    console.log('✅ Cleared existing items');

    // Insert new items
    console.log('📦 Inserting stationery items...');
    const inserted = await Stationery.insertMany(stationeryItems);
    console.log(`✅ Successfully inserted ${inserted.length} stationery items`);

    // Display summary by category
    const categories = [...new Set(stationeryItems.map(item => item.category))];
    console.log('\n📊 Summary by Category:');
    for (const category of categories) {
      const count = stationeryItems.filter(item => item.category === category).length;
      console.log(`   - ${category}: ${count} items`);
    }

    console.log('\n✨ Stationery seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding stationery:', error);
    process.exit(1);
  }
}

seedStationery();

