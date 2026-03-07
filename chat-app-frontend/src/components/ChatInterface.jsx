import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import IconNavbar from './chat/IconSidebar';
import ChatList from './chat/ChatList';
import ChatWindow from './chat/ChatWindow';
import ContactPanel from './chat/ContactPanel';
import UserProfile from './UserProfile';
import ContactsView from './views/ContactsView';
import NotificationsView from './views/NotificationsView';
import SearchView from './views/SearchView';
import FilesView from './views/FilesView';

const avatarColors = ['linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)', 'linear-gradient(135deg, #f093fb, #f5576c)'];
const getColor = (n) => { let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; };

const ChatInterface = () => {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showProfile, setShowProfile] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchUsers, setSearchUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('chats');

    const { user, logout, authAxios, API_URL } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();

    useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

    const loadChats = useCallback(async () => {
        try {
            const res = await authAxios.get('/api/chats');
            setChats(res.data);
        } catch (err) { console.error('Failed to load chats:', err); }
    }, [authAxios]);

    useEffect(() => { if (user) loadChats(); }, [user, loadChats]);

    useEffect(() => {
        if (!socket?.current) return;
        const s = socket.current;
        const onNew = (msg) => { setMessages(prev => { const exists = prev.some(m => m._id === msg._id || (m._id?.startsWith?.('local_') && m.text === msg.text)); if (exists) return prev.map(m => m._id?.startsWith?.('local_') && m.text === msg.text ? msg : m); return [...prev, msg]; }); loadChats(); };
        const onSent = (msg) => { setMessages(prev => prev.map(m => m._id?.startsWith?.('local_') && m.text === msg.text ? msg : m)); loadChats(); };
        const onEdited = (msg) => { setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, text: msg.text, edited: true } : m)); };
        const onDeleted = ({ messageId }) => { setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m)); };
        const onReacted = ({ messageId, reactions }) => { setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m)); };
        const onRead = ({ readBy }) => { setMessages(prev => prev.map(m => { const sid = typeof m.sender_id === 'object' ? m.sender_id._id : m.sender_id; return sid === user?._id && m.receiver_id === readBy ? { ...m, status: 'read' } : m; })); };

        s.on('receive_private_message', onNew);
        s.on('message_sent', onSent);
        s.on('message_edited', onEdited);
        s.on('message_deleted', onDeleted);
        s.on('message_reacted', onReacted);
        s.on('messages_read', onRead);
        return () => { s.off('receive_private_message', onNew); s.off('message_sent', onSent); s.off('message_edited', onEdited); s.off('message_deleted', onDeleted); s.off('message_reacted', onReacted); s.off('messages_read', onRead); };
    }, [socket, user, loadChats]);

    const handleSelectChat = (chat) => { setActiveChat(chat); setMessages([]); setActiveTab('chats'); };

    // Start a chat from any view (Contacts, Search, etc.)
    const handleStartChatWithUser = async (selectedUser) => {
        try {
            const res = await authAxios.post('/api/chats', { participantId: selectedUser._id });
            await loadChats();
            const other = res.data.participants.find(p => p._id !== user._id);
            setActiveChat({ ...res.data, otherUser: other });
            setActiveTab('chats');
        } catch { toast.error('Failed to start chat'); }
    };

    const handleNewChat = async (selectedUser) => {
        setShowNewChat(false); setSearchQuery(''); setSearchUsers([]);
        await handleStartChatWithUser(selectedUser);
    };

    const handleSearchUsers = async (q) => {
        setSearchQuery(q);
        if (!q.trim()) { setSearchUsers([]); return; }
        try { const res = await authAxios.get(`/api/users/search?q=${encodeURIComponent(q)}`); setSearchUsers(res.data); }
        catch { /* ignore */ }
    };

    const handleLogout = async () => { await logout(); toast.success('Logged out'); navigate('/login'); };

    const handleTabChange = (tab) => { setActiveTab(tab); };

    if (!user) return null;

    const otherUser = activeChat?.otherUser || activeChat?.participants?.find(p => p._id !== user._id);

    // Render the left panel based on active tab
    const renderLeftPanel = () => {
        switch (activeTab) {
            case 'contacts':
                return <ContactsView onStartChat={handleStartChatWithUser} />;
            case 'notifications':
                return <NotificationsView chats={chats} onSelectChat={handleSelectChat} />;
            case 'search':
                return <SearchView onStartChat={handleStartChatWithUser} />;
            case 'files':
                return <FilesView />;
            case 'chats':
            default:
                return (
                    <ChatList
                        chats={chats}
                        activeChat={activeChat}
                        onSelectChat={handleSelectChat}
                        onNewChat={() => setShowNewChat(true)}
                    />
                );
        }
    };

    return (
        <div className="chat-app">
            {/* Left Icon Navbar */}
            <IconNavbar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onProfileClick={() => setShowProfile(!showProfile)}
            />

            {/* Left Panel — switches based on active tab */}
            {renderLeftPanel()}

            {/* Chat Window */}
            {activeChat && <ChatWindow chat={activeChat} messages={messages} setMessages={setMessages} />}

            {/* Right Contact Info Panel */}
            {activeChat && <ContactPanel activeChat={activeChat} otherUser={otherUser} />}

            {/* Profile Panel */}
            <AnimatePresence>
                {showProfile && (
                    <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
                        <UserProfile onClose={() => setShowProfile(false)} onLogout={handleLogout} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Chat Modal */}
            <AnimatePresence>
                {showNewChat && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewChat(false)}>
                        <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <h3>New Conversation</h3>
                            <div className="form-field">
                                <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => handleSearchUsers(e.target.value)} autoFocus />
                            </div>
                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {searchUsers.map(u => (
                                    <div key={u._id} className="user-result" onClick={() => handleNewChat(u)}>
                                        {u.profilePic ? (
                                            <img src={`${API_URL}${u.profilePic}`} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: getColor(u.username), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                                                {(u.name || u.username || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name || u.username}</div>
                                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>@{u.username}</div>
                                        </div>
                                    </div>
                                ))}
                                {searchQuery && searchUsers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>No users found</p>}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatInterface;
