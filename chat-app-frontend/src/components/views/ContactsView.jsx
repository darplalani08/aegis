import React from 'react';

const ComingSoon = ({ title, icon, description }) => {
    return (
        <div className="chat-list-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px', background: 'var(--color-primary-ultra-light)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                {icon}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-text)' }}>{title}</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5', maxWidth: '250px' }}>
                {description}
                <br /><br />
                <span style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--color-primary-ultra-light)', color: 'var(--color-primary)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Coming Soon</span>
            </p>
        </div>
    );
};

export default function ContactsView() {
    return <ComingSoon title="Contacts" icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    } description="Discover and connect with new people on NexTalk." />;
}
