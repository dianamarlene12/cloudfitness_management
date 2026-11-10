const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/db');

describe('FitTrack API Test Suite', () => {
  let adminCookie = null;
  let memberCookie = null;
  let testMemberId = null;
  let testRfidTag = null;

  afterAll(async () => {
    // Clean up connections so Jest exits cleanly
    await pool.end();
  });

  describe('1. System Health & Infrastructure', () => {
    it('GET /api/health returns UP and healthy database connectivity', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.database.status).toBe('healthy');
      expect(res.body.database.name).toBe('fittrack_db');
      expect(res.body.version).toBe('2.4.0');
    });

    it('GET /api/non-existent-route returns structured 404 JSON', async () => {
      const res = await request(app).get('/api/non-existent-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('API endpoint not found');
    });
  });

  describe('2. Authentication & Authorization (RBAC)', () => {
    it('POST /api/auth/login fails with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.reyes@athleticops.com', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('POST /api/auth/login logs in admin and sets secure HTTP-only cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.reyes@athleticops.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('admin');
      expect(res.headers['set-cookie']).toBeDefined();

      // Save cookie for subsequent admin requests
      adminCookie = res.headers['set-cookie'];
    });

    it('GET /api/auth/me returns authenticated admin user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('alex.reyes@athleticops.com');
      expect(res.body.user.role).toBe('admin');
    });

    it('GET /api/members without authentication returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/members');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/register registers a new athlete and sets session cookie', async () => {
      const testEmail = `athlete_${Date.now()}@test.io`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Athlete',
          email: testEmail,
          password: 'Password123!',
          phone: '+1 555 999 1111'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('member');
      expect(res.body.user.member_id).toBeDefined();

      memberCookie = res.headers['set-cookie'];
      testMemberId = res.body.user.member_id;
    });

    it('Member cannot access Admin settings (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/settings')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('3. Member Privacy & Data Isolation', () => {
    it('Member can view their own profile details', async () => {
      const res = await request(app)
        .get(`/api/members/${testMemberId}`)
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testMemberId);
      testRfidTag = res.body.data.rfid_tag;
    });

    it('Member cannot access another member private details (403 Forbidden)', async () => {
      // Another member ID is 1 (Marcus Brody)
      const res = await request(app)
        .get('/api/members/1')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('Admin can view any member profile', async () => {
      const res = await request(app)
        .get(`/api/members/${testMemberId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('4. Dashboard Telemetry', () => {
    it('GET /api/dashboard/stats returns real-time metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.total_members).toBe('number');
      expect(typeof res.body.data.active_memberships).toBe('number');
      expect(typeof res.body.data.today_checkins).toBe('number');
      expect(typeof res.body.data.trainer_count).toBe('number');
      expect(typeof res.body.data.total_revenue).toBe('number');
    });

    it('GET /api/dashboard/recent-activity returns recent check-ins and payments', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-activity')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.recent_attendance)).toBe(true);
      expect(Array.isArray(res.body.data.recent_payments)).toBe(true);
    });
  });

  describe('5. Automated Turnstile Simulator & Anti-Passback', () => {
    it('Check-in with invalid RFID badge rejects entry', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .send({ rfid_tag: '#FT-INVALID-9999' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.gate_status).toBe('LOCKED');
    });

    it('Check-in with expired membership rejects entry', async () => {
      // Liam Vance has expired subscription in seed data (#FT-8845)
      const res = await request(app)
        .post('/api/attendance/check-in')
        .send({ rfid_tag: '#FT-8845' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.gate_status).toBe('LOCKED');
      expect(res.body.reason).toBe('MEMBERSHIP_EXPIRED_OR_INACTIVE');
    });

    it('Check-in with valid active athlete unlocks turnstile', async () => {
      // Check in test member
      const res = await request(app)
        .post('/api/attendance/check-in')
        .send({ rfid_tag: testRfidTag, turnstile_id: 'Gate-Bay-01' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.gate_status).toBe('UNLOCKED');
      expect(res.body.message).toContain('Access Granted');
    });

    it('Duplicate active check-in is blocked (Anti-Passback duplicate ingress)', async () => {
      // Attempt immediate second check-in with same badge without checking out
      const res = await request(app)
        .post('/api/attendance/check-in')
        .send({ rfid_tag: testRfidTag, turnstile_id: 'Gate-Bay-01' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.gate_status).toBe('LOCKED');
      expect(res.body.reason).toBe('DUPLICATE_CHECKIN');
      expect(res.body.message).toContain('ALREADY checked in');
    });

    it('Check-out completes session and unlocks egress gate', async () => {
      const res = await request(app)
        .post('/api/attendance/check-out')
        .send({ rfid_tag: testRfidTag, turnstile_id: 'Gate-Bay-01' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.gate_status).toBe('UNLOCKED');
      expect(res.body.message).toContain('Exit Granted');
    });
  });

  describe('6. Trainer Scheduling & Conflict Prevention', () => {
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 45);
    const dateStr = testDate.toISOString().split('T')[0];

    beforeAll(async () => {
      await pool.query('DELETE FROM trainer_schedules WHERE trainer_id = 1 AND session_date = ?', [dateStr]);
    });

    afterAll(async () => {
      await pool.query('DELETE FROM trainer_schedules WHERE trainer_id = 1 AND session_date = ?', [dateStr]);
    });

    it('Creates a trainer schedule slot', async () => {
      const res = await request(app)
        .post('/api/schedules/slots')
        .set('Cookie', adminCookie)
        .send({
          trainer_id: 1,
          title: 'Hypertrophy Biomechanics Session',
          session_date: dateStr,
          start_time: '14:00:00',
          end_time: '15:00:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Prevents double-booking overlapping time slots for the same trainer', async () => {
      // Attempt to schedule conflicting slot (14:30 - 15:30 overlaps with 14:00 - 15:00)
      const res = await request(app)
        .post('/api/schedules/slots')
        .set('Cookie', adminCookie)
        .send({
          trainer_id: 1,
          title: 'Overlapping Session',
          session_date: dateStr,
          start_time: '14:30:00',
          end_time: '15:30:00'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Schedule conflict');
    });
  });

  describe('7. Payment Simulation Ledger', () => {
    it('Records a simulated payment and generates unique invoice number', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Cookie', adminCookie)
        .send({
          member_id: testMemberId,
          amount: 1499.00,
          payment_method: 'UPI / POS Terminal',
          notes: 'Test simulated payment'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice_number).toMatch(/^INV-\d+/);
      expect(res.body.data.amount).toBe(1499.00);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.currency_symbol).toBe('₹');
      expect(res.body.data.status).toBe('paid');
    });

    it('GET /api/payments returns INR ledger stream and Indian currency metadata', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currency).toBe('INR');
      expect(res.body.currency_symbol).toBe('₹');
      expect(res.body.demo_disclaimer).toContain('INR / ₹');
      expect(Array.isArray(res.body.data)).toBe(true);
      // Assert that every transaction has INR currency
      res.body.data.forEach(p => {
        expect(p.currency).toBe('INR');
      });
    });

    it('GET /api/memberships/plans returns Indian Rupee tier pricing', async () => {
      const res = await request(app)
        .get('/api/memberships/plans')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      // Verify pricing is formatted in standard INR tiers
      const basic = res.body.data.find(p => p.tier_code === 'basic');
      expect(parseFloat(basic.price)).toBe(2499.00);
    });

    it('Rejects invalid negative or zero payment amounts', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Cookie', adminCookie)
        .send({
          member_id: testMemberId,
          amount: -50.00
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('8. Workouts & Exercise Logs', () => {
    it('Records a completed workout log for an athlete', async () => {
      const res = await request(app)
        .post('/api/workouts/logs')
        .set('Cookie', memberCookie)
        .send({
          exercise_name: 'Incline Dumbbell Press',
          sets: 4,
          reps: 12,
          weight_kg: 32.5,
          notes: 'Smooth tempo'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Member retrieves their own workout logs', async () => {
      const res = await request(app)
        .get('/api/workouts/logs')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].exercise_name).toBe('Incline Dumbbell Press');
    });
  });

  describe('9. Notifications', () => {
    it('Retrieves user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Marks all notifications as read', async () => {
      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('10. Logout Handling', () => {
    it('POST /api/auth/logout clears auth cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie'][0]).toContain('auth_token=;');
    });
  });
});
