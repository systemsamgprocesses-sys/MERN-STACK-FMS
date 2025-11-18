import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import auth from '../middleware/auth.js'; // JWT auth middleware
import Stationery from '../models/Stationery.js';
import StationeryRequest from '../models/StationeryRequest.js';
import User from '../models/User.js';
import InventoryAdjustmentLog from '../models/InventoryAdjustmentLog.js';

const router = express.Router();

// Configure multer for CSV uploads
const csvUpload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware to check if user is HR
const checkHR = (req, res, next) => {
  if (!req.user || !req.user.permissions.canManageStationery) {
    return res.status(403).json({ message: 'Access Denied: HR personnel only.' });
  }
  next();
};

// --- Employee Routes ---

// GET /api/stationery/items (Get item list for dropdowns - Employee view without stock quantity)
router.get('/items', auth, async (req, res) => {
  try {
    const items = await Stationery.find({ isActive: true, quantity: { $gt: 0 } })
      .select('name category')
      .sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stationery items', error: error.message });
  }
});

// POST /api/stationery/request (Submit a new request)
router.post('/request', auth, async (req, res) => {
  const { demandType, items, userRemarks } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Request must contain at least one item.' });
  }

  try {
    const newRequest = new StationeryRequest({
      requestedBy: req.user.id,
      demandType: demandType || 'Normal',
      items,
      userRemarks,
      status: 'Pending',
    });

    await newRequest.save();
    await newRequest.populate('items.item', 'name category quantity');
    
    res.status(201).json({ 
      message: 'Stationery request submitted successfully.', 
      request: newRequest,
      requestNumber: newRequest.requestNumber
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting request', error: error.message });
  }
});

// GET /api/stationery/my-requests (Get user's own request history)
router.get('/my-requests', auth, async (req, res) => {
  try {
    const requests = await StationeryRequest.find({ requestedBy: req.user.id })
      .populate('items.item', 'name category quantity')
      .populate('approvedBy', 'username')
      .populate('rejectedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

// POST /api/stationery/receive/:id (User marks as received)
router.post('/receive/:id', auth, async (req, res) => {
  try {
    // Validate request ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid request ID format.' });
    }

    // Get user ID
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    // Find the request
    const request = await StationeryRequest.findOne({
      _id: req.params.id,
      requestedBy: userId,
    });

    if (!request) {
      return res.status(404).json({ 
        message: 'Request not found or you do not have permission to receive this request.' 
      });
    }
    
    if (request.status !== 'Approved') {
      return res.status(400).json({ 
        message: `Request is not in an "Approved" state. Current status: ${request.status}` 
      });
    }

    // Populate items to get stationery details
    await request.populate({
      path: 'items.item',
      select: 'name category quantity'
    });

    // Validate all items have sufficient stock and filter out deleted items
    const validItems = [];
    for (const reqItem of request.items) {
      // Handle both populated and unpopulated item references
      const itemId = reqItem.item?._id || reqItem.item;
      
      if (!itemId) {
        console.warn(`Skipping deleted item in request ${request._id}`);
        continue;
      }
      
      const itemDoc = await Stationery.findById(itemId);
      
      if (!itemDoc) {
        console.warn(`Item ${itemId} not found, skipping`);
        continue;
      }
      
      if (itemDoc.quantity < reqItem.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${itemDoc.name}. Requested: ${reqItem.quantity}, Available: ${itemDoc.quantity}`
        });
      }
      
      validItems.push({ itemDoc, quantity: reqItem.quantity });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ 
        message: 'No valid items in this request to process.' 
      });
    }

    // Deduct stock for all valid items
    for (const { itemDoc, quantity } of validItems) {
      await Stationery.findByIdAndUpdate(
        itemDoc._id,
        { $inc: { quantity: -quantity } },
        { new: true }
      );
    }

    // Update request status
    request.status = 'Received';
    request.receivedAt = new Date();
    await request.save();

    // Populate for response
    await request.populate('requestedBy', 'username email');
    await request.populate('items.item', 'name category quantity');
    
    res.json({ 
      message: `Items marked as received. ${validItems.length} item(s) processed. Stock has been updated.`, 
      request 
    });
  } catch (error) {
    console.error('Error in receive endpoint:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Error marking as received', 
      error: error.message
    });
  }
});

// --- HR Admin Routes ---

// GET /api/stationery/hr/requests (Get all requests for HR view)
router.get('/hr/requests', auth, checkHR, async (req, res) => {
  try {
    const requests = await StationeryRequest.find()
      .populate('requestedBy', 'username email')
      .populate('items.item', 'name category quantity')
      .populate('approvedBy', 'username')
      .populate('rejectedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

// POST /api/stationery/hr/approve/:id (HR approves)
router.post('/hr/approve/:id', auth, checkHR, async (req, res) => {
  try {
    const { hrRemarks } = req.body;
    const request = await StationeryRequest.findById(req.params.id).populate('items.item');

    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    // Check if stock is sufficient for all items
    for (const reqItem of request.items) {
      if (!reqItem.item) {
        return res.status(400).json({
          message: 'One or more requested items no longer exist in inventory.'
        });
      }
      if (reqItem.quantity > reqItem.item.quantity) {
        return res.status(400).json({
          message: `Stock check failed for ${reqItem.item.name}. Requested: ${reqItem.quantity}, In Stock: ${reqItem.item.quantity}`
        });
      }
    }

    request.status = 'Approved';
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    request.hrRemarks = hrRemarks;
    await request.save();

    res.json({ message: 'Request Approved.', request });
  } catch (error) {
    res.status(500).json({ message: 'Error approving request', error: error.message });
  }
});

// POST /api/stationery/hr/reject/:id (HR rejects)
router.post('/hr/reject/:id', auth, checkHR, async (req, res) => {
  try {
    const { hrRemarks } = req.body;
    if (!hrRemarks) {
        return res.status(400).json({ message: 'Rejection remarks are required.' });
    }

    const request = await StationeryRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Rejected',
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        hrRemarks: hrRemarks,
      },
      { new: true }
    );
    res.json({ message: 'Request Rejected.', request });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting request', error: error.message });
  }
});

// GET /api/stationery/hr/inventory (HR: Get full inventory)
router.get('/hr/inventory', auth, checkHR, async (req, res) => {
  try {
    const items = await Stationery.find().sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
});

// POST /api/stationery/hr/inventory (HR: Add new item)
router.post('/hr/inventory', auth, checkHR, async (req, res) => {
  try {
    const { name, category, quantity, unit, description } = req.body;
    const newItem = new Stationery({ name, category, quantity, unit, description });
    await newItem.save();
    res.status(201).json({ message: 'Item added to inventory.', item: newItem });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(400).json({ message: 'Error: SKU already exists.' });
    }
    res.status(500).json({ message: 'Error adding item', error: error.message });
  }
});

// PUT /api/stationery/hr/inventory/:id (HR: Update item)
router.put('/hr/inventory/:id', auth, checkHR, async (req, res) => {
    try {
        const { name, category, quantity, unit, description, isActive } = req.body;
        const updatedItem = await Stationery.findByIdAndUpdate(
          req.params.id,
          { name, category, quantity, unit, description, isActive },
          { new: true, runValidators: true }
        );
        if (!updatedItem) {
          return res.status(404).json({ message: 'Item not found.' });
        }
        res.json({ message: 'Inventory item updated.', item: updatedItem });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Error: SKU already exists.' });
        }
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
});

// DELETE /api/stationery/hr/inventory/:id (HR: Delete item)
router.delete('/hr/inventory/:id', auth, checkHR, async (req, res) => {
    try {
        // You should not delete if requests exist for it. A better way is to set `isActive` to false.
        // For this demo, we use the `isActive` flag via the PUT endpoint.
        // A true delete is dangerous. Let's just disable it.
        const item = await Stationery.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found.' });

        item.isActive = false;
        await item.save();

        res.json({ message: 'Item has been deactivated and will no longer appear in new requests.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deactivating item', error: error.message });
    }
});

// POST /api/stationery/hr/inventory/import (HR: Import from CSV)
router.post('/hr/inventory/import', auth, checkHR, csvUpload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded.' });
    }

    const results = [];
    const errors = [];
    let rowCount = 0;

    // Read and parse CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        rowCount++;
        // Skip header row if it exists
        if (rowCount === 1 && data.sku?.toLowerCase() === 'sku') return;

        const { name, category, quantity, unit, description } = data;

        // Validate required fields
        if (!name) {
          errors.push(`Row ${rowCount}: Name is required`);
          return;
        }

        results.push({
          name: name.trim(),
          category: category ? category.trim() : 'General',
          quantity: quantity ? parseInt(quantity) || 0 : 0,
          unit: unit ? unit.trim() : 'pieces',
          description: description ? description.trim() : '',
          isActive: true
        });
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          if (results.length === 0) {
            return res.status(400).json({ message: 'No valid data found in CSV file.' });
          }

          // Insert items in bulk
          const insertedItems = [];
          const skippedItems = [];

          for (const item of results) {
            try {
              // Check if SKU already exists
              const existingItem = await Stationery.findOne({ name: item.name });
              if (existingItem) {
                skippedItems.push(`${item.name}: Name already exists`);
                continue;
              }

              const newItem = new Stationery(item);
              await newItem.save();
              insertedItems.push(newItem);
            } catch (error) {
              errors.push(`${item.name}: ${error.message}`);
            }
          }

          res.json({
            message: `Import completed. ${insertedItems.length} items added, ${skippedItems.length} skipped.`,
            inserted: insertedItems.length,
            skipped: skippedItems.length,
            errors: errors.length,
            details: {
              inserted: insertedItems.map(item => ({ sku: item.sku, itemName: item.itemName })),
              skipped: skippedItems,
              errors
            }
          });
        } catch (error) {
          res.status(500).json({ message: 'Error processing import', error: error.message });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Error reading CSV file', error: error.message });
      });
  } catch (error) {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error importing CSV', error: error.message });
  }
});

// GET /api/stationery/hr/inventory/sample-csv (HR: Download sample CSV)
router.get('/hr/inventory/sample-csv', auth, checkHR, (req, res) => {
  const sampleData = `sku,itemName,category,currentStock
PEN001,Blue Ballpoint Pen,Stationery,100
PAP001,A4 White Paper,Paper,500
CLIP001,Paper Clips,Accessories,200
NOTE001,Sticky Notes,Stationery,50`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="stationery_inventory_sample.csv"');
  res.send(sampleData);
});

// POST /api/stationery/hr/stock-in/:id (HR: Add stock to existing item)
router.post('/hr/stock-in/:id', auth, checkHR, async (req, res) => {
  try {
    const { quantity, remarks } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Valid quantity is required.' });
    }

    const item = await Stationery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Add quantity to existing stock
    item.quantity = (item.quantity || 0) + parseInt(quantity);
    await item.save();

    res.json({
      message: `Stock added successfully. New quantity: ${item.quantity}`,
      item,
      addedQuantity: parseInt(quantity),
      remarks: remarks || ''
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding stock', error: error.message });
  }
});

// POST /api/stationery/hr/stock-adjust/:id (HR: Manual stock adjustment)
router.post('/hr/stock-adjust/:id', auth, checkHR, async (req, res) => {
  try {
    const { newQuantity, reason } = req.body;
    
    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ message: 'Valid new quantity is required.' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Reason for adjustment is required.' });
    }

    const item = await Stationery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const oldQuantity = item.quantity;
    const difference = parseInt(newQuantity) - oldQuantity;

    // Update quantity
    item.quantity = parseInt(newQuantity);
    await item.save();

    // Create adjustment log
    const adjustmentLog = new InventoryAdjustmentLog({
      item: item._id,
      itemName: item.name,
      itemCategory: item.category,
      oldQuantity,
      newQuantity: parseInt(newQuantity),
      difference,
      unit: item.unit,
      reason: reason.trim(),
      adjustedBy: req.user._id,
      adjustedByUsername: req.user.username
    });
    await adjustmentLog.save();

    res.json({
      message: 'Stock adjusted successfully',
      item,
      oldQuantity,
      newQuantity: parseInt(newQuantity),
      difference,
      reason
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adjusting stock', error: error.message });
  }
});

// GET /api/stationery/hr/adjustment-logs (HR: Get all adjustment logs)
router.get('/hr/adjustment-logs', auth, checkHR, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    // Search by item name or reason
    if (search && search.trim() !== '') {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { adjustedByUsername: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await InventoryAdjustmentLog.find(query)
      .populate('item', 'name category unit')
      .populate('adjustedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InventoryAdjustmentLog.countDocuments(query);

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching adjustment logs', error: error.message });
  }
});

export default router;