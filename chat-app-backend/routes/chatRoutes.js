const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getChats,
    createChat,
    createGroupChat,
    togglePin,
    toggleMute,
} = require('../controllers/chatController');

router.get('/', protect, getChats);
router.post('/', protect, createChat);
router.post('/group', protect, createGroupChat);
router.put('/:chatId/pin', protect, togglePin);
router.put('/:chatId/mute', protect, toggleMute);

module.exports = router;
