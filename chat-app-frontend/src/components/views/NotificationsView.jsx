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

export default function NotificationsView() {
    return <ComingSoon title="Notifications" icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
    } description="Get real-time alerts for new messages, friend requests, and activity." />;
}
