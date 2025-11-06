

import React, { useMemo, useState } from 'react';
import InputField from './InputField';
import KpiCard from './KpiCard';
import { pmt, loanAmt, money } from '../utils/calculators';
import type { MultiUnitData, MultiUnitItem, CalculatorType } from '../App';

interface MultiUnitCalculatorProps {
    data: MultiUnitData;
    units: MultiUnitItem[];
    onChange: (field: keyof MultiUnitData, value: string) => void;
    onCheckboxChange: (field: keyof MultiUnitData, checked: boolean) => void;
    addUnit: () => void;
    removeUnit: (id: string) => void;
    updateUnitRent: (id: string, rent: string) => void;
    onPushData: (source: CalculatorType, destination: CalculatorType) => void;
    onExportPdf: (elementId: string, filename: string, actionsClass: string) => void;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-bold text-md mt-6 mb-2 border-b pb-1 col-span-1 md:col-span-2">{children}</h3>
);

const calculatorNames: Record<CalculatorType, string> = {
    ltr: 'LTR', room: 'By-the-Room', str: 'STR', multi: 'Multi-Unit', build: 'New Build', dscr: 'DSCR Loan',
};

const MultiUnitCalculator: React.FC<MultiUnitCalculatorProps> = ({ data, units, onChange, onCheckboxChange, addUnit, removeUnit, updateUnitRent, onPushData, onExportPdf }) => {
    const [isPushMenuOpen, setIsPushMenuOpen] = useState(false);
    const metrics = useMemo(() => {
        const totalRent = units.reduce((acc, unit) => acc + unit.rent, 0);

        const purchaseLoan = loanAmt(data.purchase, data.downPct);
        const loan = data.renoFinanced ? purchaseLoan + data.renovation : purchaseLoan;
        const pi = pmt(loan, data.rate, data.term);
        const piti = pi + data.taxYr / 12 + data.insMo;
        const cashIn = data.renoFinanced ? data.downAmt + data.cc : data.downAmt + data.cc + data.renovation;
        const ccPct = data.purchase > 0 ? (data.cc / data.purchase * 100).toFixed(2) + '%' : '—';
        
        const opex = data.hoa + data.utilities + totalRent * (data.pmPct + data.maintPct + data.capexPct) / 100;
        const cf = totalRent - piti - opex;
        const coc = cashIn > 0 ? (cf * 12) / cashIn * 100 : 0;
        
        const pmMonthly = totalRent * (data.pmPct / 100);
        const maintMonthly = totalRent * (data.maintPct / 100);
        const capexMonthly = totalRent * (data.capexPct / 100);

        return { 
            loan, pi, piti, cashIn, ccPct, pmMonthly, maintMonthly, capexMonthly, purchaseLoan,
            opex, cf, coc, totalRent
        };
    }, [data, units]);

    const CALCULATOR_ID = "multi-calculator";
    const ACTIONS_CLASS = "multi-actions";
    const availableDestinations = (Object.keys(calculatorNames) as CalculatorType[]).filter(key => key !== 'multi');

    const handlePushClick = (destination: CalculatorType) => {
        onPushData('multi', destination);
        setIsPushMenuOpen(false);
    };
    
    return (
        <div id={CALCULATOR_ID} className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="font-extrabold tracking-wide text-lg mb-3">Multi-Unit Property Analysis</h2>

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
                <button onClick={() => onExportPdf(CALCULATOR_ID, 'MultiUnit_Analysis', ACTIONS_CLASS)} className="py-2 px-4 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-sm">
                    Export PDF
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionHeader>The Purchase</SectionHeader>
                <InputField label="Purchase" id="mu_purchase" value={data.purchase} onChange={e => onChange('purchase', e.target.value)} min={50000} max={5000000} step={10000} />
                <InputField label="Down Payment (%)" id="mu_down_pct" value={data.downPct} onChange={e => onChange('downPct', e.target.value)} min={0} max={100} step={0.25}
                    secondaryInput={{ label: 'or Down $', id: 'mu_down_amt', value: data.downAmt, onChange: e => onChange('downAmt', e.target.value) }} />
                <InputField label="Closing Costs ($)" id="mu_cc" value={data.cc} onChange={e => onChange('cc', e.target.value)} min={0} max={100000} step={500} infoText={`CC = ${metrics.ccPct} of price`} />
                <div className="col-span-1 md:col-span-2 text-xs text-slate-500 -mt-2">
                    {data.renoFinanced ? (
                        <span>Loan Amount = {money(metrics.purchaseLoan)} (purchase) + {money(data.renovation)} (reno) = <span className="font-semibold">{money(metrics.loan)}</span></span>
                    ) : (
                        <span>Loan Amount = <span className="font-semibold">{money(metrics.loan)}</span></span>
                    )}
                </div>

                <SectionHeader>The Loan</SectionHeader>
                <InputField label="Rate %" id="mu_rate" value={data.rate} onChange={e => onChange('rate', e.target.value)} min={0} max={15} step={0.05} />
                <InputField label="Term" id="mu_term" value={data.term} onChange={e => onChange('term', e.target.value)} min={1} max={40} step={1} />

                <SectionHeader>Renovation</SectionHeader>
                <InputField label="Renovation ($)" id="mu_renovation" value={data.renovation} onChange={e => onChange('renovation', e.target.value)} min={0} max={500000} step={1000}
                    checkboxOption={{ label: 'Finance into loan', checked: data.renoFinanced, onChange: e => onCheckboxChange('renoFinanced', e.target.checked) }}
                />

                <SectionHeader>Operating Expenses (Property-Level)</SectionHeader>
                <InputField label="Taxes (annual $ / rate)" id="mu_tax_yr" value={data.taxYr} onChange={e => onChange('taxYr', e.target.value)} min={0} max={100000} step={100}
                    secondaryInput={{ id: 'mu_tax_rate', value: data.taxRate, onChange: e => onChange('taxRate', e.target.value), min: 0, max: 5, step: 0.01 }}
                    infoText="When you change either side, the other updates based on price."
                    isPaired={true} />
                <InputField label="Insurance ($/mo)" id="mu_ins_mo" value={data.insMo} onChange={e => onChange('insMo', e.target.value)} min={0} max={2000} step={10} infoText={`= ${money(data.insMo * 12)}/yr`} />
                <InputField label="HOA ($/mo)" id="mu_hoa" value={data.hoa} onChange={e => onChange('hoa', e.target.value)} min={0} max={2000} step={10} infoText={`= ${money(data.hoa * 12)}/yr`} />
                <InputField label="Utilities ($/mo)" id="mu_utilities" value={data.utilities} onChange={e => onChange('utilities', e.target.value)} min={0} max={2000} step={25} infoText={`= ${money(data.utilities * 12)}/yr`} />
                <InputField label="PM (% of total rent)" id="mu_pm_pct" value={data.pmPct} onChange={e => onChange('pmPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.pmMonthly)}/mo • ${money(metrics.pmMonthly * 12)}/yr`} />
                <InputField label="Maintenance (% of total rent)" id="mu_maint_pct" value={data.maintPct} onChange={e => onChange('maintPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.maintMonthly)}/mo • ${money(metrics.maintMonthly * 12)}/yr`} />
                <InputField label="CapEx (% of total rent)" id="mu_capex_pct" value={data.capexPct} onChange={e => onChange('capexPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.capexMonthly)}/mo • ${money(metrics.capexMonthly * 12)}/yr`} />
            </div>

            <div className="mt-6">
                 <div className="flex items-center justify-between mb-2 pb-1 border-b">
                    <h3 className="font-bold text-md">Revenue (Per Unit)</h3>
                    <div className="flex gap-2">
                        <button onClick={addUnit} className="py-2 px-3 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-xs">Add Unit</button>
                    </div>
                </div>
                <div className="mt-2 space-y-3">
                    {units.map((unit, index) => (
                        <div key={unit.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <InputField label={`Unit ${index + 1} Rent`} id={unit.id} value={unit.rent} onChange={e => updateUnitRent(unit.id, e.target.value)} min={0} max={5000} step={25} />
                            <div className="flex justify-end items-center h-full">
                                <button onClick={() => removeUnit(unit.id)} className="py-2 px-4 rounded-full font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200 text-sm">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-4 pt-2 border-t text-right">
                    <div className="text-sm">
                        <span className="font-bold">Total Monthly Rent:</span>
                        <span className="ml-2">{money(metrics.totalRent)}/mo</span>
                    </div>
                </div>
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
            <p className="text-xs text-slate-500 mt-2">Cash to Close = down + CC (+ reno if not financed). CoC uses Cash to Close. PM/Maint/CapEx are % of total rent.</p>
        </div>
    );
};

export default MultiUnitCalculator;