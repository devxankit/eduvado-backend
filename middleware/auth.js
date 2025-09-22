import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  console.log('🔐 Auth middleware started for:', req.path);
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('✅ Token verified for user:', decoded.userId);
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
}; 