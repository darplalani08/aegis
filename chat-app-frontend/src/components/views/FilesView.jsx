import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const FilesView = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { authAxios, API_URL, user } = useAuth();

    useEffect(() => {
        (async () => {
            try {
                // Fetch chats and gather file messages
                const chatRes = await authAxios.get('/api/chats');
                const chats = chatRes.data || [];
                const allFiles = [];

                for (const chat of chats.slice(0, 15)) {
                    const other = chat.otherUser || chat.participants?.find(p => p._id !== user?._id);
                    if (!other) continue;
                    try {
                        const msgRes = await authAxios.get(`/api/messages/direct/${other._id}?limit=100`);
                        const fileMessages = (msgRes.data.messages || [])
                            .filter(m => m.fileUrl)
                            .map(m => ({
                                ...m,
                                chatUser: other,
                                displayName: m.fileUrl.split('/').pop(),
                            }));
                        allFiles.push(...fileMessages);
                    } catch { /* skip */ }
                }

                allFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setFiles(allFiles);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [authAxios, user]);

    const filtered = files.filter(f => {
        if (filter === 'all') return true;
        if (filter === 'images') return f.fileType === 'image';
        if (filter === 'documents') return f.fileType !== 'image';
        return true;
    });

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'images', label: 'Images' },
        { id: 'documents', label: 'Docs' },
    ];

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="chat-list-panel">
            <div style={{ padding: '18px 18px 0' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, letterSpacing: '-0.3px' }}>Shared Files</h2>

                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {filters.map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            style={{
                                padding: '5px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                                fontSize: '0.74rem', fontWeight: 500, fontFamily: 'inherit',
                                background: filter === f.id ? 'var(--color-primary)' : 'var(--color-bg)',
                                color: filter === f.id ? 'white' : 'var(--color-text-secondary)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chat-items">
                {loading ? (
                    <motion.div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        Scanning files...
                    </motion.div>
                ) : filtered.length > 0 ? (
                    <AnimatePresence>
                        {filtered.map((f, i) => (
                            <motion.a
                                key={f._id}
                                href={`${API_URL}${f.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="chat-item"
                                style={{ textDecoration: 'none', color: 'inherit' }}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <div style={{
                                    width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: f.fileType === 'image' ? 'var(--color-primary-light)' : '#FEF3C7',
                                    fontSize: '1.2rem', flexShrink: 0,
                                }}>
                                    {f.fileType === 'image' ? '🖼️' : '📄'}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name" style={{ fontSize: '0.82rem' }}>{f.displayName}</div>
                                    <div className="chat-preview">
                                        From {f.chatUser?.name || f.chatUser?.username} • {formatDate(f.createdAt)}
                                    </div>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </motion.a>
                        ))}
                    </AnimatePresence>
                ) : (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-muted)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📁</div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>No files yet</p>
                        <p style={{ fontSize: '0.78rem' }}>Shared files will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilesView;
