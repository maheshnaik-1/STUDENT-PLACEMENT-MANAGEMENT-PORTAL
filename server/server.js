const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to MongoDB
connectDB();

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for frontend
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// HTTP request logger in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Placement Management Portal API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/drives', require('./routes/driveRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on this server`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `[Server] Backend API running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection]: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
