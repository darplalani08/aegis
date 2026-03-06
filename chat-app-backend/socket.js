const { Server } = require('socket.io');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const User = require('./models/User');

let io;
const userSocketMap = new Map();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // User joins the app
        socket.on('join_app', async (userId) => {
            if (!userId) return;

            userSocketMap.set(userId, socket.id);
            socket.join(userId);

            try {
                await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
            } catch (err) {
                console.error('Failed to update user status on join:', err);
            }

            console.log(`User ${userId} joined.`);
            io.emit('user_status_change', { userId, status: 'online' });

            const activeUsers = Array.from(userSocketMap.keys());
            io.to(socket.id).emit('active_users', activeUsers);
        });

        // Send private message
        socket.on('send_private_message', async (data) => {
            const { senderId, receiverId, text, fileUrl, fileType, chat_id } = data;

            try {
                // Find or create chat
                let chatId = chat_id;
                if (!chatId) {
                    let chat = await Chat.findOne({
                        participants: { $all: [senderId, receiverId], $size: 2 },
                    });
                    if (!chat) {
                        chat = await Chat.create({ participants: [senderId, receiverId] });
                    }
                    chatId = chat._id;
                }

                // Save message
                const newMessage = await Message.create({
                    sender_id: senderId,
                    receiver_id: receiverId,
                    chat_id: chatId,
                    text: text || '',
                    fileUrl: fileUrl || '',
                    fileType: fileType || '',
                    status: userSocketMap.has(receiverId) ? 'delivered' : 'sent',
                });

                // Update chat's lastMessage
                await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

                const populatedMsg = await Message.findById(newMessage._id)
                    .populate('sender_id', 'username profilePic')
                    .lean();

                // Emit to both sender and receiver
                io.to(receiverId).emit('receive_private_message', { ...populatedMsg, chat_id: chatId });
                io.to(senderId).emit('message_sent', { ...populatedMsg, chat_id: chatId });

            } catch (err) {
                console.error('Error handling private message:', err);
                io.to(socket.id).emit('message_error', { error: 'Failed to send message' });
            }
        });

        // Typing indicator
        socket.on('typing', ({ senderId, receiverId, isTyping }) => {
            io.to(receiverId).emit('display_typing', { senderId, isTyping });
        });

        // Mark messages as read
        socket.on('mark_read', async ({ senderId, receiverId }) => {
            try {
                await Message.updateMany(
                    { sender_id: senderId, receiver_id: receiverId, status: { $ne: 'read' } },
                    { status: 'read' }
                );
                io.to(senderId).emit('messages_read', { readBy: receiverId });
            } catch (err) {
                console.error('Error marking messages as read:', err);
            }
        });

        // Message edit
        socket.on('edit_message', async ({ messageId, newText, receiverId }) => {
            try {
                const message = await Message.findByIdAndUpdate(
                    messageId,
                    { text: newText, edited: true },
                    { new: true }
                ).lean();
                if (message) {
                    io.to(receiverId).emit('message_edited', message);
                }
            } catch (err) {
                console.error('Error editing message:', err);
            }
        });

        // Message delete
        socket.on('delete_message', async ({ messageId, receiverId }) => {
            try {
                await Message.findByIdAndUpdate(messageId, {
                    deleted: true,
                    text: 'This message was deleted',
                });
                io.to(receiverId).emit('message_deleted', { messageId });
            } catch (err) {
                console.error('Error deleting message:', err);
            }
        });

        // Message reaction
        socket.on('react_message', async ({ messageId, emoji, userId, receiverId }) => {
            try {
                const message = await Message.findById(messageId);
                if (message) {
                    message.reactions = message.reactions.filter(
                        (r) => r.user.toString() !== userId
                    );
                    message.reactions.push({ user: userId, emoji });
                    await message.save();
                    io.to(receiverId).emit('message_reacted', { messageId, reactions: message.reactions });
                    io.to(userId).emit('message_reacted', { messageId, reactions: message.reactions });
                }
            } catch (err) {
                console.error('Error reacting to message:', err);
            }
        });

        // Disconnect handler
        socket.on('disconnect', async () => {
            console.log(`Socket disconnected: ${socket.id}`);

            let disconnectedUserId = null;
            for (let [userId, mappedSocketId] of userSocketMap.entries()) {
                if (mappedSocketId === socket.id) {
                    disconnectedUserId = userId;
                    userSocketMap.delete(userId);
                    break;
                }
            }

            if (disconnectedUserId) {
                try {
                    await User.findByIdAndUpdate(disconnectedUserId, {
                        status: 'offline',
                        lastSeen: new Date(),
                    });
                    io.emit('user_status_change', { userId: disconnectedUserId, status: 'offline' });
                } catch (err) {
                    console.error('Error updating status on disconnect:', err);
                }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
};

const getUserSocketMap = () => userSocketMap;

module.exports = { initSocket, getIO, getUserSocketMap };
