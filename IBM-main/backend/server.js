const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// Check DB status for /health
const isConnected = () => mongoose.connection.readyState === 1;

// ✅ Root endpoint to fix "Cannot GET /"
app.get('/', (req, res) => {
    res.send('🎉 Wildlife Detection System Backend is running!');
});

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
