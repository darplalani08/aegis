const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only images, documents, videos, and audio files are allowed'));
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter,
});

// @route   POST /api/upload
// @desc    Upload a file
router.post('/', protect, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        let fileType = '';

        if (req.file.mimetype.startsWith('image')) fileType = 'image';
        else if (req.file.mimetype.startsWith('video')) fileType = 'video';
        else if (req.file.mimetype.startsWith('audio')) fileType = 'audio';
        else fileType = 'document';

        res.json({
            fileUrl,
            fileType,
            fileName: req.file.originalname,
            fileSize: req.file.size,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// @route   POST /api/upload/avatar
// @desc    Upload profile picture
router.post('/avatar', protect, upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ fileUrl });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

module.exports = router;
