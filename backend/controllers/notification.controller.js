const { query } = require('../config/db');

/**
 * Get current user's notifications
 */
async function getNotifications(req, res, next) {
  try {
    const [rows] = await query(`
      SELECT id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.user.id]);

    const [[{ unread_count }]] = await query(`
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ? AND is_read = FALSE
    `, [req.user.id]);

    res.json({
      success: true,
      unread_count,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a single notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id, 10);

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all user notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
