# FitTrack — Cloud-Based Fitness & Gym Management System
**Next-Gen Gym Operating System, Automated Turnstile Access & Athlete Telemetry Hub**

FitTrack is a full-stack, enterprise-grade gym and fitness management platform. Built upon an obsidian dark aesthetic with high-visibility neon-lime accents (`#D4FF00`), it combines automated optical turnstile hardware simulation, real-time member telemetry, coach rostering, recurring subscription mandates, and simulated payment ledgers.

---

## 1. Technology Stack

- **Frontend**: Responsive HTML5, Vanilla CSS3 (Custom Design System, Obsidian Dark `#080A0C` + Neon-Lime `#D4FF00`), and Vanilla JavaScript.
- **Backend**: Node.js with Express.js REST API.
- **Database**: MySQL 8.0 with `mysql2/promise` using parameterized queries and connection pooling.
- **Authentication**: `bcryptjs` password hashing (10 salt rounds) and JSON Web Tokens (JWT) stored in secure, `HTTP-only` cookies.
- **Validation**: Server-side request validation using `express-validator`.
- **Security**: `helmet` security headers, `cors` credential authorization, and `express-rate-limit` brute-force protection.
- **Testing**: Automated end-to-end API test suite using `jest` and `supertest`.

---

## 2. Project Architecture

```
cloud fitness gym/
├── index.html                  # Main Application Single-Page Interface
├── package.json                # Project dependencies & npm scripts
├── .env                        # Local Environment Secrets (Git-ignored)
├── .env.example                # Environment Configuration Template
├── .gitignore                  # Git Ignore Rules
├── README.md                   # Complete Documentation & Guide
├── assets/                     # Gym & Trainer Photography
│   ├── hero-gym.png
│   ├── trainer-aria.png
│   ├── trainer-derrick.png
│   ├── trainer-elena.png
│   └── trainer-marcus.png
├── src/                        # Frontend Core
│   ├── styles.css              # Custom FitTrack Obsidian/Lime Design System
│   ├── api.js                  # Universal Frontend REST API Helper
│   └── main.js                 # View Switcher, Data Sync, and DOM Controllers
└── backend/                    # Express REST API & Database
    ├── server.js               # HTTP Server Bootstrap
    ├── app.js                  # Express Application, Middleware, Static Serving
    ├── config/
    │   └── db.js               # MySQL Connection Pool & Health Check
    ├── controllers/            # Request Handlers & Business Logic
    │   ├── auth.controller.js
    │   ├── dashboard.controller.js
    │   ├── member.controller.js
    │   ├── trainer.controller.js
    │   ├── membership.controller.js
    │   ├── attendance.controller.js
    │   ├── workout.controller.js
    │   ├── schedule.controller.js
    │   ├── payment.controller.js
    │   ├── notification.controller.js
    │   └── admin.controller.js
    ├── routes/                 # Express API Endpoints
    │   ├── auth.routes.js
    │   ├── dashboard.routes.js
    │   ├── member.routes.js
    │   ├── trainer.routes.js
    │   ├── membership.routes.js
    │   ├── attendance.routes.js
    │   ├── workout.routes.js
    │   ├── schedule.routes.js
    │   ├── payment.routes.js
    │   ├── notification.routes.js
    │   ├── admin.routes.js
    │   └── health.routes.js
    ├── middleware/             # Interceptors
    │   ├── auth.middleware.js   # JWT Cookie / Bearer Verification
    │   ├── role.middleware.js   # Role-Based Access Control (Admin, Trainer, Member)
    │   ├── error.middleware.js  # Centralized Error & Exception Handler
    │   ├── validation.middleware.js
    │   └── rateLimiter.js       # Brute-force & DDoS Mitigation
    ├── sql/
    │   ├── schema.sql           # 11 Normalized Relational MySQL Tables
    │   └── seed.sql             # Realistic Demo Data
    ├── scripts/
    │   ├── setupDb.js           # Automated Database & Schema Initializer
    │   └── initAdmin.js         # Safe Administrator Account Initializer
    └── tests/
        └── api.test.js          # Automated Supertest & Jest Test Suite
```

---

## 3. Database Design (`fittrack_db`)

The database is normalized across 11 relational tables with foreign keys and cascade rules:

| # | Table Name | Purpose & Key Columns |
|---|------------|-----------------------|
| 1 | `users` | Core credentials: `id`, `name`, `email` (UNIQUE), `password_hash`, `role` (admin/trainer/member), `status` (active/inactive). |
| 2 | `members` | Extended athlete profile: `id`, `user_id` (FK), `phone`, `date_of_birth`, `emergency_contact`, `rfid_tag` (UNIQUE). |
| 3 | `trainers` | Coach credentials: `id`, `user_id` (FK), `specialization`, `bio`, `availability`, `hourly_rate`, `rating`, `max_clients`. |
| 4 | `memberships` | Pricing plans: `id`, `name`, `tier_code` (UNIQUE), `duration_months`, `price`, `description`, `features`. |
| 5 | `member_memberships` | Subscription contracts: `id`, `member_id` (FK), `membership_id` (FK), `start_date`, `end_date`, `auto_renew`, `status`. |
| 6 | `attendance` | Automated turnstile access logs: `id`, `member_id` (FK), `check_in_time`, `check_out_time`, `access_method` (rfid/qr/kiosk), `turnstile_id`. |
| 7 | `workout_plans` | Training protocols: `id`, `member_id` (FK), `trainer_id` (FK), `plan_name`, `target_goal`, `status`. |
| 8 | `workout_logs` | Biometric workout telemetry: `id`, `workout_plan_id` (FK), `member_id` (FK), `exercise_name`, `sets`, `reps`, `weight_kg`. |
| 9 | `trainer_schedules` | Coach availability & booked sessions: `id`, `trainer_id` (FK), `member_id` (FK), `session_date`, `start_time`, `end_time`, `status`. |
| 10 | `payments` | Simulated ledger transactions: `id`, `member_id` (FK), `membership_id` (FK), `invoice_number` (UNIQUE), `amount`, `status`. |
| 11 | `notifications` | Alerts: `id`, `user_id` (FK), `title`, `message`, `type` (info/warning/success/alert), `is_read`. |

---

## 4. Setup Instructions (Beginner-Friendly Windows Guide)

### Prerequisites

1. **Node.js**: Verify installation in PowerShell:
   ```powershell
   node -v
   npm.cmd -v
   ```
   *(If you encounter execution policy errors in PowerShell, run using `npm.cmd`)*

2. **MySQL Server 8.0**: Ensure the MySQL service (`MySQL80`) is running:
   ```powershell
   Get-Service -Name *mysql*
   ```

### Step 1: Configure Environment Variables

Copy `.env.example` to create `.env`:
```powershell
cp .env.example .env
```
Open `.env` and verify your MySQL password:
```env
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=fittrack_db
DB_USER=root
DB_PASSWORD=root
JWT_SECRET=fittrack_super_secure_jwt_secret_key_2026_xyz!
```

### Step 2: Install Project Dependencies

Install all production and development libraries:
```powershell
npm.cmd install
```

### Step 3: Run Database Schema & Seed Script

This script automatically creates `fittrack_db`, applies `schema.sql`, hashes passwords with `bcrypt`, and populates `seed.sql`:
```powershell
npm.cmd run db:setup
```

### Step 4: Safely Initialize Your First Admin Account

To comply with enterprise security standards, no default admin account with a public password is created. Run the initializer CLI:
```powershell
npm.cmd run init-admin
```
Or pass credentials directly:
```powershell
node backend/scripts/initAdmin.js --name "Alex Reyes" --email "alex.reyes@athleticops.com" --password "Password123!"
```

### Step 5: Start the Application

- **Development Server** (with automatic reload on file changes):
  ```powershell
  npm.cmd run dev
  ```
- **Production Server**:
  ```powershell
  npm.cmd start
  ```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 5. Seeded Demo Accounts for Evaluation

| Role | Name | Email Address | Password |
|------|------|---------------|----------|
| **Admin** | Alex Reyes | `alex.reyes@athleticops.com` | `Password123!` |
| **Trainer** | Elena Rostova | `elena.rostova@nexusfit.com` | `TrainerPass123!` |
| **Trainer** | Marcus Vance | `marcus.vance@athleticops.com` | `TrainerPass123!` |
| **Member** | Kaelen Diaz | `kaelen.diaz@apexspeed.io` | `MemberPass123!` |
| **Member** | Marcus Brody | `m.brody@apexathletics.io` | `MemberPass123!` |
| **Member (Expired)** | Liam Vance | `liam.vance@vancamedia.co` | `MemberPass123!` |

*(Note: Liam Vance has an expired membership `#FT-8845`, ideal for testing the turnstile rejection simulation)*.

---

## 6. Testing the Automated Turnstile Simulator

1. Log in to the Admin Console (`http://localhost:3000/#login`).
2. Navigate to **Attendance** in the sidebar.
3. Scroll down to the **Automated Turnstile Relay & RFID Scanner Terminal**.
4. Test Scenarios:
   - **Valid Entry (Marcus Brody `#FT-8841`)**: Click `⚡ Scan In (Ingress)` ➔ Gate unlocks, LED indicator switches to green (`GATE: UNLOCKED`).
   - **Anti-Passback Duplicate Ingress**: Click `⚡ Scan In (Ingress)` again immediately ➔ Gate locks (`ACCESS DENIED: Athlete is ALREADY checked in`).
   - **Valid Exit (Egress)**: Click `➔ Scan Out (Egress)` ➔ Gate unlocks for exit and records dwell time.
   - **Expired Membership (Liam Vance `#FT-8845`)**: Select Liam Vance and click `⚡ Scan In` ➔ Access denied (`MEMBERSHIP_EXPIRED_OR_INACTIVE`).

---

## 7. Running Automated Test Suites

FitTrack includes 29 comprehensive automated tests verifying registration, login, JWT cookies, role-based access control, privacy restrictions, turnstile validation, duplicate check-in prevention, trainer schedule conflict detection, Indian Rupee (INR) currency metadata, and simulated payments:

```powershell
npm.cmd test
```

Expected output:
```
PASS backend/tests/api.test.js
  FitTrack API Test Suite
    1. System Health & Infrastructure (2 tests)
    2. Authentication & Authorization RBAC (6 tests)
    3. Member Privacy & Data Isolation (3 tests)
    4. Dashboard Telemetry (2 tests)
    5. Automated Turnstile Simulator & Anti-Passback (5 tests)
    6. Trainer Scheduling & Conflict Prevention (2 tests)
    7. Payment Simulation Ledger (3 tests)
    8. Workouts & Exercise Logs (2 tests)
    9. Notifications (2 tests)
    10. Logout Handling (1 test)

Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
```

---

## 8. Database Migration & Packaging Scripts

- **`npm run migrate:inr`**: Normalizes MySQL demo records into authentic Indian Rupee (₹) amounts and simulated Indian payment channels (UPI, e-NACH, NetBanking, RuPay) without dropping tables or losing user accounts.
- **`npm run build:zip`**: Automatically generates a clean, production-ready `fittrack-deploy.zip` archive for AWS Elastic Beanstalk (strictly excluding `node_modules`, `.env`, backups, and tests).

---

## 9. Preparing for AWS Deployment (Elastic Beanstalk + Amazon RDS)

FitTrack is pre-configured for deployment to Amazon Web Services in **Mumbai (`ap-south-1`)**:

1. **Database (Amazon RDS for MySQL)**:
   - Create a Free-Tier eligible `db.t4g.micro` or `db.t3.micro` MySQL 8.0 instance on Amazon RDS.
   - Set the security group to permit inbound TCP on port 3306 from your Elastic Beanstalk environment.
   - Run the initial schema with `schema.sql` and `seed.sql`.

2. **Web Application (AWS Elastic Beanstalk)**:
   - Create a Web Tier application using the Node.js 20/22 runtime on Amazon Linux 2023.
   - Run `npm run build:zip` locally to build `fittrack-deploy.zip`.
   - Upload `fittrack-deploy.zip` in the Elastic Beanstalk console.
   - Configure Environment Variables (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `PORT=8080`, `NODE_ENV=production`).

3. **Domain & Security**:
   - Enable HTTPS via AWS Certificate Manager (ACM) attached to the Application Load Balancer.
   - Production cookies utilize `SameSite=Lax` / `SameSite=Strict` and `HttpOnly`.

All API endpoints are prefixed with `/api` and return standardized JSON:

### Health
- `GET /api/health`: Server uptime & MySQL database health check without exposing secrets.

### Authentication (`/api/auth`)
- `POST /api/auth/register`: User registration with role assignment and auto-provisioning.
- `POST /api/auth/login`: Authenticate and set secure HTTP-only cookie.
- `POST /api/auth/logout`: Clear authentication cookie.
- `GET /api/auth/me`: Retrieve current user profile and role details.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats`: High-level facility statistics, total members, active memberships, today's attendance, revenue.
- `GET /api/dashboard/recent-activity`: Real-time audit stream of check-ins and payments.

### Members (`/api/members`)
- `GET /api/members`: Paginated member directory with plan and status filtering.
- `GET /api/members/:id`: Member profile details, attendance history, and contract records.
- `POST /api/members`: Admin onboarding with automatic RFID tag assignment.
- `PUT /api/members/:id`: Update member contact details.
- `PATCH /api/members/:id/status`: Toggle active / suspended status.

### Trainers (`/api/trainers`)
- `GET /api/trainers`: List trainer roster with client loads and specializations.
- `GET /api/trainers/:id`: Detailed trainer profile and shift schedule.
- `PUT /api/trainers/:id`: Update trainer availability and rates.

### Memberships (`/api/memberships`)
- `GET /api/memberships/plans`: Public membership tiers.
- `GET /api/memberships/subscriptions`: Active contracts audit.
- `GET /api/memberships/expiring`: Subscriptions expiring within 14 days.
- `POST /api/memberships/subscribe`: Bind athlete to a membership tier.
- `PATCH /api/memberships/subscriptions/:id/auto-renew`: Toggle automated renewal.

### Attendance & Turnstile (`/api/attendance`)
- `POST /api/attendance/check-in`: Turnstile ingress with anti-passback and active membership checks.
- `POST /api/attendance/check-out`: Turnstile egress with dwell duration calculation.
- `GET /api/attendance/telemetry`: Hourly ingress distribution.
- `GET /api/attendance/history`: Turnstile access audit log.

### Workouts (`/api/workouts`)
- `GET /api/workouts/plans`: Assigned workout plans (scoped by role).
- `POST /api/workouts/plans`: Create new training plan.
- `GET /api/workouts/logs`: Retrieve biometric workout logs.
- `POST /api/workouts/logs`: Record exercise sets, reps, and weights.

### Schedules (`/api/schedules`)
- `GET /api/schedules`: Available and booked trainer sessions.
- `POST /api/schedules/slots`: Create time slot with automatic overlap prevention.
- `POST /api/schedules/book`: Book an available session.

### Payments (`/api/payments`)
- `GET /api/payments`: Financial audit ledger.
- `POST /api/payments`: Record manual POS / simulated settlement.

### Notifications (`/api/notifications`)
- `GET /api/notifications`: Retrieve user-specific alerts.
- `PATCH /api/notifications/:id/read`: Mark single alert as read.
- `POST /api/notifications/read-all`: Mark all alerts as read.

### Admin Overrides (`/api/admin`)
- `GET /api/admin/settings`: Facility capacity and safety thresholds.
- `POST /api/admin/settings`: Save facility configuration.
- `POST /api/admin/turnstile/override`: Emergency turnstile unlock/lock.

---

## 9. Preparing for AWS Deployment

FitTrack is designed for cloud-native deployment to Amazon Web Services:

1. **Database (Amazon RDS for MySQL)**:
   - Provision a Multi-AZ MySQL 8.0 instance on Amazon RDS.
   - Update `.env` with `DB_HOST=<rds-endpoint>.rds.amazonaws.com` and credentials stored in AWS Secrets Manager.

2. **Backend Application (AWS Elastic Beanstalk or ECS / Fargate)**:
   - Dockerize or package the application directory.
   - Set environment variables (`NODE_ENV=production`, `COOKIE_SECURE=true`, `CLIENT_ORIGIN=https://yourgymdomain.com`).

3. **Domain & Security (Amazon CloudFront + AWS Certificate Manager)**:
   - Route traffic through CloudFront with SSL/TLS termination.
   - Configure HTTP-only cookies with `Secure; SameSite=Strict` for production HTTPS.

4. **Static Assets (Amazon S3)**:
   - The trainer images and hero assets in `assets/` can be moved directly to an S3 bucket configured with CloudFront CDN distribution.
