const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection utilities
const { isConnected, waitForConnection, connectToDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', async (req, res) => {
    const dbStatus = isConnected() ? 'Connected' : 'Disconnected';
    
    res.json({
        status: 'OK',
        message: 'Wildlife Detection System Backend Running',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }

    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({ message: 'Only image files are allowed!' });
    }

    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Initialize application with database connection
const initializeApp = async () => {
    try {
        console.log('⏳ Initializing Wildlife Detection Server...');
        
        // Wait for database connection before setting up routes
        if (!isConnected()) {
            console.log('🔄 Waiting for database connection...');
            await waitForConnection(30000); // Wait up to 30 seconds
        }
        
        console.log('✅ Database connection established');
        
        // Import and setup routes AFTER database is connected
        const authRoutes = require('./routes/auth');
        app.use('/api', authRoutes);
        
        console.log('📡 Routes configured successfully');
        
        // Start server only after everything is initialized
        app.listen(PORT, () => {
            console.log(`🚀 Wildlife Detection Server running on port ${PORT}`);
            console.log(`📧 Email service configured for: ${process.env.EMAIL_USER}`);
            console.log(`📍 Camera monitoring pincode: ${process.env.CAMERA_PINCODE}`);
            console.log('✅ Server fully initialized and ready for requests');
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize server:', error.message);
        console.log('🔄 Retrying initialization in 5 seconds...');
        
        setTimeout(() => {
            initializeApp();
        }, 5000);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    const { closeConnection } = require('./config/database');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    const { closeConnection } = require('./config/database');
    await closeConnection();
    process.exit(0);
});

// Start the application
initializeApp();