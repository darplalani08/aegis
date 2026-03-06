import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageInput from './MessageInput';

const avatarColors = [
    'linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)', 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fccb90, #d57eeb)', 'linear-gradient(135deg, #f6d365, #fda085)',
];
const getColor = (n) => { let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const getDefaultAvatar = (name) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const ChatWindow = ({ chat, messages, setMessages }) => {
    const { user, authAxios, API_URL } = useAuth();
    const { onlineUsers, typingUsers, sendMessage, emitTyping, markRead } = useSocket();
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const endRef = useRef(null);

    const other = chat?.otherUser || chat?.participants?.find(p => p._id !== user?._id);
    const isOnline = other && onlineUsers.includes(other._id);
    const isTyping = other && typingUsers[other._id];
    const otherColor = getColor(other?.username || other?.name || '');

    // Close menu when clicking outside
    useEffect(() => {
        const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    useEffect(() => {
        if (!other?._id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await authAxios.get(`/api/messages/direct/${other._id}?limit=100`);
                setMessages(res.data.messages || []);
                markRead(other._id, user._id);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [other?._id]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = useCallback((text, fileUrl, fileType) => {
        if (!text?.trim() && !fileUrl) return;
        sendMessage({ senderId: user._id, receiverId: other._id, text: text || '', fileUrl: fileUrl || '', fileType: fileType || '', chat_id: chat._id });
        setMessages(prev => [...prev, { _id: 'local_' + Date.now(), sender_id: user._id, receiver_id: other._id, text: text || '', fileUrl: fileUrl || '', fileType: fileType || '', status: 'sent', createdAt: new Date().toISOString(), reactions: [], edited: false, deleted: false }]);
    }, [user, other, chat, sendMessage, setMessages]);

    const handleTyping = useCallback((v) => { if (other) emitTyping(user._id, other._id, v); }, [user, other, emitTyping]);

    const handleDeleteMessage = async (msgId) => {
        try {
            await authAxios.delete(`/api/messages/${msgId}`);
            setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deleted: true } : m));
            toast.success('Message deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const handleClearChat = () => {
        toast('Clear chat feature coming soon!', { icon: '🗑️' });
        setShowMenu(false);
    };

    const handleExportChat = () => {
        if (!messages.length) { toast.error('No messages to export'); setShowMenu(false); return; }
        const lines = messages.map(m => {
            const sender = (typeof m.sender_id === 'object' ? m.sender_id._id : m.sender_id) === user._id ? 'You' : (other.name || other.username);
            return `[${formatTime(m.createdAt)}] ${sender}: ${m.deleted ? '[deleted]' : m.text}`;
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `chat-${other.name || other.username}.txt`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Chat exported!');
        setShowMenu(false);
    };

    // Get avatar src for other user
    const otherAvatar = other?.profilePic
        ? (other.profilePic.startsWith('http') ? other.profilePic : `${API_URL}${other.profilePic}`)
        : getDefaultAvatar(other?.name || other?.username);

    if (!other) {
        return (
            <div className="chat-window">
                <div className="empty-chat">
                    <motion.div className="empty-icon" animate={{ y: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity }}>💬</motion.div>
                    <p>Select a conversation</p>
                    <span>Choose from your contacts to start messaging</span>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="chat-window-header">
                <div className="user-info">
                    <img src={otherAvatar} alt="" className="avatar" onError={(e) => { e.target.src = getDefaultAvatar(other.name || other.username); }} />
                    <div>
                        <div className="user-name">{other.name || other.username}</div>
                        <div className={`user-status ${isOnline ? '' : 'offline'}`}>
                            {isOnline ? 'Active now' : 'Offline'}
                        </div>
                    </div>
                </div>
                <div className="header-actions" ref={menuRef} style={{ position: 'relative' }}>
                    <button title="More options" onClick={() => setShowMenu(!showMenu)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                        </svg>
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                className="dropdown-menu"
                                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                transition={{ duration: 0.15 }}
                            >
                                <button className="dropdown-item" onClick={() => { navigator.clipboard.writeText(other.email || other.username); toast.success('Copied!'); setShowMenu(false); }}>
                                    📋 Copy Info
                                </button>
                                <button className="dropdown-item" onClick={handleExportChat}>
                                    📥 Export Chat
                                </button>
                                <button className="dropdown-item" onClick={() => { toast('Muted!', { icon: '🔇' }); setShowMenu(false); }}>
                                    🔇 Mute
                                </button>
                                <button className="dropdown-item" onClick={handleClearChat}>
                                    🗑️ Clear Chat
                                </button>
                                <button className="dropdown-item" style={{ color: '#EF4444' }} onClick={() => { toast('Block user coming soon', { icon: '🚫' }); setShowMenu(false); }}>
                                    🚫 Block User
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
                {loading && (
                    <motion.div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        Loading...
                    </motion.div>
                )}

                {messages.length > 0 && <div className="date-divider"><span>Today</span></div>}

                <AnimatePresence>
                    {messages.map((msg) => {
                        const sid = typeof msg.sender_id === 'object' ? msg.sender_id._id : msg.sender_id;
                        const isSent = sid === user._id;

                        if (msg.deleted) {
                            return (
                                <motion.div key={msg._id} className={`message-row ${isSent ? 'sent' : 'received'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <div className="message-bubble" style={{ opacity: 0.4, fontStyle: 'italic', background: 'rgba(0,0,0,0.03)' }}>
                                        This message was deleted
                                    </div>
                                </motion.div>
                            );
                        }

                        return (
                            <motion.div key={msg._id} className={`message-row ${isSent ? 'sent' : 'received'}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                                {!isSent && (
                                    <img src={otherAvatar} alt="" className="msg-avatar" onError={(e) => { e.target.src = getDefaultAvatar(other.name || other.username); }} />
                                )}
                                <div>
                                    <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
                                        {/* VULNERABLE TO XSS: renders message HTML without escaping */}
                                        <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                                        {msg.edited && <span className="edited-tag"> (edited)</span>}
                                        {msg.fileUrl && (
                                            <div className="file-preview">
                                                {msg.fileType === 'image' ? <img src={`${API_URL}${msg.fileUrl}`} alt="" /> : <a href={`${API_URL}${msg.fileUrl}`} target="_blank" rel="noreferrer">📎 File</a>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="message-time">
                                        {formatTime(msg.createdAt)}
                                        {isSent && <span className={`read-receipt ${msg.status === 'read' ? '' : 'pending'}`}>{msg.status === 'read' ? '✓✓' : '✓'}</span>}
                                        {isSent && !msg._id?.startsWith('local_') && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg._id)}
                                                style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--color-text-muted)', padding: 0, opacity: 0.5 }}
                                                title="Delete message"
                                            >🗑️</button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {isTyping && (
                    <motion.div className="typing-indicator" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="typing-dots"><span /><span /><span /></div>
                        {other.name || other.username} is typing...
                    </motion.div>
                )}
                <div ref={endRef} />
            </div>

            <MessageInput onSend={handleSend} onTyping={handleTyping} />
        </div>
    );
};

export default ChatWindow;
