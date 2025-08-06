const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use('/uploads', express.static('uploads'));



app.use('/api', require('./routes/auth'));


app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Wildlife Detection System Backend Running',
        timestamp: new Date().toISOString()
    });
});



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



app.listen(PORT, () => {
    console.log(`🚀 Wildlife Detection Server running on port ${PORT}`);
    console.log(`📧 Email service configured for: ${process.env.EMAIL_USER}`);
    console.log(`📍 Camera monitoring pincode: ${process.env.CAMERA_PINCODE}`);
});