const { query } = require('../config/db');

/**
 * Get trainer schedules
 */
async function getSchedules(req, res, next) {
  try {
    const { trainer_id, date, status } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (trainer_id) {
      conditions.push('ts.trainer_id = ?');
      params.push(parseInt(trainer_id, 10));
    }

    if (date) {
      conditions.push('ts.session_date = ?');
      params.push(date);
    }

    if (status) {
      conditions.push('ts.status = ?');
      params.push(status);
    }

    const [rows] = await query(`
      SELECT ts.id, ts.trainer_id, ts.member_id, ts.title, ts.session_date,
             ts.start_time, ts.end_time, ts.status, ts.notes,
             u_tr.name AS trainer_name, tr.specialization,
             u_mem.name AS member_name, u_mem.email AS member_email
      FROM trainer_schedules ts
      JOIN trainers tr ON ts.trainer_id = tr.id
      JOIN users u_tr ON tr.user_id = u_tr.id
      LEFT JOIN members mem ON ts.member_id = mem.id
      LEFT JOIN users u_mem ON mem.user_id = u_mem.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ts.session_date ASC, ts.start_time ASC
    `, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create an available slot or direct session (Trainer or Admin)
 * Checks for overlapping / double-booking slots for the trainer.
 */
async function createSlot(req, res, next) {
  try {
    const { trainer_id, title = 'Personal Training Session', session_date, start_time, end_time, notes } = req.body;

    const assignedTrainerId = req.user.role === 'trainer' ? req.user.trainer_id : trainer_id;

    if (!assignedTrainerId) {
      return res.status(400).json({ success: false, message: 'trainer_id is required.' });
    }

    // Check for double booking / overlapping time slot for this trainer on that date
    const [overlap] = await query(`
      SELECT id, title, start_time, end_time FROM trainer_schedules
      WHERE trainer_id = ? 
        AND session_date = ? 
        AND status != 'cancelled'
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      LIMIT 1
    `, [assignedTrainerId, session_date, start_time, start_time, end_time, end_time, start_time, end_time]);

    if (overlap.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Schedule conflict: Trainer already has a session or slot scheduled between ${overlap[0].start_time} and ${overlap[0].end_time} on ${session_date}.`
      });
    }

    const [result] = await query(`
      INSERT INTO trainer_schedules (trainer_id, title, session_date, start_time, end_time, status, notes)
      VALUES (?, ?, ?, ?, ?, 'available', ?)
    `, [assignedTrainerId, title.trim(), session_date, start_time, end_time, notes || null]);

    res.status(201).json({
      success: true,
      message: 'Time slot created and opened for bookings!',
      slot_id: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Book an available session slot (Member or Admin)
 */
async function bookSession(req, res, next) {
  try {
    const { slot_id, member_id, notes } = req.body;

    const bookingMemberId = req.user.role === 'member' ? req.user.member_id : member_id;

    if (!bookingMemberId) {
      return res.status(400).json({ success: false, message: 'member_id is required.' });
    }

    // Check slot availability
    const [slots] = await query(`
      SELECT ts.id, ts.trainer_id, ts.session_date, ts.start_time, ts.end_time, ts.status,
             u.name AS trainer_name, tr.user_id AS trainer_user_id
      FROM trainer_schedules ts
      JOIN trainers tr ON ts.trainer_id = tr.id
      JOIN users u ON tr.user_id = u.id
      WHERE ts.id = ?
    `, [slot_id]);

    if (slots.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule slot not found.' });
    }

    const slot = slots[0];
    if (slot.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: `This session slot is no longer available (current status: ${slot.status}).`
      });
    }

    // Update slot to booked
    await query(`
      UPDATE trainer_schedules
      SET member_id = ?, status = 'booked', notes = COALESCE(?, notes)
      WHERE id = ?
    `, [bookingMemberId, notes || null, slot_id]);

    // Send notifications to trainer
    await query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'New Session Booked', ?, 'info')
    `, [slot.trainer_user_id, `A session on ${slot.session_date} at ${slot.start_time} has been booked.`]);

    res.json({
      success: true,
      message: `Session with coach ${slot.trainer_name} successfully booked!`,
      session: {
        slot_id,
        date: slot.session_date,
        time: `${slot.start_time} - ${slot.end_time}`
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSchedules,
  createSlot,
  bookSession
};
