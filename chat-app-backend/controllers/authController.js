const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide username, email and password' });
        }
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with that email or username already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const user = await User.create({ name: name || username, username, email, password_hash });
        if (user) {
            res.status(201).json({
                _id: user.id, name: user.name, username: user.username, email: user.email,
                profilePic: user.profilePic, bio: user.bio, statusMessage: user.statusMessage,
                theme: user.theme, token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        // VULNERABLE TO NOSQL INJECTION: accepts raw objects from req.body
        // If email is an object like {"$gt": ""}, MongoDB treats it as an operator
        const user = await User.findOne({ email }).select('+password_hash');
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();
        res.json({
            _id: user.id, name: user.name, username: user.username, email: user.email,
            profilePic: user.profilePic, bio: user.bio, statusMessage: user.statusMessage,
            theme: user.theme, token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
exports.googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'Google credential is required' });
        }

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Find existing user or create new one
        let user = await User.findOne({ email });

        if (!user) {
            // Auto-create user from Google info
            const username = email.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6);
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(googleId + Date.now(), salt);

            user = await User.create({
                name: name || 'Google User',
                username,
                email,
                password_hash,
                profilePic: picture || '',
                bio: 'Joined via Google',
                googleId,
            });
        }

        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        res.json({
            _id: user.id, name: user.name, username: user.username, email: user.email,
            profilePic: user.profilePic || picture, bio: user.bio, statusMessage: user.statusMessage,
            theme: user.theme, token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(401).json({ message: 'Google authentication failed. Make sure GOOGLE_CLIENT_ID is set.' });
    }
};

// @desc    Logout user & update status
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
    try {
        const { userId } = req.body;
        if (userId) {
            const user = await User.findById(userId);
            if (user) { user.status = 'offline'; user.lastSeen = new Date(); await user.save(); }
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all registered users
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password_hash');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
