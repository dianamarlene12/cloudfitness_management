const { query } = require('../config/db');

/**
 * Automated Turnstile Check-In Simulation
 * Validates member existence, active account, active membership, and checks for duplicate active sessions.
 */
async function checkIn(req, res, next) {
  try {
    const { rfid_tag, member_id, access_method = 'rfid', turnstile_id = 'Gate-Bay-01' } = req.body;

    // 1. Resolve member either by rfid_tag or member_id
    let memberRows = [];
    if (rfid_tag) {
      [memberRows] = await query(`
        SELECT m.id, m.user_id, m.rfid_tag, u.name, u.email, u.status AS user_status
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.rfid_tag = ?
      `, [rfid_tag.trim()]);
    } else if (member_id) {
      [memberRows] = await query(`
        SELECT m.id, m.user_id, m.rfid_tag, u.name, u.email, u.status AS user_status
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `, [parseInt(member_id, 10)]);
    }

    if (memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        gate_status: 'LOCKED',
        reason: 'UNRECOGNIZED_BADGE',
        message: 'Turnstile Access Denied: Unrecognized RFID badge or Member ID.'
      });
    }

    const member = memberRows[0];

    // 2. Validate member account status
    if (member.user_status !== 'active') {
      return res.status(403).json({
        success: false,
        gate_status: 'LOCKED',
        reason: 'ACCOUNT_SUSPENDED',
        message: `Turnstile Access Denied: Athlete account for ${member.name} is currently suspended/inactive.`
      });
    }

    // 3. Validate active membership subscription
    const [activeMemberships] = await query(`
      SELECT mm.id, m.name AS plan_name, mm.end_date, mm.status
      FROM member_memberships mm
      JOIN memberships m ON mm.membership_id = m.id
      WHERE mm.member_id = ? AND mm.status = 'active' AND mm.end_date >= CURDATE()
      LIMIT 1
    `, [member.id]);

    if (activeMemberships.length === 0) {
      return res.status(403).json({
        success: false,
        gate_status: 'LOCKED',
        reason: 'MEMBERSHIP_EXPIRED_OR_INACTIVE',
        message: `Turnstile Access Denied: ${member.name} does not have an active membership plan or plan has expired.`
      });
    }

    const currentPlan = activeMemberships[0];

    // 4. Prevent duplicate active check-ins (Already inside facility)
    const [existingCheckin] = await query(`
      SELECT id, check_in_time, turnstile_id
      FROM attendance
      WHERE member_id = ? AND status = 'checked_in' AND check_out_time IS NULL
      LIMIT 1
    `, [member.id]);

    if (existingCheckin.length > 0) {
      return res.status(409).json({
        success: false,
        gate_status: 'LOCKED',
        reason: 'DUPLICATE_CHECKIN',
        message: `Duplicate Access Attempt: ${member.name} is ALREADY checked in since ${new Date(existingCheckin[0].check_in_time).toLocaleTimeString()}. Member must check out before checking in again.`,
        active_session: existingCheckin[0]
      });
    }

    // 5. Grant access and record timestamp
    const [insertResult] = await query(`
      INSERT INTO attendance (member_id, check_in_time, access_method, status, turnstile_id, notes)
      VALUES (?, NOW(), ?, 'checked_in', ?, 'Turnstile access clearance verified')
    `, [member.id, access_method, turnstile_id]);

    // Create entry notification for member
    await query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Turnstile Access Granted', ?, 'success')
    `, [member.user_id, `Checked in at ${turnstile_id} (${currentPlan.plan_name}).`]);

    res.status(200).json({
      success: true,
      gate_status: 'UNLOCKED',
      message: `Access Granted! Welcome to FitTrack, ${member.name}. Turnstile ${turnstile_id} open.`,
      attendance_id: insertResult.insertId,
      member: {
        id: member.id,
        name: member.name,
        rfid_tag: member.rfid_tag,
        plan: currentPlan.plan_name
      },
      check_in_time: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Automated Turnstile Check-Out Simulation
 */
async function checkOut(req, res, next) {
  try {
    const { rfid_tag, member_id, turnstile_id = 'Gate-Bay-01' } = req.body;

    let memberRows = [];
    if (rfid_tag) {
      [memberRows] = await query('SELECT m.id, m.user_id, u.name FROM members m JOIN users u ON m.user_id = u.id WHERE m.rfid_tag = ?', [rfid_tag.trim()]);
    } else if (member_id) {
      [memberRows] = await query('SELECT m.id, m.user_id, u.name FROM members m JOIN users u ON m.user_id = u.id WHERE m.id = ?', [parseInt(member_id, 10)]);
    }

    if (memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Turnstile Exit Denied: Unrecognized RFID badge or Member ID.'
      });
    }

    const member = memberRows[0];

    // Find active checkin
    const [activeSessions] = await query(`
      SELECT id, check_in_time
      FROM attendance
      WHERE member_id = ? AND status = 'checked_in' AND check_out_time IS NULL
      ORDER BY id DESC LIMIT 1
    `, [member.id]);

    if (activeSessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No active check-in session found for ${member.name}. Member is not recorded as inside the facility.`
      });
    }

    const session = activeSessions[0];

    // Record check_out_time
    await query(`
      UPDATE attendance
      SET check_out_time = NOW(), status = 'checked_out', notes = 'Turnstile checkout completed'
      WHERE id = ?
    `, [session.id]);

    res.json({
      success: true,
      gate_status: 'UNLOCKED',
      message: `Exit Granted: Goodbye, ${member.name}! Turnstile ${turnstile_id} unlocked for exit.`,
      member_id: member.id,
      session_id: session.id,
      check_out_time: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List live attendance & historical log
 */
async function getAttendanceLog(req, res, next) {
  try {
    const { date, status, search, limit = 50 } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (date) {
      conditions.push('DATE(a.check_in_time) = ?');
      params.push(date);
    }

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push('(u.name LIKE ? OR mem.rfid_tag LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [rows] = await query(`
      SELECT a.id, a.member_id, a.check_in_time, a.check_out_time, a.access_method,
             a.status, a.turnstile_id, a.notes,
             u.name AS member_name, u.email AS member_email, mem.rfid_tag,
             TIMESTAMPDIFF(MINUTE, a.check_in_time, COALESCE(a.check_out_time, NOW())) AS duration_minutes
      FROM attendance a
      JOIN members mem ON a.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.check_in_time DESC
      LIMIT ?
    `, [...params, parseInt(limit, 10)]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get real-time facility telemetry (occupancy and hourly breakdown)
 */
async function getAttendanceTelemetry(req, res, next) {
  try {
    const [[{ total_today }]] = await query('SELECT COUNT(*) AS total_today FROM attendance WHERE DATE(check_in_time) = CURDATE()');
    const [[{ inside_now }]] = await query('SELECT COUNT(*) AS inside_now FROM attendance WHERE status = "checked_in" AND check_out_time IS NULL');

    // Hourly distribution for today
    const [hourly] = await query(`
      SELECT HOUR(check_in_time) AS hour_of_day, COUNT(*) AS count
      FROM attendance
      WHERE DATE(check_in_time) = CURDATE()
      GROUP BY HOUR(check_in_time)
      ORDER BY hour_of_day ASC
    `);

    res.json({
      success: true,
      data: {
        total_today,
        inside_now,
        hourly_breakdown: hourly
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getAttendanceLog,
  getAttendanceTelemetry
};
