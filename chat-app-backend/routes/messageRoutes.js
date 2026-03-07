const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getMessages,
    getDirectMessages,
    editMessage,
    deleteMessage,
    addReaction,
    markAsRead,
    getAllSharedMedia,
} = require('../controllers/messageController');

router.get('/media/all', protect, getAllSharedMedia);
router.get('/:chatId', protect, getMessages);
router.get('/group/:chatId', protect, getMessages);
router.get('/direct/:userId', protect, getDirectMessages);
router.put('/read/:senderId', protect, markAsRead);
router.put('/:messageId', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);
router.post('/:messageId/react', protect, addReaction);

module.exports = router;
