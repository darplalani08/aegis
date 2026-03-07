const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getProfile,
    updateProfile,
    changePassword,
    blockUser,
    searchUsers,
    getAllUsers,
} = require('../controllers/userController');

router.get('/', protect, getAllUsers);
router.get('/search', protect, searchUsers);
router.get('/:userId', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.put('/block/:userId', protect, blockUser);

module.exports = router;
