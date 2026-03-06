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

export default function SearchView() {
    return <ComingSoon title="Global Search" icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
    } description="Search through all your messages, contacts, and shared files instantly." />;
}
