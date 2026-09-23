import React from 'react';

interface HeaderProps {
    onOpenRecent: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenRecent }) => {
    return (
        <header className="bg-[#2F5233] text-white p-4 shadow-md">
            <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
                <div>
                    <a href="/" className="text-xs font-semibold uppercase tracking-widest text-[#E9CC77] hover:underline">Raleigh NC Guide</a>
                    <h1 className="text-xl font-bold tracking-wide sm:text-2xl">Real Estate Investment Calculator</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <a href="/invest/" className="rounded-lg bg-[#D8B13A] px-4 py-2.5 text-center text-sm font-bold text-[#203422] shadow-sm transition hover:bg-[#E9C65A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        Looking to invest in Raleigh? Book your one-on-one exploration call
                    </a>
                    <button
                        type="button"
                        onClick={onOpenRecent}
                        className="text-white font-semibold hover:text-slate-200 transition-colors"
                    >
                        Recent Analysis
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
