import React from 'react';

interface HeaderProps {
    onOpenRecent: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenRecent }) => {
    return (
        <header className="bg-[#2F5233] text-white p-4 shadow-md">
            <div className="container mx-auto grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div>
                    <a href="/" className="text-xs font-semibold uppercase tracking-widest text-[#E9CC77] hover:underline">Raleigh NC Guide</a>
                    <h1 className="text-xl font-bold tracking-wide sm:text-2xl">Real Estate Investment Calculator</h1>
                </div>
                <a href="/invest/" className="w-full max-w-[290px] justify-self-center rounded-lg border border-[#E9C65A] bg-[#94700E] px-4 py-2.5 text-center text-sm font-bold leading-snug text-white shadow-sm transition hover:bg-[#7D5D0F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:w-[290px]">
                    <span className="block">Looking to invest in Raleigh?</span>
                    <span className="block">Book your 101 exploration call</span>
                </a>
                <button
                    type="button"
                    onClick={onOpenRecent}
                    className="justify-self-center font-semibold text-white transition-colors hover:text-slate-200 lg:justify-self-end"
                >
                    Recent Analysis
                </button>
            </div>
        </header>
    );
};

export default Header;
