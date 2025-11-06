import React, { useMemo, useState } from 'react';
import InputField from './InputField';
import KpiCard from './KpiCard';
import { pmt, loanAmt, money } from '../utils/calculators';
import type { LtrData, CalculatorType } from '../App';

interface LtrCalculatorProps {
    data: LtrData;
    onChange: (field: keyof LtrData, value: string) => void;
    onCheckboxChange: (field: keyof LtrData, checked: boolean) => void;
    onPushData: (source: CalculatorType, destination: CalculatorType) => void;
    onExportPdf: (elementId: string, filename: string, actionsClass: string) => void;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-bold text-md mt-6 mb-2 border-b pb-1 col-span-1 md:col-span-2">{children}</h3>
);

const calculatorNames: Record<CalculatorType, string> = {
    ltr: 'LTR', room: 'By-the-Room', str: 'STR', multi: 'Multi-Unit', build: 'New Build', dscr: 'DSCR Loan',
};

const LtrCalculator: React.FC<LtrCalculatorProps> = ({ data, onChange, onCheckboxChange, onPushData, onExportPdf }) => {
    const [isPushMenuOpen, setIsPushMenuOpen] = useState(false);
    const metrics = useMemo(() => {
        const purchaseLoan = loanAmt(data.purchase, data.downPct);
        const loan = data.renoFinanced ? purchaseLoan + data.renovation : purchaseLoan;
        const pi = pmt(loan, data.rate, data.term);
        const piti = pi + data.taxYr / 12 + data.insMo;
        const opex = data.hoa + data.rent * (data.pmPct + data.maintPct + data.capexPct) / 100 + data.utilities;
        const cf = data.rent - piti - opex;
        const cashIn = data.renoFinanced ? data.downAmt + data.cc : data.downAmt + data.cc + data.renovation;
        const coc = cashIn > 0 ? (cf * 12) / cashIn * 100 : 0;
        const ccPct = data.purchase > 0 ? (data.cc / data.purchase * 100).toFixed(2) + '%' : '—';
        
        const pmMonthly = data.rent * (data.pmPct / 100);
        const maintMonthly = data.rent * (data.maintPct / 100);
        const capexMonthly = data.rent * (data.capexPct / 100);

        return { loan, pi, piti, opex, cf, coc, ccPct, pmMonthly, maintMonthly, capexMonthly, cashIn, purchaseLoan };
    }, [data]);
    
    const CALCULATOR_ID = "ltr-calculator";
    const ACTIONS_CLASS = "ltr-actions";
    const availableDestinations = (Object.keys(calculatorNames) as CalculatorType[]).filter(key => key !== 'ltr');

    const handlePushClick = (destination: CalculatorType) => {
        onPushData('ltr', destination);
        setIsPushMenuOpen(false);
    };

    return (
        <div id={CALCULATOR_ID} className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="font-extrabold tracking-wide text-lg mb-3">Long / Medium-Term Rental</h2>
            
            <div className={`${ACTIONS_CLASS} flex justify-end items-center gap-2 mb-4`}>
                <div className="relative">
                    <button onClick={() => setIsPushMenuOpen(prev => !prev)} className="py-2 px-4 rounded-full font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200 text-sm">
                        Send Data To...
                    </button>
                    {isPushMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
                            <ul className="py-1">
                                {availableDestinations.map(key => (
                                    <li key={key}><button onClick={() => handlePushClick(key)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">{calculatorNames[key]}</button></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <button onClick={() => onExportPdf(CALCULATOR_ID, 'LTR_Analysis', ACTIONS_CLASS)} className="py-2 px-4 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-sm">
                    Export PDF
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionHeader>The Purchase</SectionHeader>
                <InputField label="Purchase Price" id="ltr_purchase" value={data.purchase} onChange={e => onChange('purchase', e.target.value)} min={50000} max={1500000} step={1000} />
                <InputField label="Down Payment (%)" id="ltr_down_pct" value={data.downPct} onChange={e => onChange('downPct', e.target.value)} min={0} max={100} step={0.25} 
                    secondaryInput={{ label: 'or Down $', id: 'ltr_down_amt', value: data.downAmt, onChange: e => onChange('downAmt', e.target.value) }}/>
                <InputField label="Closing Costs ($)" id="ltr_cc" value={data.cc} onChange={e => onChange('cc', e.target.value)} min={0} max={50000} step={100} infoText={`CC = ${metrics.ccPct} of price`}/>
                 <div className="col-span-1 md:col-span-2 text-xs text-slate-500 -mt-2">
                    {data.renoFinanced ? (
                        <span>Loan Amount = {money(metrics.purchaseLoan)} (purchase) + {money(data.renovation)} (reno) = <span className="font-semibold">{money(metrics.loan)}</span></span>
                    ) : (
                        <span>Loan Amount = <span className="font-semibold">{money(metrics.loan)}</span></span>
                    )}
                </div>

                <SectionHeader>The Loan</SectionHeader>
                <InputField label="Rate (%)" id="ltr_rate" value={data.rate} onChange={e => onChange('rate', e.target.value)} min={0} max={15} step={0.05} />
                <InputField label="Term (years)" id="ltr_term" value={data.term} onChange={e => onChange('term', e.target.value)} min={1} max={40} step={1} />

                <SectionHeader>Renovation</SectionHeader>
                <InputField label="Renovation ($)" id="ltr_renovation" value={data.renovation} onChange={e => onChange('renovation', e.target.value)} min={0} max={200000} step={500}
                    checkboxOption={{ label: 'Finance into loan', checked: data.renoFinanced, onChange: e => onCheckboxChange('renoFinanced', e.target.checked) }}
                 />

                <SectionHeader>Operating Expenses & Revenue</SectionHeader>
                <InputField label="Monthly Rent ($)" id="ltr_rent" value={data.rent} onChange={e => onChange('rent', e.target.value)} min={0} max={10000} step={25} />
                <InputField label="Taxes (annual $ / rate)" id="ltr_tax_yr" value={data.taxYr} onChange={e => onChange('taxYr', e.target.value)} min={0} max={20000} step={50} 
                    secondaryInput={{ id: 'ltr_tax_rate', value: data.taxRate, onChange: e => onChange('taxRate', e.target.value), min: 0, max: 5, step: 0.01 }}
                    infoText="When you change either side, the other updates based on price."
                    isPaired={true}
                />
                <InputField label="Insurance ($/mo)" id="ltr_ins_mo" value={data.insMo} onChange={e => onChange('insMo', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.insMo * 12)}/yr`} />
                <InputField label="HOA ($/mo)" id="ltr_hoa" value={data.hoa} onChange={e => onChange('hoa', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.hoa * 12)}/yr`} />
                <InputField label="Utilities ($/mo)" id="ltr_utilities" value={data.utilities} onChange={e => onChange('utilities', e.target.value)} min={0} max={1000} step={10} infoText={`= ${money(data.utilities * 12)}/yr`} />
                <InputField label="PM (% of rent)" id="ltr_pm_pct" value={data.pmPct} onChange={e => onChange('pmPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.pmMonthly)}/mo • ${money(metrics.pmMonthly * 12)}/yr`} />
                <InputField label="Maintenance (% of rent)" id="ltr_maint_pct" value={data.maintPct} onChange={e => onChange('maintPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.maintMonthly)}/mo • ${money(metrics.maintMonthly * 12)}/yr`} />
                <InputField label="CapEx (% of rent)" id="ltr_capex_pct" value={data.capexPct} onChange={e => onChange('capexPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.capexMonthly)}/mo • ${money(metrics.capexMonthly * 12)}/yr`} />
            </div>
            <hr className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard label="Loan Amount" value={metrics.loan} />
                <KpiCard label="Cash to Close" value={metrics.cashIn} />
                <KpiCard label="PITI / mo" value={metrics.piti} />
                <KpiCard label="Opex / mo" value={metrics.opex} />
                <KpiCard label="Cash Flow / mo" value={metrics.cf} isPositive={metrics.cf > 0} isNegative={metrics.cf < 0} />
                <KpiCard label="Cash-on-Cash" value={`${isFinite(metrics.coc) ? metrics.coc.toFixed(1) + '%' : '—'}`} />
            </div>
            <p className="text-xs text-slate-500 mt-2">Cash to Close = down + CC (+ reno if not financed). CoC uses Cash to Close.</p>
        </div>
    );
};

export default LtrCalculator;