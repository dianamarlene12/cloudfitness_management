const express = require('express');
const { getSettings, updateSettings, toggleTurnstileOverride, bulkMemberAction } = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/settings', getSettings);
router.post('/settings', updateSettings);
router.post('/turnstile/override', toggleTurnstileOverride);
router.post('/bulk-members', bulkMemberAction);

module.exports = router;
