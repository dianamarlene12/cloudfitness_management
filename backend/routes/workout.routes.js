const express = require('express');
const { body } = require('express-validator');
const {
  getWorkoutPlans,
  createWorkoutPlan,
  recordWorkoutLog,
  getWorkoutLogs
} = require('../controllers/workout.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// Get workout plans (Role-scoped)
router.get('/plans', authenticateToken, getWorkoutPlans);

// Create plan (Trainer or Admin)
router.post(
  '/plans',
  authenticateToken,
  requireRole(['admin', 'trainer']),
  [
    body('member_id').isInt().withMessage('Valid member_id is required.'),
    body('plan_name').trim().notEmpty().withMessage('Plan name is required.')
  ],
  validate,
  createWorkoutPlan
);

// Get workout logs
router.get('/logs', authenticateToken, getWorkoutLogs);

// Record workout log (Member or Trainer/Admin)
router.post(
  '/logs',
  authenticateToken,
  [
    body('exercise_name').trim().notEmpty().withMessage('Exercise name is required.'),
    body('sets').isInt({ min: 1 }).withMessage('Sets must be at least 1.'),
    body('reps').isInt({ min: 1 }).withMessage('Reps must be at least 1.')
  ],
  validate,
  recordWorkoutLog
);

module.exports = router;
