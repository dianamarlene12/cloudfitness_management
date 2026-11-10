const express = require('express');
const { checkDbHealth } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  const dbHealth = await checkDbHealth();
  const isHealthy = dbHealth.status === 'healthy';

  const healthData = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      status: dbHealth.status,
      name: dbHealth.database || 'fittrack_db'
    },
    version: '2.4.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(isHealthy ? 200 : 503).json(healthData);
});

module.exports = router;
