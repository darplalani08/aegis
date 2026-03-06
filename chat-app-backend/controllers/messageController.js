const Message = require('../models/Message');
const Chat = require('../models/Chat');

// @desc    Get messages between two users (paginated)
// @route   GET /api/messages/:chatId?page=1&limit=50
exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const messages = await Message.find({ chat_id: chatId, deleted: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender_id', 'username profilePic')
            .lean();

        const total = await Message.countDocuments({ chat_id: chatId, deleted: false });

        res.json({
            messages: messages.reverse(),
            hasMore: skip + limit < total,
            total,
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get messages between two users by user IDs (legacy support)
// @route   GET /api/messages/direct/:userId
exports.getDirectMessages = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const messages = await Message.find({
            deleted: false,
            $or: [
                { sender_id: currentUserId, receiver_id: userId },
                { sender_id: userId, receiver_id: currentUserId },
            ],
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender_id', 'username profilePic')
            .lean();

        const total = await Message.countDocuments({
            deleted: false,
            $or: [
                { sender_id: currentUserId, receiver_id: userId },
                { sender_id: userId, receiver_id: currentUserId },
            ],
        });

        res.json({
            messages: messages.reverse(),
            hasMore: skip + limit < total,
            total,
        });
    } catch (error) {
        console.error('Get direct messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Edit a message
// @route   PUT /api/messages/:messageId
exports.editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this message' });
        }

        message.text = text;
        message.edited = true;
        await message.save();

        res.json(message);
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a message (soft delete)
// @route   DELETE /api/messages/:messageId
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this message' });
        }

        message.deleted = true;
        message.text = 'This message was deleted';
        await message.save();

        res.json({ message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add reaction to a message
// @route   POST /api/messages/:messageId/react
exports.addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Remove existing reaction from same user
        message.reactions = message.reactions.filter(
            (r) => r.user.toString() !== userId.toString()
        );

        // Add new reaction
        message.reactions.push({ user: userId, emoji });
        await message.save();

        res.json(message);
    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:senderId
exports.markAsRead = async (req, res) => {
    try {
        const { senderId } = req.params;
        const currentUserId = req.user._id;

        await Message.updateMany(
            {
                sender_id: senderId,
                receiver_id: currentUserId,
                status: { $ne: 'read' },
            },
            { status: 'read' }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
