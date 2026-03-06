const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// ==================== ADMIN LOGIN (no auth required) ====================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ $or: [{ email }, { username: email }] });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        if (!user.isAdmin) return res.status(403).json({ message: 'Admin access required. Contact the system administrator.' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { _id: user._id, name: user.name, username: user.username, email: user.email, isAdmin: user.isAdmin, profilePic: user.profilePic } });
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
});

// All routes below require admin authentication
router.use(adminAuth);

// ==================== DASHBOARD STATS ====================
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalUsers, totalChats, totalMessages, activeToday, newUsersToday, messagesToday] = await Promise.all([
            User.countDocuments(),
            Chat.countDocuments(),
            Message.countDocuments(),
            User.countDocuments({ lastSeen: { $gte: today } }),
            User.countDocuments({ createdAt: { $gte: today } }),
            Message.countDocuments({ createdAt: { $gte: today } }),
        ]);

        // Messages per day for last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const start = new Date();
            start.setDate(start.getDate() - i);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            const count = await Message.countDocuments({ createdAt: { $gte: start, $lt: end } });
            last7Days.push({ date: start.toISOString().split('T')[0], count });
        }

        res.json({ totalUsers, totalChats, totalMessages, activeToday, newUsersToday, messagesToday, last7Days });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
    }
});

// ==================== USER MANAGEMENT ====================
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', sort = '-createdAt' } = req.query;
        const query = search
            ? { $or: [{ username: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
            : {};

        const [users, total] = await Promise.all([
            User.find(query).select('-password_hash').sort(sort).skip((page - 1) * limit).limit(Number(limit)),
            User.countDocuments(query),
        ]);

        res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, bio, isAdmin, status } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { name, email, bio, isAdmin, status }, { new: true }).select('-password_hash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update user', error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await Message.deleteMany({ $or: [{ sender_id: req.params.id }, { receiver_id: req.params.id }] });
        await Chat.deleteMany({ participants: req.params.id });
        res.json({ message: 'User and associated data deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user', error: err.message });
    }
});

// ==================== CHAT MANAGEMENT ====================
router.get('/chats', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const chats = await Chat.find()
            .populate('participants', 'username name email profilePic')
            .populate('lastMessage')
            .sort('-updatedAt')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Chat.countDocuments();
        res.json({ chats, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch chats', error: err.message });
    }
});

router.delete('/chats/:id', async (req, res) => {
    try {
        const chat = await Chat.findByIdAndDelete(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        res.json({ message: 'Chat deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete chat', error: err.message });
    }
});

// ==================== MESSAGE MANAGEMENT ====================
router.get('/messages', async (req, res) => {
    try {
        const { page = 1, limit = 30, search = '', userId = '' } = req.query;
        const query = {};
        if (search) query.text = { $regex: search, $options: 'i' };
        if (userId) query.$or = [{ sender_id: userId }, { receiver_id: userId }];

        const [messages, total] = await Promise.all([
            Message.find(query)
                .populate('sender_id', 'username name profilePic')
                .populate('receiver_id', 'username name profilePic')
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            Message.countDocuments(query),
        ]);

        res.json({ messages, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
    }
});

router.delete('/messages/:id', async (req, res) => {
    try {
        const msg = await Message.findByIdAndDelete(req.params.id);
        if (!msg) return res.status(404).json({ message: 'Message not found' });
        res.json({ message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete message', error: err.message });
    }
});

module.exports = router;
