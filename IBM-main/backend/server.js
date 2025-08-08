// server.js

const express = require('express');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/auth.js'); // Adjusted path based on structure
const connectDB = require('./config/database'); // Adjusted path based on structure

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (e.g., body parser)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route to verify server
app.get('/', (req, res) => {
  res.send('🚀 Wildlife Detection System Backend is up and running!');
});

// TODO: Add your actual routes here
// Example:
// const yourRoutes = require('./routes/yourRoutes');
app.use('/api', apiRoutes);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Wildlife Detection System Backend is running on port ${PORT}`);
});
