const app = require('./app');
const { checkDbHealth } = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 8080;

async function startServer() {
  // Verify database connectivity on boot
  console.log(`\n======================================================`);
  console.log(`  FitTrack — Gym Operating System & API Gateway`);
  console.log(`======================================================`);
  console.log(`Checking MySQL database connection...`);

  const dbHealth = await checkDbHealth();
  if (dbHealth.status === 'healthy') {
    console.log(`✔ Connected to MySQL database '${dbHealth.database}'.`);
  } else {
    console.warn(`⚠ Database health check warning:`, dbHealth.error);
    console.warn(`  Ensure MySQL is running and credentials in .env are correct.`);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server live and listening on:`);
    console.log(`   ➜ Local:   http://localhost:${PORT}`);
    console.log(`   ➜ Health:  http://localhost:${PORT}/api/health`);
    console.log(`\nPress Ctrl + C to stop the server.\n`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\nGracefully shutting down FitTrack server...');
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
