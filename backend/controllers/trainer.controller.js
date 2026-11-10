const { query } = require('../config/db');

/**
 * List all trainers with specialization, rating, client load
 */
async function getTrainers(req, res, next) {
  try {
    const [trainers] = await query(`
      SELECT 
        t.id, t.user_id, u.name, u.email, u.status, t.specialization, t.bio,
        t.availability, t.hourly_rate, t.rating, t.max_clients, t.image_url,
        (SELECT COUNT(DISTINCT wp.member_id) FROM workout_plans wp WHERE wp.trainer_id = t.id AND wp.status = 'active') AS current_client_count
      FROM trainers t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.rating DESC, t.id ASC
    `);

    res.json({
      success: true,
      data: trainers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single trainer by ID
 */
async function getTrainerById(req, res, next) {
  try {
    const trainerId = parseInt(req.params.id, 10);

    const [trainers] = await query(`
      SELECT 
        t.id, t.user_id, u.name, u.email, u.status, t.specialization, t.bio,
        t.availability, t.hourly_rate, t.rating, t.max_clients, t.image_url,
        (SELECT COUNT(DISTINCT wp.member_id) FROM workout_plans wp WHERE wp.trainer_id = t.id AND wp.status = 'active') AS current_client_count
      FROM trainers t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [trainerId]);

    if (trainers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found.'
      });
    }

    // Fetch assigned workout plan clients
    const [clients] = await query(`
      SELECT wp.id AS plan_id, wp.plan_name, wp.target_goal, mem.id AS member_id, u.name AS member_name, u.email
      FROM workout_plans wp
      JOIN members mem ON wp.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      WHERE wp.trainer_id = ? AND wp.status = 'active'
    `, [trainerId]);

    // Fetch upcoming schedule slots
    const [schedule] = await query(`
      SELECT ts.id, ts.title, ts.session_date, ts.start_time, ts.end_time, ts.status,
             u.name AS booked_member_name
      FROM trainer_schedules ts
      LEFT JOIN members mem ON ts.member_id = mem.id
      LEFT JOIN users u ON mem.user_id = u.id
      WHERE ts.trainer_id = ? AND ts.session_date >= CURDATE()
      ORDER BY ts.session_date ASC, ts.start_time ASC
    `, [trainerId]);

    res.json({
      success: true,
      data: {
        ...trainers[0],
        clients,
        schedule
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update trainer profile and availability
 * Allowed: Admin or the Trainer themselves
 */
async function updateTrainer(req, res, next) {
  try {
    const trainerId = parseInt(req.params.id, 10);
    const { specialization, bio, availability, hourly_rate, max_clients } = req.body;

    if (req.user.role === 'trainer' && req.user.trainer_id !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own trainer profile.'
      });
    }

    let updates = [];
    let params = [];

    if (specialization !== undefined) { updates.push('specialization = ?'); params.push(specialization); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (availability !== undefined) { updates.push('availability = ?'); params.push(availability); }
    if (hourly_rate !== undefined) { updates.push('hourly_rate = ?'); params.push(hourly_rate); }
    if (max_clients !== undefined && req.user.role === 'admin') { updates.push('max_clients = ?'); params.push(max_clients); }

    if (updates.length > 0) {
      params.push(trainerId);
      await query(`UPDATE trainers SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({
      success: true,
      message: 'Trainer profile successfully updated.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTrainers,
  getTrainerById,
  updateTrainer
};
