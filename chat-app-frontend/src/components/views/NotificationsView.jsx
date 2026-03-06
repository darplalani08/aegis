import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const avatarColors = [
    'linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)',
];
const getColor = (n) => { let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const NotificationsView = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { authAxios, user } = useAuth();

    useEffect(() => {
        // Load recent chats to generate notifications from unread messages
        (async () => {
            try {
                const res = await authAxios.get('/api/chats');
                const chats = res.data || [];
                const notifs = chats
                    .filter(c => c.unreadCount > 0)
                    .map(c => {
                        const other = c.otherUser || c.participants?.find(p => p._id !== user?._id);
                        return {
                            id: c._id,
                            type: 'message',
                            user: other,
                            text: `${other?.name || other?.username} sent you ${c.unreadCount} new message${c.unreadCount > 1 ? 's' : ''}`,
                            time: c.lastMessage?.createdAt,
                            unread: true,
                        };
                    });
                setNotifications(notifs);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [authAxios, user]);

    const formatTime = (d) => {
        if (!d) return '';
        const diff = Math.floor((Date.now() - new Date(d)) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return new Date(d).toLocaleDateString();
    };

    return (
        <div className="chat-list-panel">
            <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.3px' }}>Notifications</h2>
                    {notifications.length > 0 && (
                        <button onClick={() => setNotifications([])} style={{ fontSize: '0.72rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            <div className="chat-items">
                <AnimatePresence>
                    {loading ? (
                        <motion.div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            Loading...
                        </motion.div>
                    ) : notifications.length > 0 ? notifications.map((n, i) => (
                        <motion.div
                            key={n.id}
                            className="chat-item"
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 15 }}
                            transition={{ delay: i * 0.05 }}
                            style={{ background: n.unread ? 'var(--color-primary-ultra-light)' : undefined }}
                        >
                            <div className="avatar-wrapper">
                                <div className="avatar-initials" style={{ background: getColor(n.user?.username || n.user?.name), width: 42, height: 42, fontSize: '0.9rem' }}>
                                    {(n.user?.name || n.user?.username || '?').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="chat-info">
                                <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>{n.text}</div>
                                <div className="chat-preview" style={{ fontSize: '0.68rem', marginTop: 2 }}>{formatTime(n.time)}</div>
                            </div>
                            {n.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />}
                        </motion.div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>All caught up!</p>
                            <p style={{ fontSize: '0.78rem' }}>No new notifications</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NotificationsView;
