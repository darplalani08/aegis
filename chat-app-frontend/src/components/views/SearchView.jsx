import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const avatarColors = [
    'linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)',
];
const getColor = (n) => { let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const SearchView = ({ onStartChat }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ users: [], messages: [] });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const { authAxios, API_URL, user } = useAuth();
    const { onlineUsers } = useSocket();

    const handleSearch = useCallback(async (q) => {
        setQuery(q);
        if (!q.trim()) { setResults({ users: [], messages: [] }); setSearched(false); return; }
        setLoading(true);
        setSearched(true);
        try {
            // Search users
            const userRes = await authAxios.get(`/api/users/search?q=${encodeURIComponent(q)}`);
            const users = (userRes.data || []).filter(u => u._id !== user?._id);

            // Search messages across chats
            let messages = [];
            try {
                const chatRes = await authAxios.get('/api/chats');
                const chats = chatRes.data || [];
                for (const chat of chats.slice(0, 10)) {
                    const other = chat.otherUser || chat.participants?.find(p => p._id !== user?._id);
                    if (!other) continue;
                    try {
                        const msgRes = await authAxios.get(`/api/messages/direct/${other._id}?limit=50`);
                        const matched = (msgRes.data.messages || [])
                            .filter(m => m.text?.toLowerCase().includes(q.toLowerCase()))
                            .slice(0, 3)
                            .map(m => ({ ...m, chatUser: other }));
                        messages.push(...matched);
                    } catch { /* skip */ }
                }
            } catch { /* skip */ }

            setResults({ users, messages: messages.slice(0, 10) });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [authAxios, user]);

    return (
        <div className="chat-list-panel">
            <div style={{ padding: '18px 18px 0' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, letterSpacing: '-0.3px' }}>Search</h2>
            </div>
            <div className="search-box">
                <span className="search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input type="text" placeholder="Search users & messages..." value={query} onChange={e => handleSearch(e.target.value)} autoFocus />
            </div>

            <div className="chat-items">
                {loading ? (
                    <motion.div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        Searching...
                    </motion.div>
                ) : (
                    <>
                        {/* Users */}
                        {results.users.length > 0 && (
                            <>
                                <div style={{ padding: '8px 18px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    People
                                </div>
                                <AnimatePresence>
                                    {results.users.map((u, i) => (
                                        <motion.div key={u._id} className="chat-item" onClick={() => onStartChat(u)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                                            <div className="avatar-wrapper">
                                                {u.profilePic ? (
                                                    <img src={u.profilePic.startsWith('http') ? u.profilePic : `${API_URL}${u.profilePic}`} alt="" className="avatar" />
                                                ) : (
                                                    <div className="avatar-initials" style={{ background: getColor(u.username || u.name) }}>
                                                        {(u.name || u.username || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {onlineUsers.includes(u._id) && <span className="online-dot" />}
                                            </div>
                                            <div className="chat-info">
                                                <div className="chat-name">{u.name || u.username}</div>
                                                <div className="chat-preview">@{u.username}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </>
                        )}

                        {/* Messages */}
                        {results.messages.length > 0 && (
                            <>
                                <div style={{ padding: '8px 18px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 8 }}>
                                    Messages
                                </div>
                                <AnimatePresence>
                                    {results.messages.map((m, i) => (
                                        <motion.div key={m._id} className="chat-item" onClick={() => onStartChat(m.chatUser)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                                            <div className="avatar-wrapper">
                                                <div className="avatar-initials" style={{ background: getColor(m.chatUser?.username), width: 42, height: 42, fontSize: '0.85rem' }}>
                                                    {(m.chatUser?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="chat-info">
                                                <div className="chat-name" style={{ fontSize: '0.8rem' }}>{m.chatUser?.name || m.chatUser?.username}</div>
                                                <div className="chat-preview" style={{ fontSize: '0.76rem' }}>
                                                    {m.text?.length > 60 ? m.text.slice(0, 60) + '...' : m.text}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </>
                        )}

                        {searched && results.users.length === 0 && results.messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔍</div>
                                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>No results</p>
                                <p style={{ fontSize: '0.76rem', marginTop: 4 }}>Try a different search term</p>
                            </div>
                        )}

                        {!searched && (
                            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔍</div>
                                <p style={{ fontSize: '0.82rem' }}>Search across users and messages</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SearchView;
