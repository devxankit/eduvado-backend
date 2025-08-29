import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // Debug logging
  console.log('[Protect Middleware] Headers:', req.headers);
  console.log('[Protect Middleware] Authorization header:', req.headers.authorization);

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('[Protect Middleware] Token extracted:', token ? 'Present' : 'Missing');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[Protect Middleware] JWT decoded:', decoded);
      
      req.user = await User.findById(decoded.userId).select('-password');
      console.log('[Protect Middleware] User found:', req.user ? 'Yes' : 'No');
      
      next();
      return;
    } catch (error) {
      console.error('[Protect Middleware] JWT verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('[Protect Middleware] No token found');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
}; 