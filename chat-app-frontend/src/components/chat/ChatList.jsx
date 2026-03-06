import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const avatarColors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fccb90, #d57eeb)',
    'linear-gradient(135deg, #f6d365, #fda085)',
    'linear-gradient(135deg, #84fab0, #8fd3f4)',
    'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
];
const getAvatarColor = (n) => { let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };
const getDefaultAvatar = (name) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'now';
    if (diff < 60) return `${diff}m`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (hrs < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ChatList = ({ chats, activeChat, onSelectChat, onNewChat }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { user, API_URL } = useAuth();
    const { onlineUsers } = useSocket();

    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;
        const q = searchQuery.toLowerCase();
        return chats.filter((c) => {
            const o = c.otherUser;
            return o?.username?.toLowerCase().includes(q) || o?.name?.toLowerCase().includes(q);
        });
    }, [chats, searchQuery]);

    return (
        <div className="chat-list-panel">
            <div className="chat-list-header">
                <div className="header-top">
                    <img
                        src={user?.profilePic ? (user.profilePic.startsWith('http') ? user.profilePic : `${API_URL}${user.profilePic}`) : getDefaultAvatar(user?.name || user?.username)}
                        alt="" className="user-avatar"
                        onError={(e) => { e.target.src = getDefaultAvatar(user?.name || user?.username); }}
                    />
                    <span className="user-name-display">{user?.name || user?.username}</span>
                </div>
            </div>

            <div className="search-box">
                <span className="search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="chat-items">
                <AnimatePresence>
                    {filteredChats.map((chat, i) => {
                        const other = chat.otherUser;
                        if (!other) return null;
                        const isOnline = onlineUsers.includes(other._id);
                        const isActive = activeChat?._id === chat._id;
                        const lastMsg = chat.lastMessage;

                        return (
                            <motion.div
                                key={chat._id}
                                className={`chat-item ${isActive ? 'active' : ''}`}
                                onClick={() => onSelectChat(chat)}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                layout
                            >
                                <div className="avatar-wrapper">
                                    <img
                                        src={other.profilePic ? (other.profilePic.startsWith('http') ? other.profilePic : `${API_URL}${other.profilePic}`) : getDefaultAvatar(other.name || other.username)}
                                        alt="" className="avatar"
                                        onError={(e) => { e.target.src = getDefaultAvatar(other.name || other.username); }}
                                    />
                                    {isOnline && <span className="online-dot" />}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name">{other.name || other.username}</div>
                                    <div className="chat-preview">{lastMsg?.text || 'No messages yet'}</div>
                                </div>
                                <div className="chat-meta">
                                    <span className="chat-time">{lastMsg ? formatTime(lastMsg.createdAt) : ''}</span>
                                    {chat.unreadCount > 0 && (
                                        <motion.span className="unread-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                            {chat.unreadCount}
                                        </motion.span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {filteredChats.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 18px', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                        {searchQuery ? 'No results found' : 'No conversations yet'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;
