const { query } = require('../config/db');

/**
 * List all available membership plans
 */
async function getPlans(req, res, next) {
  try {
    const [plans] = await query('SELECT * FROM memberships WHERE is_active = TRUE ORDER BY price ASC');
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all member subscription contracts (for Admin Console)
 */
async function getSubscriptions(req, res, next) {
  try {
    const { search = '', tier = 'all', autorenew = 'all' } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (tier !== 'all') {
      conditions.push('m.tier_code = ?');
      params.push(tier);
    }

    if (autorenew !== 'all') {
      conditions.push('mm.auto_renew = ?');
      params.push(autorenew === 'on' ? 1 : 0);
    }

    const [rows] = await query(`
      SELECT mm.id, mm.member_id, mm.membership_id, mm.start_date, mm.end_date,
             mm.auto_renew, mm.status, mm.created_at,
             u.name AS member_name, u.email AS member_email,
             m.name AS plan_name, m.tier_code, m.price, m.duration_months
      FROM member_memberships mm
      JOIN members mem ON mm.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      JOIN memberships m ON mm.membership_id = m.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY mm.id DESC
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
 * Subscribe a member to a plan
 */
async function subscribeMember(req, res, next) {
  try {
    const { member_id, membership_id, duration_months = 1, auto_renew = true } = req.body;

    // Check membership exists
    const [plans] = await query('SELECT * FROM memberships WHERE id = ?', [membership_id]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Membership plan not found.' });
    }
    const plan = plans[0];

    // Check member exists
    const [members] = await query('SELECT id, user_id FROM members WHERE id = ?', [member_id]);
    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Deactivate previous active memberships for this member to prevent duplicate active contracts
    await query(
      'UPDATE member_memberships SET status = "expired" WHERE member_id = ? AND status = "active"',
      [member_id]
    );

    const months = parseInt(duration_months, 10) || plan.duration_months || 1;

    // Insert new subscription
    const [result] = await query(`
      INSERT INTO member_memberships (member_id, membership_id, start_date, end_date, auto_renew, status)
      VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, "active")
    `, [member_id, membership_id, months, auto_renew ? 1 : 0]);

    // Create corresponding simulated payment invoice
    const invId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = plan.price * months;
    await query(`
      INSERT INTO payments (member_id, membership_id, invoice_number, amount, currency, payment_method, status, transaction_ref, notes)
      VALUES (?, ?, ?, ?, "INR", "UPI / Auto-Debit Mandate", "paid", ?, "Automated subscription mandate creation")
    `, [member_id, membership_id, invId, totalAmount, `TX-SIM-${Date.now()}`]);

    res.status(201).json({
      success: true,
      message: `Subscription mandate for ${plan.name} (${months}-month cycle) successfully created!`,
      data: {
        subscription_id: result.insertId,
        invoice_number: invId,
        amount: totalAmount
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle auto-renew on a subscription
 */
async function toggleAutoRenew(req, res, next) {
  try {
    const subscriptionId = parseInt(req.params.id, 10);
    const { auto_renew } = req.body;

    const [subs] = await query('SELECT id FROM member_memberships WHERE id = ?', [subscriptionId]);
    if (subs.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found.' });
    }

    await query('UPDATE member_memberships SET auto_renew = ? WHERE id = ?', [auto_renew ? 1 : 0, subscriptionId]);

    res.json({
      success: true,
      message: `Auto-renew switched ${auto_renew ? 'ON' : 'OFF'}.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get expiring memberships (within N days)
 */
async function getExpiringMemberships(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 14;

    const [rows] = await query(`
      SELECT mm.id, u.name AS member_name, u.email, m.name AS plan_name, mm.end_date,
             DATEDIFF(mm.end_date, CURDATE()) AS days_left
      FROM member_memberships mm
      JOIN members mem ON mm.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      JOIN memberships m ON mm.membership_id = m.id
      WHERE mm.status = 'active' AND mm.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY mm.end_date ASC
    `, [days]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlans,
  getSubscriptions,
  subscribeMember,
  toggleAutoRenew,
  getExpiringMemberships
};
