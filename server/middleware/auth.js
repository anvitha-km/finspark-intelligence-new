import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'finspark-enterprise-secret-key-2026';

/**
 * Enterprise JWT Authentication Middleware
 * 
 * In production, this validates the Bearer token passed from the frontend
 * or third-party API clients.
 */
export const requireAuth = (req, res, next) => {
  // For hackathon demo purposes, we bypass this globally so the React UI 
  // continues working seamlessly without needing a full Redux auth state rewrite.
  // In a real enterprise deployment, this bypass is removed.
  if (process.env.REQUIRE_AUTH !== 'true') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach tenant and role claims to the request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Expired or invalid token' });
  }
};
