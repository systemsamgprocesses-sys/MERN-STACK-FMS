import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { createAdjustmentLog } from './adjustmentLogs.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarDirectory = path.join(__dirname, '../uploads/avatars');

if (!fs.existsSync(avatarDirectory)) {
  fs.mkdirSync(avatarDirectory, { recursive: true });
}

const allowedAvatarTypes = /jpeg|jpg|png|webp/;

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDirectory);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extname = allowedAvatarTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedAvatarTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only jpg, png, webp are allowed.'));
  }
});

const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : user;
  // eslint-disable-next-line no-unused-vars
  const { password, __v, ...rest } = userObj;
  const sanitized = { ...rest };
  if (sanitized._id) {
    sanitized.id = sanitized._id.toString();
    delete sanitized._id;
  }
  return sanitized;
};

const canManageProfile = (reqUser, targetId) => {
  if (!reqUser) return false;
  if (reqUser.role === 'superadmin') return true;
  return reqUser._id.toString() === targetId.toString();
};

// Get all users
// For admins/superadmins: returns all users
// For other users: returns only active users (for assignment purposes)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
    
    if (isAdmin) {
      // Admins can see all users
      const users = await User.find().select('-password');
      res.json(users);
    } else {
      // Regular users can only see active users (for task assignment)
      const users = await User.find({ isActive: true }).select('-password -permissions');
      res.json(users);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create user
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;

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
    const createdBy = req.user?._id;
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

// Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    return res.json({ success: true, user: sanitizeUser(req.user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get profile by user id (self or superadmin)
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canManageProfile(req.user, userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: sanitizeUser(targetUser) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update profile (self or superadmin on behalf)
router.put('/profile/:userId?', authenticateToken, avatarUpload.single('profilePicture'), async (req, res) => {
  try {
    const targetId = req.params.userId || req.user._id.toString();

    if (!canManageProfile(req.user, targetId)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this profile' });
    }

    const oldUser = await User.findById(targetId);
    if (!oldUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = {};
    const { username, email, phoneNumber, role, isActive } = req.body;

    if (typeof username !== 'undefined') updates.username = username.trim();
    if (typeof email !== 'undefined') updates.email = email.trim();
    if (typeof phoneNumber !== 'undefined') updates.phoneNumber = phoneNumber.trim();

    if (req.user.role === 'superadmin') {
      if (typeof role !== 'undefined') updates.role = role;
      if (typeof isActive !== 'undefined') updates.isActive = isActive === 'true' || isActive === true;
    }

    if (req.file) {
      updates.profilePicture = `/uploads/avatars/${req.file.filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, user: sanitizeUser(oldUser) });
    }

    const updatedUser = await User.findByIdAndUpdate(targetId, updates, { new: true }).select('-password');

    const changes = [];
    if (typeof updates.username !== 'undefined' && oldUser.username !== updatedUser.username) {
      changes.push(`username: "${oldUser.username}" → "${updatedUser.username}"`);
    }
    if (typeof updates.email !== 'undefined' && oldUser.email !== updatedUser.email) {
      changes.push(`email: "${oldUser.email}" → "${updatedUser.email}"`);
    }
    if (typeof updates.phoneNumber !== 'undefined' && oldUser.phoneNumber !== updatedUser.phoneNumber) {
      changes.push(`phone: "${oldUser.phoneNumber || 'N/A'}" → "${updatedUser.phoneNumber || 'N/A'}"`);
    }
    if (typeof updates.role !== 'undefined' && oldUser.role !== updatedUser.role) {
      changes.push(`role: "${oldUser.role}" → "${updatedUser.role}"`);
    }
    if (typeof updates.isActive !== 'undefined' && oldUser.isActive !== updatedUser.isActive) {
      changes.push(`status: ${oldUser.isActive ? 'Active' : 'Inactive'} → ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
    }
    if (req.file) {
      changes.push('profile picture updated');
    }

    if (changes.length > 0) {
      try {
        await createAdjustmentLog({
          adjustedBy: req.user._id,
          affectedUser: updatedUser._id,
          adjustmentType: 'profile_updated',
          description: `Profile updated: ${changes.join(', ')}`,
          oldValue: {
            username: oldUser.username,
            email: oldUser.email,
            phoneNumber: oldUser.phoneNumber,
            role: oldUser.role,
            profilePicture: oldUser.profilePicture,
            isActive: oldUser.isActive
          },
          newValue: {
            username: updatedUser.username,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            role: updatedUser.role,
            profilePicture: updatedUser.profilePicture,
            isActive: updatedUser.isActive
          },
          ipAddress: req.ip
        });
      } catch (logError) {
        console.error('Failed to log profile update:', logError);
      }
    }

    return res.json({ success: true, user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, role, permissions, isActive, phoneNumber } = req.body;

    // Get old user data for comparison
    const oldUser = await User.findById(req.params.id).select('-password');
    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) {
      // Handle both string and boolean values
      updateData.isActive = isActive === 'true' || isActive === true;
    }
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    // Validate required fields if being updated
    if (updateData.username !== undefined && !updateData.username.trim()) {
      return res.status(400).json({ message: 'Username cannot be empty' });
    }
    if (updateData.email !== undefined && !updateData.email.trim()) {
      return res.status(400).json({ message: 'Email cannot be empty' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    // Log the changes
    const updatedBy = req.user?._id;
    if (updatedBy) {
      try {
        const changes = [];
        if (updateData.username !== undefined && oldUser.username !== user.username) {
          changes.push(`username: "${oldUser.username}" → "${user.username}"`);
        }
        if (updateData.email !== undefined && oldUser.email !== user.email) {
          changes.push(`email: "${oldUser.email}" → "${user.email}"`);
        }
        if (updateData.role !== undefined && oldUser.role !== user.role) {
          changes.push(`role: "${oldUser.role}" → "${user.role}"`);
        }
        if (updateData.phoneNumber !== undefined && oldUser.phoneNumber !== user.phoneNumber) {
          changes.push(`phone: "${oldUser.phoneNumber || 'N/A'}" → "${user.phoneNumber || 'N/A'}"`);
        }
        if (updateData.isActive !== undefined && oldUser.isActive !== user.isActive) {
          changes.push(`status: ${oldUser.isActive ? 'Active' : 'Inactive'} → ${user.isActive ? 'Active' : 'Inactive'}`);
        }
        
        if (changes.length > 0) {
          await createAdjustmentLog({
            adjustedBy: updatedBy,
            affectedUser: user._id,
            adjustmentType: updateData.role !== undefined && oldUser.role !== user.role ? 'role_changed' : 
                           updateData.isActive !== undefined && oldUser.isActive !== user.isActive ? 'status_changed' : 
                           'user_updated',
            description: `User "${user.username}" updated: ${changes.join(', ')}`,
            oldValue: { 
              username: oldUser.username, 
              email: oldUser.email, 
              role: oldUser.role, 
              permissions: oldUser.permissions || {}, 
              isActive: oldUser.isActive, 
              phoneNumber: oldUser.phoneNumber 
            },
            newValue: { 
              username: user.username, 
              email: user.email, 
              role: user.role, 
              permissions: user.permissions || {}, 
              isActive: user.isActive, 
              phoneNumber: user.phoneNumber 
            },
            ipAddress: req.ip
          });
        }
      } catch (logError) {
        console.error('Failed to log user update:', logError);
        // Don't fail the request if logging fails
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the deletion
    const deletedBy = req.user?._id;
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
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const targetId = req.params.id;
    if (!canManageProfile(req.user, targetId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

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
    try {
      await createAdjustmentLog({
        adjustedBy: req.user._id,
        affectedUser: user._id,
        adjustmentType: req.user._id.toString() === targetId ? 'password_changed_self' : 'password_reset',
        description: `Password updated for user "${user.username}" by ${req.user.username}`,
        ipAddress: req.ip
      });
    } catch (logError) {
      console.error('Failed to log password update:', logError);
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


export default router;