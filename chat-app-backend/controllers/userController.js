const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get user profile
// @route   GET /api/users/:userId
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, bio, statusMessage, theme, profilePic } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name !== undefined) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (statusMessage !== undefined) user.statusMessage = statusMessage;
        if (theme !== undefined) user.theme = theme;
        if (profilePic !== undefined) user.profilePic = profilePic;

        await user.save();
        res.json(user);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Change password
// @route   PUT /api/users/password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId).select('+password_hash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Block a user
// @route   PUT /api/users/block/:userId
exports.blockUser = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.params;

        const user = await User.findById(currentUserId);
        const isBlocked = user.blockedUsers.includes(userId);

        if (isBlocked) {
            user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId);
        } else {
            user.blockedUsers.push(userId);
        }

        await user.save();
        res.json({ blocked: !isBlocked });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Search users
// @route   GET /api/users/search?q=query
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const users = await User.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
            ],
            _id: { $ne: req.user._id },
        }).select('-password_hash').limit(20);

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all users (for contacts list)
// @route   GET /api/users
exports.getAllUsers = async (req, res) => {
    try {
        // Find all users except the current one, limiting to 100 for basic demonstration
        const users = await User.find({
            _id: { $ne: req.user._id }
        })
            .select('-password_hash')
            .limit(100)
            .sort({ name: 1, username: 1 }); // Sort alphabetically

        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
