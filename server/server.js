// server.js - Main Server Entry Point
// ចំណុចចូលមេរបស់ម៉ាស៊ីនមេ

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config/config');
const { testConnection } = require('./config/database');

// Initialize Express app
const app = express();

// ====================
// Security Middleware
// ====================
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for now
}));

// Rate limiting - ការកំណត់អត្រាសំណើ
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later / សំណើច្រើនពេកពី IP នេះ សូមសាកល្បងម្តងទៀតនៅពេលក្រោយ'
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// ====================
// General Middleware
// ====================
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logging

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// ====================
// API Routes
// ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/pagodas', require('./routes/pagodas'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reminders', require('./routes/reminders'));

// ====================
// Root Route
// ====================
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Pagoda Fire Insurance System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      pagodas: '/api/pagodas',
      insurance: '/api/insurance',
      payments: '/api/payments',
      reports: '/api/reports',
      reminders: '/api/reminders'
    }
  });
});

// ====================
// Serve Frontend Pages
// ====================
// Catch all other routes and serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ====================
// Error Handling Middleware
// ====================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error / កំហុសម៉ាស៊ីនមេ',
    error: config.env === 'development' ? err : {}
  });
});

// ====================
// Start Server
// ====================
const PORT = config.port;

const startServer = async () => {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your database configuration.');
      console.error('Make sure MySQL is running and credentials in .env are correct.');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🏛️  Pagoda Fire Insurance System');
      console.log('ប្រព័ន្ធគ្រប់គ្រងការបង់ថ្លៃអគ្គិភ័យវត្ត');
      console.log('='.repeat(60));
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌐 Local: ${config.baseUrl}`);
      console.log(`🔒 Environment: ${config.env}`);
      console.log('='.repeat(60) + '\n');
      
      console.log('📝 Available endpoints:');
      console.log('   - Auth:       /api/auth');
      console.log('   - Users:      /api/users');
      console.log('   - Pagodas:    /api/pagodas');
      console.log('   - Insurance:  /api/insurance');
      console.log('   - Payments:   /api/payments');
      console.log('   - Reports:    /api/reports');
      console.log('   - Reminders:  /api/reminders');
      console.log('\n' + '='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

module.exports = app;
