const express = require('express');
const { body } = require('express-validator');
const {
  getPlans,
  getSubscriptions,
  subscribeMember,
  toggleAutoRenew,
  getExpiringMemberships
} = require('../controllers/membership.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// Publicly available plans (for pricing section on landing page)
router.get('/plans', getPlans);

// List all member subscriptions (Admin & Trainer)
router.get('/subscriptions', authenticateToken, requireRole(['admin', 'trainer']), getSubscriptions);

// Expiring subscriptions (Admin)
router.get('/expiring', authenticateToken, requireRole(['admin', 'trainer']), getExpiringMemberships);

// Create / Subscribe member to plan (Admin or Member self)
router.post(
  '/subscribe',
  authenticateToken,
  [
    body('member_id').isInt().withMessage('Valid member_id is required.'),
    body('membership_id').isInt().withMessage('Valid membership_id is required.')
  ],
  validate,
  subscribeMember
);

// Toggle auto-renew on subscription
router.patch(
  '/subscriptions/:id/auto-renew',
  authenticateToken,
  [body('auto_renew').isBoolean().withMessage('auto_renew must be boolean.')],
  validate,
  toggleAutoRenew
);

module.exports = router;
