const { query } = require('../config/db');

/**
 * List payment transaction stream
 * Admin sees all; Member sees only their own.
 */
async function getPayments(req, res, next) {
  try {
    const { status = 'all', method = 'all', search = '', limit = 50 } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (req.user.role === 'member') {
      conditions.push('p.member_id = ?');
      params.push(req.user.member_id);
    }

    if (status !== 'all') {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (method !== 'all') {
      conditions.push('p.payment_method LIKE ?');
      params.push(`%${method}%`);
    }

    if (search.trim()) {
      conditions.push('(p.invoice_number LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR p.transaction_ref LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const [rows] = await query(`
      SELECT p.id, p.member_id, p.membership_id, p.invoice_number, p.amount,
             p.currency, p.payment_method, p.status, p.transaction_ref,
             p.payment_date, p.notes,
             u.name AS member_name, u.email AS member_email,
             m.name AS plan_name
      FROM payments p
      JOIN members mem ON p.member_id = mem.id
      JOIN users u ON mem.user_id = u.id
      LEFT JOIN memberships m ON p.membership_id = m.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.payment_date DESC, p.id DESC
      LIMIT ?
    `, [...params, parseInt(limit, 10)]);

    // Revenue & transaction breakdown summary
    const isMember = req.user.role === 'member';
    const andMember = isMember ? 'AND member_id = ?' : '';
    const andMemberParams = isMember ? [req.user.member_id] : [];
    const baseWhere = isMember ? 'WHERE member_id = ?' : '';

    const [[{ total_settled }]] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_settled FROM payments WHERE status = "paid" ${andMember}`,
      andMemberParams
    );
    const [[{ total_pending }]] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_pending FROM payments WHERE status = "pending" ${andMember}`,
      andMemberParams
    );
    const [[{ this_month_collection }]] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS this_month_collection FROM payments WHERE status = "paid" AND payment_date >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00') ${andMember}`,
      andMemberParams
    );
    const [[{ total_refunded, refund_count }]] = await query(
      `SELECT COALESCE(SUM(CASE WHEN status = 'failed' OR notes LIKE '%refund%' THEN amount ELSE 0 END), 0) AS total_refunded, 
              COUNT(CASE WHEN status = 'failed' OR notes LIKE '%refund%' THEN 1 END) AS refund_count 
       FROM payments ${baseWhere}`,
      andMemberParams
    );
    const [[counts]] = await query(
      `SELECT 
         COUNT(*) AS total,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
       FROM payments ${baseWhere}`,
      andMemberParams
    );
    const [channelRows] = await query(
      `SELECT payment_method, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS count
       FROM payments WHERE status = 'paid' ${andMember}
       GROUP BY payment_method`,
      andMemberParams
    );

    res.json({
      success: true,
      demo_disclaimer: 'FitTrack Software Simulated Payment Ledger — Zero Real Financial Charges Incurred (All in INR / ₹).',
      currency: 'INR',
      currency_symbol: '₹',
      summary: {
        total_settled: parseFloat(total_settled),
        total_pending: parseFloat(total_pending),
        this_month_collection: parseFloat(this_month_collection),
        total_refunded: parseFloat(total_refunded),
        refund_count: parseInt(refund_count, 10) || 0,
        counts: {
          total: parseInt(counts.total, 10) || 0,
          paid: parseInt(counts.paid, 10) || 0,
          pending: parseInt(counts.pending, 10) || 0,
          failed: parseInt(counts.failed, 10) || 0,
          refunded: parseInt(refund_count, 10) || 0
        },
        channels: channelRows.map(c => ({
          payment_method: c.payment_method,
          total_amount: parseFloat(c.total_amount),
          count: parseInt(c.count, 10)
        }))
      },
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Record a manual or simulated payment transaction
 */
async function recordPayment(req, res, next) {
  try {
    const { member_id, membership_id, amount, payment_method = 'UPI / Cash POS', notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    // Verify member exists
    const [members] = await query(`
      SELECT m.id, m.user_id, u.name, u.email
      FROM members m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [member_id]);

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const member = members[0];
    const invoiceNum = `INV-${Math.floor(8000 + Math.random() * 1999)}`;
    const txRef = `TX-SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await query(`
      INSERT INTO payments (member_id, membership_id, invoice_number, amount, currency, payment_method, status, transaction_ref, notes)
      VALUES (?, ?, ?, ?, 'INR', ?, 'paid', ?, ?)
    `, [member_id, membership_id || null, invoiceNum, parsedAmount, payment_method, txRef, notes || 'Simulated ledger entry recorded']);

    // Send member receipt notification
    await query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Payment Received (Simulated)', ?, 'success')
    `, [member.user_id, `Payment of ₹${parsedAmount.toFixed(2)} recorded (${invoiceNum}).`]);

    res.status(201).json({
      success: true,
      message: `Manual payment of ₹${parsedAmount.toFixed(2)} recorded for ${member.name} (${invoiceNum})!`,
      data: {
        payment_id: result.insertId,
        invoice_number: invoiceNum,
        amount: parsedAmount,
        currency: 'INR',
        currency_symbol: '₹',
        transaction_ref: txRef,
        status: 'paid',
        payment_method
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPayments,
  recordPayment
};
