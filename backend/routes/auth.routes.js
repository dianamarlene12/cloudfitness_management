const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Registration route
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
  ],
  validate,
  register
);

// Login route
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validate,
  login
);

// Logout route
router.post('/logout', logout);

// Current user profile (authenticated)
router.get('/me', authenticateToken, getMe);

module.exports = router;
