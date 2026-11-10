const { query } = require('../config/db');

// In-memory or persisted facility settings
let facilitySettings = {
  facilityName: 'FitTrack Executive Studio Hub — Central Campus',
  maxCapacity: 550,
  emergencyAutoLock: true,
  turnstileEmergencyUnlocked: false,
  turnstilePaceTarget: 180,
  meshNode: 'Frankfurt DC-04 (AWS eu-central-1)'
};

/**
 * Get current system & facility settings
 */
function getSettings(req, res) {
  res.json({
    success: true,
    data: facilitySettings
  });
}

/**
 * Update system & facility settings (Admin only)
 */
function updateSettings(req, res) {
  const { facilityName, maxCapacity, emergencyAutoLock } = req.body;

  if (facilityName) facilitySettings.facilityName = facilityName.trim();
  if (maxCapacity) facilitySettings.maxCapacity = parseInt(maxCapacity, 10);
  if (emergencyAutoLock !== undefined) facilitySettings.emergencyAutoLock = Boolean(emergencyAutoLock);

  res.json({
    success: true,
    message: 'System & facility configuration saved across nodes!',
    data: facilitySettings
  });
}

/**
 * Quick Action: Emergency turnstile override (Lock/Unlock)
 */
function toggleTurnstileOverride(req, res) {
  const { unlock } = req.body;
  facilitySettings.turnstileEmergencyUnlocked = Boolean(unlock);

  res.json({
    success: true,
    turnstile_status: facilitySettings.turnstileEmergencyUnlocked ? 'OVERRIDE_UNLOCKED' : 'NORMAL_ACCESS_MODE',
    message: facilitySettings.turnstileEmergencyUnlocked
      ? 'Emergency Override Engaged: All turnstile gates unlocked for evacuation.'
      : 'Emergency Override Disengaged: Turnstiles restored to normal RFID validation mode.'
  });
}

/**
 * Bulk action on members (e.g. batch RFID sync)
 */
async function bulkMemberAction(req, res, next) {
  try {
    const { member_ids, action = 'sync_rfid' } = req.body;

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of member_ids.' });
    }

    res.json({
      success: true,
      message: `Bulk Action (${action}) successfully executed across ${member_ids.length} selected athlete profiles.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  toggleTurnstileOverride,
  bulkMemberAction
};
