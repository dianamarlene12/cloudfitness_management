const express = require('express');
const { body } = require('express-validator');
const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  toggleMemberStatus
} = require('../controllers/member.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// List members (Admin and Trainer only)
router.get('/', authenticateToken, requireRole(['admin', 'trainer']), getMembers);

// Create member (Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('phone').optional().trim()
  ],
  validate,
  createMember
);

// Get single member details (Self or Admin/Trainer)
router.get('/:id', authenticateToken, getMemberById);

// Update member details (Self or Admin)
router.put('/:id', authenticateToken, updateMember);

// Activate / Deactivate member (Admin only)
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole('admin'),
  [body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Status must be active, inactive, or suspended.')],
  validate,
  toggleMemberStatus
);

module.exports = router;
