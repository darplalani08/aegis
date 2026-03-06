const express = require('express');
const router = express.Router();
const { register, login, logout, getAllUsers, googleLogin } = require('../controllers/authController');

router.get('/users', getAllUsers);
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/logout', logout);

module.exports = router;
