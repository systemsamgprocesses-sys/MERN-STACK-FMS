import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';

// Middleware to verify authentication
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware to verify admin access
export const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to verify superadmin access
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};

// Default export for backward compatibility
const auth = (req, res, next) => {
  return authenticateToken(req, res, next);
};

export default auth;