const express = require('express');
const { body } = require('express-validator');
const { getPayments, recordPayment } = require('../controllers/payment.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// List payments (Role-scoped: Admin views all, Member views own)
router.get('/', authenticateToken, getPayments);

// Record payment (Admin/Staff)
router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  [
    body('member_id').isInt().withMessage('Valid member_id is required.'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero.')
  ],
  validate,
  recordPayment
);

module.exports = router;
