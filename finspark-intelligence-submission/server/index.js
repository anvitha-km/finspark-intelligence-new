import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDB, getDBStats, enforceRetention } from './db.js';
import eventsRouter from './routes/events.js';
import analyticsRouter from './routes/analytics.js';
import governanceRouter from './routes/governance.js';
import syncRouter from './routes/sync.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

// ─── CORS Configuration ───
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));

// ─── Rate Limiters ───────────────────────────────────────────────────────────
//
// WHY: Without rate limiting, anyone can flood the event ingestion endpoint
// with millions of fake events, corrupting analytics and crashing the server.
// Enterprise platforms MUST protect their ingestion layer.
//
// TWO separate limiters because the two endpoint types have different needs:
//   - Event ingestion (/api/events) → strict. SDKs batch events so legitimate
//     clients rarely need more than 60 requests/min per IP.
//   - Analytics reads (/api/analytics) → relaxed. Dashboards poll frequently,
//     we don't want to block legitimate dashboard users.

// Strict limiter — for event ingestion
const eventLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 60,          // max 60 requests per IP per minute
  standardHeaders: true,        // return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Event ingestion rate limit exceeded. Max 60 requests/minute per IP.',
    retryAfter: '60 seconds'
  },
  handler: (req, res, next, options) => {
    console.warn(`⚠️  Rate limit hit on ${req.path} from ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Relaxed limiter — for analytics dashboard reads
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 300,         // 300 requests/min — generous for dashboard polling
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Analytics rate limit exceeded. Max 300 requests/minute per IP.'
  }
});

// ─── Request Logger Middleware ───
app.use((req, res, next) => {
  const start = Date.now();
  const { method, path } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status < 400 ? '\x1b[32m' : status < 500 ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';
    if (path === '/health') return;
    console.log(`${color}${method}${reset} ${path} → ${color}${status}${reset} (${duration}ms)`);
  });

  next();
});

// ─── API Routes (rate limiters applied per group) ───
// Enterprise auth middleware applied globally to all API routes
// (Bypassed internally if x-demo-bypass header is present for hackathon UI)
app.use('/api', requireAuth);

app.use('/api/events', eventLimiter, eventsRouter);
app.use('/api/analytics', analyticsLimiter, analyticsRouter);
app.use('/api/governance', analyticsLimiter, governanceRouter);
app.use('/api/sync', eventLimiter, syncRouter);

// ─── Health Check ───
app.get('/health', (_, res) => {
  try {
    const stats = getDBStats();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: stats
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    hint: 'Available routes: /health, /api/events, /api/analytics, /api/governance, /api/sync'
  });
});

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
  console.error(`\x1b[31m❌ Error on ${req.method} ${req.path}:\x1b[0m`, err.message);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// ─── Startup ───
const PORT = process.env.PORT || 4000;

initDB().then(() => {
  const purged = enforceRetention();
  if (purged > 0) console.log(`🗑️  Retention enforcement: ${purged} expired events removed`);

  setInterval(() => {
    const p = enforceRetention();
    if (p > 0) console.log(`🗑️  Scheduled retention: ${p} events purged`);
  }, 6 * 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║    🚀 FinSpark Intelligence Server                  ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Server:     http://localhost:${PORT}                  ║`);
    console.log(`║  Health:     http://localhost:${PORT}/health            ║`);
    console.log(`║  Dashboard:  http://localhost:3000                   ║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Security:                                          ║');
    console.log('║  Events:     60 req/min/IP  (strict)                ║');
    console.log('║  Analytics:  300 req/min/IP (relaxed)               ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    
    // Auto-seed if running on a fresh database (like Railway first deploy)
    const stats = getDBStats();
    if (stats.totalEvents === 0) {
      console.log('🌱 Database is empty. Auto-seeding 10 weeks of demo data...');
      fetch(`http://localhost:${PORT}/api/analytics/seed-demo`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-demo-bypass': 'hackathon-admin'
        }
      }).then(r => r.json()).then(resJson => {
        console.log(`✅ Auto-seed complete: ${resJson.seeded} events seeded.`);
      }).catch(err => {
        console.error('❌ Failed to auto-seed:', err);
      });
    }
  });
});
