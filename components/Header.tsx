import React from 'react';
import './Header.css';

interface HeaderProps {
    onOpenRecent: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenRecent }) => {
    return (
        <header className="calculator-hero text-white">
            <div className="calculator-hero__photo" aria-hidden="true" />
            <div className="calculator-hero__glow" aria-hidden="true" />
            <div className="calculator-hero__inner">
                <div className="calculator-hero__heading">
                    <a href="/" className="calculator-hero__eyebrow">Investing in Raleigh Team</a>
                    <h1>Real Estate Investment Calculator</h1>
                </div>
                <a href="/invest/" className="calculator-hero__cta">
                    <span className="block">Looking to invest in Raleigh?</span>
                    <span className="block">Book your one-on-one exploration call</span>
                </a>
                <button
                    type="button"
                    onClick={onOpenRecent}
                    className="calculator-hero__recent"
                >
                    <span>Recent Analysis</span>
                    <svg viewBox="0 0 32 24" width="32" height="24" fill="none" aria-hidden="true">
                        <path d="M2 12h26m-9-9 9 9-9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

export default Header;
