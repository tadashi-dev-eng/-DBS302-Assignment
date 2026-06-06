const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access Token Missing (Unauthorized)' });
  }

  try {
    const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verifiedUser; // Inject user details (id, role) into request
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or Expired Token' });
  }
};

// Role-based Access Control Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]` });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };