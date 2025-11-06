import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-slate-800 text-white p-6 mt-8">
            <div className="container mx-auto text-center text-slate-300">
                <p className="font-semibold text-lg mb-2">Benjamin Carver</p>
                <p className="text-sm mb-2">Raleigh-Durham NC Realtor & Investor</p>
                <div className="flex justify-center items-center gap-x-4 gap-y-2 flex-wrap mb-4 text-sm">
                    <a href="mailto:benjamin@triangleexperts.com" className="hover:text-white transition-colors">benjamin@triangleexperts.com</a>
                    <span className="hidden sm:inline">|</span>
                    <a href="tel:919-343-5055" className="hover:text-white transition-colors">919-343-5055</a>
                </div>
                <p className="text-xs italic text-slate-400 mb-2">
                    App created by Benjamin Carver
                </p>
                <p className="text-xs italic text-slate-400">
                    Always double check your numbers. This calculator is for informational purposes only.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
