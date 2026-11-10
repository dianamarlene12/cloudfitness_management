const { query } = require('../config/db');

/**
 * Get comprehensive dashboard statistics
 */
async function getDashboardStats(req, res, next) {
  try {
    // 1. Total Registered Members
    const [[{ total_members }]] = await query('SELECT COUNT(*) AS total_members FROM members');

    // 2. Active Memberships
    const [[{ active_memberships }]] = await query(
      'SELECT COUNT(*) AS active_memberships FROM member_memberships WHERE status = "active" AND end_date >= CURDATE()'
    );

    // 3. Today's Attendance Check-ins
    const [[{ today_checkins }]] = await query(
      'SELECT COUNT(*) AS today_checkins FROM attendance WHERE DATE(check_in_time) = CURDATE()'
    );

    // 4. Currently on Gym Floor (checked_in and check_out_time is null)
    const [[{ current_occupancy }]] = await query(
      'SELECT COUNT(*) AS current_occupancy FROM attendance WHERE status = "checked_in" AND check_out_time IS NULL'
    );

    // 5. Trainer Count
    const [[{ trainer_count }]] = await query('SELECT COUNT(*) AS trainer_count FROM trainers');

    // 6. Total Revenue (from paid simulated payments)
    const [[{ total_revenue }]] = await query(
      'SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM payments WHERE status = "paid"'
    );

    // 7. Membership distribution by tier
    const [tierDistribution] = await query(`
      SELECT m.name AS tier_name, m.tier_code, COUNT(mm.id) AS subscriber_count
      FROM memberships m
      LEFT JOIN member_memberships mm ON mm.membership_id = m.id AND mm.status = 'active'
      GROUP BY m.id
    `);

    // 8. Peak occupancy estimation & average dwell time
    const [[{ avg_dwell_minutes }]] = await query(`
      SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time)), 1) AS avg_dwell_minutes
      FROM attendance
      WHERE check_out_time IS NOT NULL AND DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);

    // 9. Expiring memberships within next 14 days
    const [expiringSoon] = await query(`
      SELECT mm.id, u.name AS member_name, u.email, m.name AS plan_name, mm.end_date,
             DATEDIFF(mm.end_date, CURDATE()) AS days_left
      FROM member_memberships mm
      JOIN members mem ON mm.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      JOIN memberships m ON mm.membership_id = m.id
      WHERE mm.status = 'active' AND mm.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
      ORDER BY mm.end_date ASC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total_members,
        active_memberships,
        today_checkins,
        current_occupancy,
        trainer_count,
        total_revenue: parseFloat(total_revenue),
        avg_dwell_minutes: avg_dwell_minutes || 65,
        tier_distribution: tierDistribution,
        expiring_soon: expiringSoon,
        telemetry_synced_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get recent gym activity stream (check-ins, payments, onboarding)
 */
async function getRecentActivity(req, res, next) {
  try {
    // 5 Most recent attendance events
    const [attendanceActivity] = await query(`
      SELECT a.id, a.check_in_time, a.status, a.access_method, a.turnstile_id,
             u.name AS member_name, mem.rfid_tag
      FROM attendance a
      JOIN members mem ON a.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      ORDER BY a.check_in_time DESC LIMIT 6
    `);

    // 5 Most recent payments
    const [paymentActivity] = await query(`
      SELECT p.id, p.invoice_number, p.amount, p.currency, p.payment_method, p.payment_date, p.status,
             u.name AS member_name
      FROM payments p
      JOIN members mem ON p.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      ORDER BY p.payment_date DESC LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        recent_attendance: attendanceActivity,
        recent_payments: paymentActivity
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getRecentActivity
};
