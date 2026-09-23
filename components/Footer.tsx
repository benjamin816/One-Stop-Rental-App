import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-[#2F5233] text-white p-6 mt-8">
            <div className="container mx-auto text-center text-slate-300">
                <div className="mb-7 rounded-xl border border-[#E9CC77]/40 bg-white/10 px-5 py-6">
                    <p className="text-lg font-bold text-white">Want to explore Raleigh investment opportunities together?</p>
                    <p className="mb-4 mt-1 text-sm text-slate-200">Bring your questions and your calculator results to a one-on-one call.</p>
                    <a href="/invest/" className="inline-block rounded-lg bg-[#D8B13A] px-5 py-3 font-bold text-[#203422] transition hover:bg-[#E9C65A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Book your one-on-one exploration call</a>
                </div>
                <p className="font-semibold text-lg mb-2">Benjamin Carver</p>
                <p className="text-sm mb-2">Raleigh-Durham NC Realtor & Investor</p>
                <div className="flex justify-center items-center gap-x-4 gap-y-2 flex-wrap mb-4 text-sm">
                    <a href="mailto:benjamin.carver@exprealty.com" className="hover:text-white transition-colors">benjamin.carver@exprealty.com</a>
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
