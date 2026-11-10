const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fittrack_super_secure_jwt_secret_key_2026_xyz!';

/**
 * Authentication Middleware
 * Validates JWT token from HTTP-only cookie or Authorization header.
 * Attaches authenticated user object to req.user.
 */
async function authenticateToken(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } 
    // 2. Fall back to Authorization header (Bearer <token>)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication session. Please log in again.'
      });
    }

    // Verify user exists and is active in database
    const [users] = await query(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.'
      });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive or suspended. Please contact staff.'
      });
    }

    // Attach role-specific IDs if member or trainer
    if (user.role === 'member') {
      const [members] = await query('SELECT id, rfid_tag FROM members WHERE user_id = ?', [user.id]);
      if (members.length > 0) {
        user.member_id = members[0].id;
        user.rfid_tag = members[0].rfid_tag;
      }
    } else if (user.role === 'trainer') {
      const [trainers] = await query('SELECT id FROM trainers WHERE user_id = ?', [user.id]);
      if (trainers.length > 0) {
        user.trainer_id = trainers[0].id;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
