import React from 'react';

interface HeaderProps {
    onOpenRecent: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenRecent }) => {
    return (
        <header className="bg-[#2F5233] text-white p-4 shadow-md">
            <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
                <div>
                    <a href="/" className="text-xs font-semibold uppercase tracking-widest text-[#E9CC77] hover:underline">Raleigh NC Guide</a>
                    <h1 className="text-xl font-bold tracking-wide sm:text-2xl">Real Estate Investment Calculator</h1>
                </div>
                <button
                    type="button"
                    onClick={onOpenRecent}
                    className="text-white font-semibold hover:text-slate-200 transition-colors"
                >
                    Recent Analysis
                </button>
            </div>
        </header>
    );
};

export default Header;
