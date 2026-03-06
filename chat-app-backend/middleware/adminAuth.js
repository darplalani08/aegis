const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware: verify JWT + check isAdmin
const adminAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) return res.status(401).json({ message: 'User not found' });
        if (!user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = adminAuth;
