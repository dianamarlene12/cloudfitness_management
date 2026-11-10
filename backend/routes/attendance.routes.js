const express = require('express');
const { checkIn, checkOut, getAttendanceLog, getAttendanceTelemetry } = require('../controllers/attendance.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

// Turnstile check-in (supports RFID kiosk / terminal simulation)
router.post('/check-in', checkIn);

// Turnstile check-out
router.post('/check-out', checkOut);

// Live telemetry metrics (Staff & Telemetry HUD)
router.get('/telemetry', getAttendanceTelemetry);

// Attendance audit log (Staff only)
router.get('/history', authenticateToken, requireRole(['admin', 'trainer']), getAttendanceLog);

module.exports = router;
