const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const User = require('../models/user');
const emailService = require('../utils/emailService');
const { ensureConnection, waitForConnection, isConnected } = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'wildlife-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Apply connection middleware to all routes
router.use(ensureConnection);

// Get all users with connection check
router.get('/users', async (req, res) => {
    try {
        // Double-check connection before database operation
        await waitForConnection();
        
        const users = await User.find({})
            .select('-__v')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        
        if (error.message.includes('connection') || error.message.includes('timeout')) {
            return res.status(503).json({
                success: false,
                message: 'Database connection issue. Please try again.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Get statistics with connection check
router.get('/stats', async (req, res) => {
    try {
        await waitForConnection();
        
        const stats = await User.getStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        
        if (error.message.includes('connection') || error.message.includes('timeout')) {
            return res.status(503).json({
                success: false,
                message: 'Database connection issue. Please try again.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

// User registration with enhanced connection handling
router.post('/register', async (req, res) => {
    const { name, email, pincode } = req.body;

    try {
        // Validate input
        if (!name || !email || !pincode) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, pincode) are required'
            });
        }

        // Ensure connection is ready before database operations
        console.log('🔍 Checking database connection for user registration...');
        await waitForConnection(15000); // Wait up to 15 seconds
        console.log('✅ Database connection verified for registration');

        // Check for existing user
        console.log('🔍 Checking for existing user...');
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }]
        });

        if (existingUser) {
            console.log('⚠️ User already exists with this email');
            return res.status(400).json({
                success: false,
                message: 'User already registered with this email address'
            });
        }

        // Create new user
        console.log('✨ Creating new user...');
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            pincode: pincode.trim()
        });

        await newUser.save();
        console.log(`✅ New user registered: ${newUser.userInfo}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful! You will receive wildlife alerts for your area.',
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                pincode: newUser.pincode
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        // Handle specific error types
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Handle connection/timeout errors
        if (error.message.includes('connection') || 
            error.message.includes('timeout') || 
            error.name === 'MongooseError') {
            return res.status(503).json({
                success: false,
                message: 'Database connection issue. Please try again in a moment.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// Wildlife detection with connection handling
router.post('/detect-wildlife', upload.single('image'), async (req, res) => {
    let imagePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image file'
            });
        }

        imagePath = req.file.path;
        console.log(`🔍 Processing wildlife detection for image: ${req.file.filename}`);

        // Process image with Python script
        const pythonProcess = spawn('F:/IBM-main/.venv/Scripts/python.exe', [
            path.join(__dirname, '..', 'modelapi.py'),
            path.resolve(imagePath)
        ]);

        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            pythonError += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            try {
                if (code !== 0) {
                    console.error('Python script error:', pythonError);
                    throw new Error('Model prediction failed');
                }

                const result = JSON.parse(pythonOutput.trim());

                if (!result.success) {
                    throw new Error(result.error || 'Detection failed');
                }

                console.log(`🎯 Detection results: ${result.total_detections} animals detected`);

                // Handle wildlife detections with database connection check
                if (result.detections && result.detections.length > 0) {
                    // Ensure database connection before querying users
                    await waitForConnection(10000);
                    
                    const cameraLocation = process.env.CAMERA_PINCODE || '633800';
                    const usersInArea = await User.findByPincode(cameraLocation);

                    if (usersInArea.length > 0) {
                        // Send email alerts
                        const emailResults = await emailService.sendWildlifeAlert(
                            usersInArea,
                            result.detections,
                            cameraLocation
                        );

                        // Update user alert counts
                        const updatePromises = usersInArea.map(user => user.incrementAlerts());
                        await Promise.all(updatePromises);

                        console.log(`🚨 WILDLIFE ALERT: Notified ${emailResults.successful} users in pincode ${cameraLocation}`);

                        res.status(200).json({
                            success: true,
                            alert: true,
                            message: `⚠️ WILDLIFE DETECTED! ${result.detections.length} animal(s) found. Emergency alerts sent to ${emailResults.successful} registered users in the monitoring area.`,
                            data: {
                                detections: result.detections,
                                location: cameraLocation,
                                alertsSent: emailResults.successful,
                                totalUsers: usersInArea.length,
                                timestamp: new Date().toISOString()
                            }
                        });
                    } else {
                        console.log(`⚠️ Wildlife detected but no users registered in pincode ${cameraLocation}`);

                        res.status(200).json({
                            success: true,
                            alert: true,
                            message: `Wildlife detected but no users are registered in the monitoring area (${cameraLocation}).`,
                            data: {
                                detections: result.detections,
                                location: cameraLocation,
                                alertsSent: 0,
                                totalUsers: 0
                            }
                        });
                    }
                } else {
                    console.log('✅ No wildlife detected in image');

                    res.status(200).json({
                        success: true,
                        alert: false,
                        message: '✅ No wildlife detected in the uploaded image. Area appears safe.',
                        data: {
                            detections: [],
                            location: process.env.CAMERA_PINCODE || '633800',
                            alertsSent: 0
                        }
                    });
                }

            } catch (parseError) {
                console.error('Error processing detection results:', parseError);
                
                if (parseError.message.includes('connection') || parseError.message.includes('timeout')) {
                    return res.status(503).json({
                        success: false,
                        message: 'Database connection issue during alert processing'
                    });
                }
                
                res.status(500).json({
                    success: false,
                    message: 'Failed to process detection results',
                    error: parseError.message
                });
            } finally {
                // Clean up uploaded file
                if (imagePath && fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        });

        // Handle Python process errors
        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            if (imagePath && fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            res.status(500).json({
                success: false,
                message: 'Detection service unavailable',
                error: 'Failed to start detection process'
            });
        });

    } catch (error) {
        console.error('Detection route error:', error);

        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        if (error.message.includes('connection') || error.message.includes('timeout')) {
            return res.status(503).json({
                success: false,
                message: 'Database connection issue. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Wildlife detection failed',
            error: error.message
        });
    }
});

// Get users by pincode with connection check
router.get('/users/pincode/:pincode', async (req, res) => {
    try {
        await waitForConnection();
        
        const users = await User.findByPincode(req.params.pincode);
        res.status(200).json({
            success: true,
            count: users.length,
            pincode: req.params.pincode,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users by pincode:', error);
        
        if (error.message.includes('connection') || error.message.includes('timeout')) {
            return res.status(503).json({
                success: false,
                message: 'Database connection issue. Please try again.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

module.exports = router;