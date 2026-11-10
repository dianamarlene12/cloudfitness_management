const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Route Handlers
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const memberRoutes = require('./routes/member.routes');
const trainerRoutes = require('./routes/trainer.routes');
const membershipRoutes = require('./routes/membership.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const workoutRoutes = require('./routes/workout.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Enable reverse proxy support for AWS Elastic Beanstalk (Nginx / ALB HTTPS headers)
app.set('trust proxy', 1);

// 1. Security Headers (Configured to allow Google Fonts, images, and inline styles)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS Configuration for Cookie-Based Authentication
const allowedOrigin = process.env.CLIENT_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl/same-origin)
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true
  })
);

// 3. Request Parsing Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// 4. Serve Existing Frontend and Static Assets (with cache revalidation to prevent stale client-side script caching)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// 5. API Routes Registration
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 6. Handle unmatched API routes with 404 JSON
app.use('/api/*', notFoundHandler);

// 7. Fallback for SPA/HTML (Serve index.html for non-API page requests)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// 8. Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
