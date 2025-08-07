const mongoose = require('mongoose');

// Configure Mongoose IMMEDIATELY to prevent buffering issues
mongoose.set('bufferCommands', false); // Disable command buffering
mongoose.set('maxTimeMS', 15000);      // Set default timeout for all operations

const uri = "mongodb+srv://apsoorya2020:FLCJZzuJ9N7GC0bl@cluster0.5j7cmfv.mongodb.net/wildanimaldb?retryWrites=true&w=majority&appName=Cluster0";

// Enhanced Mongoose connection with timeout configurations
const connectToDB = async () => {
  try {
    const conn = await mongoose.connect(uri, {
      // Connection timeout settings
      serverSelectionTimeoutMS: 30000, // 30 seconds to select a server
      socketTimeoutMS: 45000,           // 45 seconds for socket operations
      connectTimeoutMS: 30000,          // 30 seconds for initial connection
      
      // Connection pool settings
      maxPoolSize: 10,    // Maximum number of connections
      minPoolSize: 2,     // Minimum number of connections
      
      // Buffer settings to prevent timeout issues
      bufferCommands: false,     // Disable mongoose buffering
      
      // Keep alive and retry settings
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
      retryWrites: true,
      retryReads: true,
      
      // Use new URL parser and topology engine
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
    console.log(`🔗 Connected to database: ${conn.connection.name}`);
    
    // Test the connection
    await testConnection();
    
    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    
    // Don't exit process immediately, allow for retries
    setTimeout(() => {
      console.log("🔄 Attempting to reconnect to MongoDB...");
      connectToDB();
    }, 5000);
    
    throw error;
  }
};

// Test connection function
async function testConnection() {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('🏓 MongoDB ping successful - Connection is active');
    
    // Test collection access
    const usersCount = await mongoose.connection.db.collection('users').countDocuments({});
    console.log(`📊 Users collection accessible. Document count: ${usersCount}`);
    
  } catch (error) {
    console.error('❌ MongoDB ping or collection test failed:', error.message);
  }
}

// Connection event listeners for better monitoring
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  
  // Attempt to reconnect on error
  setTimeout(() => {
    console.log("🔄 Attempting to reconnect after error...");
    connectToDB();
  }, 5000);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Handle connection timeout specifically
mongoose.connection.on('timeout', () => {
  console.error('⏰ MongoDB connection timeout occurred');
});

// Enhanced database operations with timeout handling (for direct MongoDB operations)
const dbOperations = {
  // Get the native MongoDB collection with timeout handling
  getUsersCollection: () => {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected. Please wait for connection.');
    }
    return mongoose.connection.db.collection('users');
  },

  // Find user with timeout handling (bypasses Mongoose buffering)
  findUserDirect: async (query, options = {}) => {
    try {
      const collection = dbOperations.getUsersCollection();
      const result = await collection.findOne(query, {
        maxTimeMS: 15000, // 15 second timeout
        ...options
      });
      return result;
    } catch (error) {
      console.error('❌ Error in findUserDirect:', error.message);
      throw error;
    }
  },

  // Insert user directly (bypasses Mongoose buffering)
  insertUserDirect: async (userData) => {
    try {
      const collection = dbOperations.getUsersCollection();
      const result = await collection.insertOne(userData, {
        maxTimeMS: 15000
      });
      return result;
    } catch (error) {
      console.error('❌ Error in insertUserDirect:', error.message);
      throw error;
    }
  }
};

// Connection health check
async function checkConnection() {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.log(`📊 Mongoose connection state: ${states[state]}`);
    
    if (state === 1) {
      await mongoose.connection.db.admin().ping();
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Connection health check failed:', error.message);
    return false;
  }
}

// Initialize connection
async function initialize() {
  try {
    await connectToDB();
    console.log('🚀 Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    // Don't exit process, allow app to continue and retry
  }
}

// Graceful shutdown
async function closeConnection() {
  try {
    await mongoose.connection.close();
    console.log('🔄 MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing connection:', error.message);
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Closing MongoDB connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Closing MongoDB connection...');
  await closeConnection();
  process.exit(0);
});

// Auto-initialize when module is loaded
initialize();

// Export functions and operations
module.exports = {
  connectToDB,
  dbOperations,
  checkConnection,
  closeConnection,
  mongoose, // Export mongoose instance for model operations
  
  // Helper to get connection status
  isConnected: () => mongoose.connection.readyState === 1,
  
  // Middleware to ensure database connection before operations
  ensureConnection: async (req, res, next) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ Database not connected, current state:', mongoose.connection.readyState);
        return res.status(503).json({
          success: false,
          message: 'Database connection not ready. Please try again in a moment.'
        });
      }
      next();
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      return res.status(503).json({
        success: false,
        message: 'Database connection error.'
      });
    }
  },
  
  // Force wait for connection (use in routes)
  waitForConnection: async (maxWaitTime = 15000) => {
    const startTime = Date.now();
    
    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Database connection timeout after ' + maxWaitTime + 'ms');
      }
      
      console.log(`⏳ Waiting for database connection... Current state: ${mongoose.connection.readyState}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ Database connection confirmed');
    return true;
  }
};