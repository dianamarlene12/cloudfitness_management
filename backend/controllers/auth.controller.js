const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth.middleware');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Register a new user
 * Defaults to 'member' role unless registered by an authorized admin.
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role = 'member', phone, date_of_birth, emergency_contact, rfid_tag } = req.body;

    // Check if email already in use
    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = (req.user && req.user.role === 'admin' && ['admin', 'trainer', 'member'].includes(role)) 
      ? role 
      : 'member';

    // Insert user
    const [userResult] = await query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, "active")',
      [name.trim(), email.toLowerCase().trim(), passwordHash, assignedRole]
    );

    const userId = userResult.insertId;
    let memberId = null;
    let trainerId = null;

    // If role is member, create member record with RFID tag
    if (assignedRole === 'member') {
      const generatedRfid = rfid_tag || `#FT-${Math.floor(1000 + Math.random() * 9000)}`;
      const [memberResult] = await query(
        'INSERT INTO members (user_id, phone, date_of_birth, emergency_contact, rfid_tag) VALUES (?, ?, ?, ?, ?)',
        [userId, phone || null, date_of_birth || null, emergency_contact || null, generatedRfid]
      );
      memberId = memberResult.insertId;

      // Assign default basic membership for 30 days
      const [defaultPlan] = await query('SELECT id FROM memberships WHERE tier_code = "basic" LIMIT 1');
      if (defaultPlan.length > 0) {
        await query(
          'INSERT INTO member_memberships (member_id, membership_id, start_date, end_date, auto_renew, status) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), TRUE, "active")',
          [memberId, defaultPlan[0].id]
        );
      }
    } else if (assignedRole === 'trainer') {
      const [trainerResult] = await query(
        'INSERT INTO trainers (user_id, specialization, bio) VALUES (?, "Fitness Specialist", "Dedicated strength and conditioning coach.")',
        [userId]
      );
      trainerId = trainerResult.insertId;
    }

    // Create JWT
    const token = jwt.sign(
      { userId, email: email.toLowerCase().trim(), role: assignedRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Account successfully registered and authenticated.',
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: assignedRole,
        member_id: memberId,
        trainer_id: trainerId
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in with email and password
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Find user by email
    const [users] = await query(
      'SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated or suspended. Please contact gym administration.'
      });
    }

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Retrieve role-specific details
    let memberId = null;
    let trainerId = null;
    let rfidTag = null;

    if (user.role === 'member') {
      const [members] = await query('SELECT id, rfid_tag FROM members WHERE user_id = ?', [user.id]);
      if (members.length > 0) {
        memberId = members[0].id;
        rfidTag = members[0].rfid_tag;
      }
    } else if (user.role === 'trainer') {
      const [trainers] = await query('SELECT id FROM trainers WHERE user_id = ?', [user.id]);
      if (trainers.length > 0) {
        trainerId = trainers[0].id;
      }
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        member_id: memberId,
        trainer_id: trainerId,
        rfid_tag: rfidTag
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log out and clear authentication cookie
 */
function logout(req, res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({
    success: true,
    message: 'Successfully logged out.'
  });
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res, next) {
  try {
    const user = req.user;

    let profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    if (user.role === 'member') {
      const [members] = await query(`
        SELECT m.id AS member_id, m.phone, m.date_of_birth, m.emergency_contact, m.rfid_tag,
               mm.status AS membership_status, mm.end_date AS membership_end_date,
               mem.name AS plan_name, mem.tier_code
        FROM members m
        LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.status = 'active'
        LEFT JOIN memberships mem ON mm.membership_id = mem.id
        WHERE m.user_id = ?
        ORDER BY mm.id DESC LIMIT 1
      `, [user.id]);

      if (members.length > 0) {
        profile = { ...profile, ...members[0] };
      }
    } else if (user.role === 'trainer') {
      const [trainers] = await query(`
        SELECT id AS trainer_id, specialization, bio, availability, hourly_rate, rating, max_clients, image_url
        FROM trainers WHERE user_id = ?
      `, [user.id]);

      if (trainers.length > 0) {
        profile = { ...profile, ...trainers[0] };
      }
    }

    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
