const { query } = require('../config/db');

/**
 * Get workout plans
 * Members view only their own plans.
 * Trainers view assigned plans.
 * Admins view all.
 */
async function getWorkoutPlans(req, res, next) {
  try {
    let conditions = ['1=1'];
    let params = [];

    if (req.user.role === 'member') {
      conditions.push('wp.member_id = ?');
      params.push(req.user.member_id);
    } else if (req.user.role === 'trainer') {
      conditions.push('wp.trainer_id = ?');
      params.push(req.user.trainer_id);
    }

    const [rows] = await query(`
      SELECT wp.id, wp.plan_name, wp.description, wp.target_goal, wp.status, wp.created_at,
             mem.id AS member_id, u_mem.name AS member_name,
             tr.id AS trainer_id, u_tr.name AS trainer_name
      FROM workout_plans wp
      JOIN members mem ON wp.member_id = mem.id
      JOIN users u_mem ON mem.user_id = u_mem.id
      LEFT JOIN trainers tr ON wp.trainer_id = tr.id
      LEFT JOIN users u_tr ON tr.user_id = u_tr.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY wp.id DESC
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
 * Create a new workout plan (Trainer or Admin)
 */
async function createWorkoutPlan(req, res, next) {
  try {
    const { member_id, trainer_id, plan_name, description, target_goal } = req.body;

    const assignedTrainer = req.user.role === 'trainer' ? req.user.trainer_id : (trainer_id || null);

    const [result] = await query(`
      INSERT INTO workout_plans (member_id, trainer_id, plan_name, description, target_goal, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [member_id, assignedTrainer, plan_name.trim(), description || null, target_goal || null]);

    // Send notification to member
    const [member] = await query('SELECT user_id FROM members WHERE id = ?', [member_id]);
    if (member.length > 0) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New Workout Plan Assigned', ?, 'info')
      `, [member[0].user_id, `Your coach has assigned a new protocol: "${plan_name.trim()}".`]);
    }

    res.status(201).json({
      success: true,
      message: `Workout plan "${plan_name}" assigned successfully!`,
      plan_id: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Record a completed workout log (exercise, sets, reps, weight)
 */
async function recordWorkoutLog(req, res, next) {
  try {
    const { workout_plan_id, member_id, exercise_name, sets = 3, reps = 10, weight_kg = 0, completed_date, notes } = req.body;

    const targetMemberId = req.user.role === 'member' ? req.user.member_id : member_id;

    if (!targetMemberId) {
      return res.status(400).json({ success: false, message: 'member_id is required.' });
    }

    const dateToRecord = completed_date || new Date().toISOString().split('T')[0];

    const [result] = await query(`
      INSERT INTO workout_logs (workout_plan_id, member_id, exercise_name, sets, reps, weight_kg, completed_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [workout_plan_id || null, targetMemberId, exercise_name.trim(), sets, reps, weight_kg, dateToRecord, notes || null]);

    res.status(201).json({
      success: true,
      message: `Workout log for ${exercise_name} recorded!`,
      log_id: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get workout logs
 * Member views their own logs; Trainer/Admin can view any.
 */
async function getWorkoutLogs(req, res, next) {
  try {
    const { member_id, limit = 50 } = req.query;

    let targetMember = member_id;
    if (req.user.role === 'member') {
      targetMember = req.user.member_id;
    }

    let conditions = ['1=1'];
    let params = [];

    if (targetMember) {
      conditions.push('wl.member_id = ?');
      params.push(targetMember);
    }

    const [rows] = await query(`
      SELECT wl.id, wl.workout_plan_id, wl.member_id, wl.exercise_name, wl.sets, wl.reps,
             wl.weight_kg, wl.completed_date, wl.notes, wl.created_at,
             u.name AS member_name, wp.plan_name
      FROM workout_logs wl
      JOIN members mem ON wl.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      LEFT JOIN workout_plans wp ON wl.workout_plan_id = wp.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY wl.completed_date DESC, wl.id DESC
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

module.exports = {
  getWorkoutPlans,
  createWorkoutPlan,
  recordWorkoutLog,
  getWorkoutLogs
};
