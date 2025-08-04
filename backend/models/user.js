const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
            maxlength: [50, 'Name cannot exceed 50 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, 'Please provide a valid email address']
        },
        pincode: {
            type: String,
            required: [true, 'Pincode is required'],
            trim: true,
            validate: {
                validator: function (v) {
                    return /^\d{6}$/.test(v);
                },
                message: 'Pincode must be exactly 6 digits'
            }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        alertsReceived: {
            type: Number,
            default: 0
        },
        lastAlertAt: {
            type: Date
        }
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ pincode: 1 });
userSchema.index({ isActive: 1 });

// Virtual for user's full info
userSchema.virtual('userInfo').get(function () {
    return `${this.name} (${this.email}) - ${this.pincode}`;
});

// Pre-save middleware to update alertsReceived
userSchema.methods.incrementAlerts = function () {
    this.alertsReceived += 1;
    this.lastAlertAt = new Date();
    return this.save();
};

// Static method to find users by pincode
userSchema.statics.findByPincode = function (pincode) {
    return this.find({ pincode, isActive: true });
};

// Static method to get user statistics
userSchema.statics.getStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
                totalAlerts: { $sum: '$alertsReceived' }
            }
        }
    ]);

    return stats[0] || { totalUsers: 0, activeUsers: 0, totalAlerts: 0 };
};

module.exports = mongoose.model('User', userSchema);