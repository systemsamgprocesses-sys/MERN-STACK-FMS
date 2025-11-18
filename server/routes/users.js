import express from 'express';
import User from '../models/User.js';
import { createAdjustmentLog } from './adjustmentLogs.js';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { username, email, password, role, permissions, createdBy } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      username,
      email,
      password,
      role: role || 'employee',
      permissions: permissions || {}
    });

    await user.save();

    // Log the adjustment
    if (createdBy) {
      try {
        await createAdjustmentLog({
          adjustedBy: createdBy,
          affectedUser: user._id,
          adjustmentType: 'user_created',
          description: `User "${username}" created with role "${role || 'employee'}"`,
          newValue: { username, email, role: role || 'employee', permissions },
          ipAddress: req.ip
        });
      } catch (logError) {
        console.error('Failed to log user creation:', logError);
      }
    }

    // Return user without password
    const userData = await User.findById(user._id).select('-password');
    res.status(201).json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { username, email, role, permissions, isActive, phoneNumber, updatedBy } = req.body;

    // Get old user data for comparison
    const oldUser = await User.findById(req.params.id).select('-password');
    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, permissions, isActive, phoneNumber },
      { new: true }
    ).select('-password');

    // Log the changes
    if (updatedBy) {
      try {
        const changes = [];
        if (oldUser.username !== username) changes.push(`username: "${oldUser.username}" → "${username}"`);
        if (oldUser.email !== email) changes.push(`email: "${oldUser.email}" → "${email}"`);
        if (oldUser.role !== role) changes.push(`role: "${oldUser.role}" → "${role}"`);
        if (oldUser.phoneNumber !== phoneNumber) changes.push(`phone: "${oldUser.phoneNumber || 'N/A'}" → "${phoneNumber || 'N/A'}"`);
        if (oldUser.isActive !== isActive) changes.push(`status: ${oldUser.isActive ? 'Active' : 'Inactive'} → ${isActive ? 'Active' : 'Inactive'}`);
        
        if (changes.length > 0) {
          await createAdjustmentLog({
            adjustedBy: updatedBy,
            affectedUser: user._id,
            adjustmentType: oldUser.role !== role ? 'role_changed' : oldUser.isActive !== isActive ? 'status_changed' : 'user_updated',
            description: `User "${user.username}" updated: ${changes.join(', ')}`,
            oldValue: { username: oldUser.username, email: oldUser.email, role: oldUser.role, permissions: oldUser.permissions, isActive: oldUser.isActive, phoneNumber: oldUser.phoneNumber },
            newValue: { username, email, role, permissions, isActive, phoneNumber },
            ipAddress: req.ip
          });
        }
      } catch (logError) {
        console.error('Failed to log user update:', logError);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { deletedBy } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the deletion
    if (deletedBy) {
      try {
        await createAdjustmentLog({
          adjustedBy: deletedBy,
          affectedUser: user._id,
          adjustmentType: 'user_deleted',
          description: `User "${user.username}" deactivated (soft delete)`,
          oldValue: { isActive: true },
          newValue: { isActive: false },
          ipAddress: req.ip
        });
      } catch (logError) {
        console.error('Failed to log user deletion:', logError);
      }
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user password
router.put('/:id/password', async (req, res) => {
  try {
    const { password, updatedBy } = req.body;
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = password; // Make sure your User model has hashing in pre-save
    await user.save();

    // Log password reset
    if (updatedBy) {
      try {
        await createAdjustmentLog({
          adjustedBy: updatedBy,
          affectedUser: user._id,
          adjustmentType: 'password_reset',
          description: `Password reset for user "${user.username}"`,
          ipAddress: req.ip
        });
      } catch (logError) {
        console.error('Failed to log password reset:', logError);
      }
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


export default router;