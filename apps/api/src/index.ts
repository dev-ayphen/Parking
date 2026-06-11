import 'dotenv/config';
import http from 'http';
import app from './app';
import { setupSocketIO } from './app';
import { env } from './config/env';
import { bookingExpiryService } from './services/bookingExpiry.service';

const server = http.createServer(app);

// Setup Socket.IO
setupSocketIO(server);

server.listen(env.PORT, () => {
  console.log(`✅ API Server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  // Start the 30-second booking expiry background loop
  bookingExpiryService.startExpiryLoop();
});

/**
 * Graceful shutdown handler
 */
const handleShutdown = () => {
  console.log('🛑 Shutting down server gracefully...');

  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Force closing server');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Crash safety — log and keep the process alive where possible
process.on('uncaughtException', (err) => {
  console.error('[CRASH] uncaughtException:', err);
  // Fatal — exit so the process manager (PM2/Docker) can restart cleanly
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  // Non-fatal in most cases — log and continue
  console.error('[CRASH] unhandledRejection:', reason);
});
