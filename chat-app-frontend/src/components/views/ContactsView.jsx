import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const avatarColors = [
    'linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)', 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
];
const getColor = (n) => { let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const ContactsView = ({ onStartChat }) => {
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const { authAxios, API_URL, user } = useAuth();
    const { onlineUsers } = useSocket();

    useEffect(() => {
        (async () => {
            try {
                const res = await authAxios.get('/api/auth/users');
                setContacts(res.data.filter(u => u._id !== user?._id));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [authAxios, user]);

    const filtered = contacts.filter(c =>
        !search.trim() ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.username?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="chat-list-panel">
            <div style={{ padding: '18px 18px 0' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, letterSpacing: '-0.3px' }}>Contacts</h2>
            </div>
            <div className="search-box">
                <span className="search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input type="text" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ padding: '0 18px 8px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {filtered.filter(c => onlineUsers.includes(c._id)).length} Online • {filtered.length} Total
                </div>
            </div>

            <div className="chat-items">
                <AnimatePresence>
                    {loading ? (
                        <motion.div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            Loading contacts...
                        </motion.div>
                    ) : filtered.map((c, i) => {
                        const isOnline = onlineUsers.includes(c._id);
                        return (
                            <motion.div
                                key={c._id}
                                className="chat-item"
                                onClick={() => onStartChat(c)}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <div className="avatar-wrapper">
                                    {c.profilePic ? (
                                        <img src={c.profilePic.startsWith('http') ? c.profilePic : `${API_URL}${c.profilePic}`} alt="" className="avatar" />
                                    ) : (
                                        <div className="avatar-initials" style={{ background: getColor(c.username || c.name) }}>
                                            {(c.name || c.username || '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {isOnline && <span className="online-dot" />}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name">{c.name || c.username}</div>
                                    <div className="chat-preview">{c.bio || c.email}</div>
                                </div>
                                <div style={{ fontSize: '0.68rem', color: isOnline ? 'var(--color-accent-green)' : 'var(--color-text-muted)', fontWeight: 500 }}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                        {search ? 'No contacts found' : 'No contacts yet'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactsView;
