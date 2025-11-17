import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
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
      permissions: user.permissions
    };

    res.json({
      message: 'Login successful',
      user: userData,
      token: token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;