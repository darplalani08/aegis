const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const dns = require('dns');
// Force Google DNS to bypass local DNS refusing SRV lookups
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const { initSocket } = require('./socket.js');
initSocket(server);

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // List of explicit allowed origins
        const allowedOrigins = [
            process.env.CLIENT_URL,
            'https://www.nextalk.co.in',
            'https://nextalk.co.in',
            'http://localhost:5173',
            'http://localhost:5174'
        ];

        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);

        // Check if origin matches allowed list, or ends with our domain
        if (allowedOrigins.includes(origin) || origin.endsWith('nextalk.co.in')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS: ' + origin));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Route Imports
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const templateRoutes = require('./routes/templateRoutes');
const fileRoutes = require('./routes/fileRoutes');

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/template', templateRoutes);
app.use('/api/files', fileRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'Chat App Backend is running', timestamp: new Date().toISOString() });
});

// Database Connection
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chat_app';

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
