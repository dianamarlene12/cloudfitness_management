const express = require('express');
const { body } = require('express-validator');
const { getSchedules, createSlot, bookSession } = require('../controllers/schedule.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// List slots
router.get('/', authenticateToken, getSchedules);

// Create slot (Trainer or Admin)
router.post(
  '/slots',
  authenticateToken,
  requireRole(['admin', 'trainer']),
  [
    body('session_date').isDate().withMessage('Valid session_date (YYYY-MM-DD) is required.'),
    body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid start_time (HH:MM or HH:MM:SS) is required.'),
    body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid end_time (HH:MM or HH:MM:SS) is required.')
  ],
  validate,
  createSlot
);

// Book slot (Member or Admin)
router.post(
  '/book',
  authenticateToken,
  [body('slot_id').isInt().withMessage('Valid slot_id is required.')],
  validate,
  bookSession
);

module.exports = router;
