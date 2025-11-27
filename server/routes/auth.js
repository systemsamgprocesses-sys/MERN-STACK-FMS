import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const sanitizeInput = (value) => value?.toString().trim() || '';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      console.log('Login attempt with missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const identifier = sanitizeInput(username);
    const escapedIdentifier = escapeRegex(identifier);

    // Find user (case-insensitive username/email/phone search)
    const user = await User.findOne({
      isActive: true,
      $or: [
        { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
        { phoneNumber: identifier }
      ]
    });
    
    if (!user) {
      console.log('Login attempt failed - User not found:', identifier);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login attempt failed - Password mismatch for user:', identifier);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // Return user data (without password) and token
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      permissions: user.permissions
    };

    console.log('Login successful for user:', user.username, 'Role:', user.role);

    res.json({
      message: 'Login successful',
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.user;

    const canView = requester.role === 'superadmin' || requester._id.toString() === userId;
    if (!canView) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;