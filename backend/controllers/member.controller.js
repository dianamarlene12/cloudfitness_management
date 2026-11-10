const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

/**
 * List members with search, filtering, and pagination
 */
async function getMembers(req, res, next) {
  try {
    const { search = '', plan = 'all', status = 'all', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let conditions = ['1=1'];
    let params = [];

    if (search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR m.rfid_tag LIKE ? OR m.phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (status !== 'all') {
      conditions.push('u.status = ?');
      params.push(status);
    }

    if (plan !== 'all') {
      conditions.push('mem.tier_code = ?');
      params.push(plan);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching
    const [[{ total }]] = await query(`
      SELECT COUNT(DISTINCT m.id) AS total
      FROM members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.status = 'active'
      LEFT JOIN memberships mem ON mm.membership_id = mem.id
      WHERE ${whereClause}
    `, params);

    // Fetch paginated member rows
    const [rows] = await query(`
      SELECT 
        m.id, m.user_id, u.name, u.email, u.status, m.phone, m.date_of_birth,
        m.emergency_contact, m.rfid_tag, m.notes, m.created_at,
        mem.name AS current_plan, mem.tier_code AS plan_tier,
        mm.status AS membership_status, mm.end_date AS membership_end_date,
        (SELECT t_user.name 
         FROM workout_plans wp 
         JOIN trainers tr ON wp.trainer_id = tr.id 
         JOIN users t_user ON tr.user_id = t_user.id 
         WHERE wp.member_id = m.id AND wp.status = 'active' LIMIT 1) AS assigned_coach
      FROM members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.status = 'active'
      LEFT JOIN memberships mem ON mm.membership_id = mem.id
      WHERE ${whereClause}
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single member details
 * Protected: Member can only view their own profile; Admin/Trainer can view any.
 */
async function getMemberById(req, res, next) {
  try {
    const memberId = parseInt(req.params.id, 10);

    // Privacy restriction
    if (req.user.role === 'member' && req.user.member_id !== memberId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are only authorized to view your own profile.'
      });
    }

    const [members] = await query(`
      SELECT 
        m.id, m.user_id, u.name, u.email, u.status, m.phone, m.date_of_birth,
        m.emergency_contact, m.rfid_tag, m.notes, m.created_at,
        mem.name AS current_plan, mem.tier_code AS plan_tier,
        mm.status AS membership_status, mm.end_date AS membership_end_date, mm.auto_renew
      FROM members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.status = 'active'
      LEFT JOIN memberships mem ON mm.membership_id = mem.id
      WHERE m.id = ?
    `, [memberId]);

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member profile not found.'
      });
    }

    const member = members[0];

    // Fetch recent attendance history
    const [attendance] = await query(`
      SELECT id, check_in_time, check_out_time, access_method, status, turnstile_id
      FROM attendance
      WHERE member_id = ?
      ORDER BY check_in_time DESC LIMIT 10
    `, [memberId]);

    // Fetch memberships history
    const [membershipHistory] = await query(`
      SELECT mm.id, m.name AS plan_name, m.price, mm.start_date, mm.end_date, mm.status, mm.auto_renew
      FROM member_memberships mm
      JOIN memberships m ON mm.membership_id = m.id
      WHERE mm.member_id = ?
      ORDER BY mm.id DESC
    `, [memberId]);

    res.json({
      success: true,
      data: {
        ...member,
        attendance_history: attendance,
        membership_history: membershipHistory
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new member (Admin only)
 */
async function createMember(req, res, next) {
  try {
    const { name, email, phone, rfid_tag, plan = 'pro', coach_id, date_of_birth, emergency_contact, notes } = req.body;

    // Check if email already exists
    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Default password for newly onboarded member (member can reset later)
    const temporaryPassword = 'MemberPass123!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // 1. Create user account
    const [userResult] = await query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, "member", "active")',
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );
    const userId = userResult.insertId;

    // 2. Generate RFID if not provided
    const finalRfid = rfid_tag && rfid_tag.trim() ? rfid_tag.trim() : `#FT-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Create member record
    const [memberResult] = await query(
      'INSERT INTO members (user_id, phone, date_of_birth, emergency_contact, rfid_tag, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, phone || null, date_of_birth || null, emergency_contact || null, finalRfid, notes || null]
    );
    const memberId = memberResult.insertId;

    // 4. Assign membership plan
    const [plans] = await query('SELECT id, price FROM memberships WHERE tier_code = ? OR name LIKE ? LIMIT 1', [plan, `%${plan}%`]);
    if (plans.length > 0) {
      const planId = plans[0].id;
      await query(
        'INSERT INTO member_memberships (member_id, membership_id, start_date, end_date, auto_renew, status) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), TRUE, "active")',
        [memberId, planId]
      );

      // Record simulated initial payment
      const invId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      await query(
        'INSERT INTO payments (member_id, membership_id, invoice_number, amount, currency, payment_method, status, transaction_ref, notes) VALUES (?, ?, ?, ?, "INR", "Front Desk POS / UPI", "paid", ?, "Initial onboarding membership settlement")',
        [memberId, planId, invId, plans[0].price, `TX-SIM-${Date.now()}`]
      );
    }

    // 5. Assign coach if provided
    if (coach_id) {
      await query(
        'INSERT INTO workout_plans (member_id, trainer_id, plan_name, description, status) VALUES (?, ?, "Personalized Athlete Conditioning", "Standard periodized baseline protocol", "active")',
        [memberId, coach_id]
      );
    }

    res.status(201).json({
      success: true,
      message: `Athlete "${name}" successfully registered and RFID ${finalRfid} synced!`,
      data: {
        id: memberId,
        user_id: userId,
        name,
        email,
        phone,
        rfid_tag: finalRfid,
        plan
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update member details
 */
async function updateMember(req, res, next) {
  try {
    const memberId = parseInt(req.params.id, 10);
    const { name, phone, emergency_contact, notes, rfid_tag } = req.body;

    // Privacy restriction
    if (req.user.role === 'member' && req.user.member_id !== memberId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot update another member profile.'
      });
    }

    const [members] = await query('SELECT user_id FROM members WHERE id = ?', [memberId]);
    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'Member profile not found.' });
    }

    const userId = members[0].user_id;

    if (name) {
      await query('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userId]);
    }

    let updates = [];
    let params = [];

    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (emergency_contact !== undefined) { updates.push('emergency_contact = ?'); params.push(emergency_contact); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (rfid_tag !== undefined && req.user.role === 'admin') { updates.push('rfid_tag = ?'); params.push(rfid_tag); }

    if (updates.length > 0) {
      params.push(memberId);
      await query(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({
      success: true,
      message: 'Member profile updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Activate or deactivate member account (Admin only)
 */
async function toggleMemberStatus(req, res, next) {
  try {
    const memberId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: active, inactive, suspended.'
      });
    }

    const [members] = await query('SELECT user_id FROM members WHERE id = ?', [memberId]);
    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'Member profile not found.' });
    }

    await query('UPDATE users SET status = ? WHERE id = ?', [status, members[0].user_id]);

    res.json({
      success: true,
      message: `Member status updated to '${status}'.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  toggleMemberStatus
};
