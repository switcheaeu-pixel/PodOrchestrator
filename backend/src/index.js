const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Load environment variables
dotenv.config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Import routes
const authRoutes = require('./routes/auth');
const podcastRoutes = require('./routes/podcasts');
const voiceRoutes = require('./routes/voices');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');

// Import middleware
const { authenticate } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

// Import database connection
const { initDb } = require('./db');
const { initRedis } = require('./redis');
const { initWorkflowQueue } = require('./queues/workflowQueue');

const app = express();
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  logger.info('New WebSocket connection');
  
  // Extract token from query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(1008, 'Token mancante');
    return;
  }
  
  // Verify token (simplified - implement proper JWT verification)
  try {
    // In production, use JWT verification
    const userId = verifyToken(token); // Implement this function
    ws.userId = userId;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleWebSocketMessage(ws, data);
      } catch (error) {
        logger.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connesso al server Podcast AI',
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    ws.close(1008, 'Autenticazione fallita');
  }
});

function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'subscribe':
      if (data.podcastId) {
        // Subscribe to podcast updates
        subscribeToPodcast(ws, data.podcastId, ws.userId);
      }
      break;
    case 'unsubscribe':
      if (data.podcastId) {
        unsubscribeFromPodcast(ws, data.podcastId);
      }
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    default:
      logger.warn('Unknown WebSocket message type:', data.type);
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // Would check actual connection
      redis: 'connected',
      workflowQueue: 'running'
    }
  });
});

// API Documentation
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./docs/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/podcasts', authenticate, rateLimiter, podcastRoutes);
app.use('/api/voices', authenticate, rateLimiter, voiceRoutes);
app.use('/api/billing', authenticate, billingRoutes);

// Admin routes (require admin role)
app.use('/api/admin', authenticate, adminRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint non trovato',
    message: `Il percorso ${req.url} non esiste`
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing services...');
    
    // Initialize database
    await initDb();
    logger.info('Database initialized');
    
    // Initialize Redis
    await initRedis();
    logger.info('Redis initialized');
    
    // Initialize workflow queue
    await initWorkflowQueue();
    logger.info('Workflow queue initialized');
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  await initializeServices();
  
  server.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`API Documentation: http://${HOST}:${PORT}/api-docs`);
    logger.info(`WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
    
    // Log environment
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, wss, logger };