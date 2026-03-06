const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: '',
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password_hash: {
            type: String,
            required: true,
        },
        profilePic: {
            type: String,
            default: '',
        },
        bio: {
            type: String,
            default: '',
            maxlength: 200,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        statusMessage: {
            type: String,
            default: 'Hey there! I am using ChatApp',
            maxlength: 100,
        },
        status: {
            type: String,
            enum: ['online', 'offline', 'away'],
            default: 'offline',
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light',
        },
        blockedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    {
        timestamps: true,
    }
);

// Prevent passwords from returning in JSON serialization
UserSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();
    delete userObject.password_hash;
    return userObject;
};

module.exports = mongoose.model('User', UserSchema);
