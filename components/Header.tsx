import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-slate-800 text-white p-4 shadow-md">
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold tracking-wider">Real Estate Investment Calculator</h1>
            </div>
        </header>
    );
};

export default Header;
