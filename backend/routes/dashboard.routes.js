const express = require('express');
const { getDashboardStats, getRecentActivity } = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Both authenticated staff and members can view high-level telemetry stats
router.get('/stats', authenticateToken, getDashboardStats);
router.get('/recent-activity', authenticateToken, getRecentActivity);

module.exports = router;
