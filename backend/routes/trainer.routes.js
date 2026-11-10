const express = require('express');
const { getTrainers, getTrainerById, updateTrainer } = require('../controllers/trainer.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

// Publicly viewable trainer roster (landing page and member view)
router.get('/', getTrainers);

// Detailed trainer profile and shift schedule
router.get('/:id', authenticateToken, getTrainerById);

// Update trainer profile (Trainer self or Admin)
router.put('/:id', authenticateToken, requireRole(['admin', 'trainer']), updateTrainer);

module.exports = router;
