import React, { useState, useMemo, useEffect } from 'react';
import InputField from './InputField';
import KpiCard from './KpiCard';
import { pmt, loanAmt, money } from '../utils/calculators';
import type { DscrData } from '../App';

interface DscrCalculatorProps {
    data: DscrData;
    onChange: (field: keyof DscrData, value: string | number) => void;
    onCheckboxChange: (field: keyof DscrData, checked: boolean) => void;
    onRadioChange: (field: keyof DscrData, value: 'LTR' | 'STR') => void;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-bold text-md mt-6 mb-2 border-b pb-1 col-span-1 md:col-span-2">{children}</h3>
);

const ReadOnlyField: React.FC<{ label: string; value: string | number, infoText?: string }> = ({ label, value, infoText }) => (
    <div>
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="border border-slate-200 bg-slate-50 rounded-xl py-2 px-3 w-full text-slate-700">
            {value}
        </div>
        {infoText && <div className="text-xs text-slate-500 mt-1">{infoText}</div>}
    </div>
);

const DscrCalculator: React.FC<DscrCalculatorProps> = ({ data, onChange, onCheckboxChange, onRadioChange }) => {
    const [activeSubTab, setActiveSubTab] = useState<'lender' | 'investor'>('lender');

    // Effect to set default stress values when property type changes
    useEffect(() => {
        if (data.propertyType === 'LTR') {
            onChange('stress_vacancy', 5);
            onChange('min_dscr', 1.0);
        } else { // STR
            onChange('stress_vacancy', 15);
            onChange('min_dscr', 1.25);
        }
        // Also update stress rate based on current rate
        onChange('stress_rate', parseFloat((data.rate + 2).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.propertyType]);

    // Effect to update stress rate when base rate changes
    useEffect(() => {
        onChange('stress_rate', parseFloat((data.rate + 2).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.rate]);

    const lenderMetrics = useMemo(() => {
        const loan = loanAmt(data.purchase, data.downPct);

        const grossMonthlyIncome = data.propertyType === 'LTR' 
            ? data.ltr_rent 
            : data.str_adr * (30.44 * (data.str_occ / 100));
        
        const effectiveGrossIncome = grossMonthlyIncome * 12 * (1 - (data.stress_vacancy / 100));

        const lenderOpex = (data.taxYr + (data.insMo * 12) + (data.hoa * 12));
        const noi = effectiveGrossIncome - lenderOpex;
        
        const primaryDebtService = pmt(loan, data.stress_rate, data.term) * 12;
        
        const hm_payment = data.renoFinancedHM ? pmt(data.renovation, data.hm_rate, data.hm_term) : 0;
        const hm_debtService = hm_payment * 12;

        const totalDebtService = primaryDebtService + hm_debtService;
        
        const dscr = totalDebtService > 0 ? noi / totalDebtService : Infinity;

        const cashFlow_annual = noi - totalDebtService;
        const cashFlowAfterHM_annual = noi - primaryDebtService;

        return { loan, noi, totalDebtService, dscr, grossMonthlyIncome, hm_payment, hm_debtService, primaryDebtService, cashFlow_annual, cashFlowAfterHM_annual };
    }, [data]);

    const investorMetrics = useMemo(() => {
        const loan = loanAmt(data.purchase, data.downPct);
        
        const grossMonthlyIncome = lenderMetrics.grossMonthlyIncome;
        const hm_payment = lenderMetrics.hm_payment;
        
        const pi = pmt(loan, data.rate, data.term);
        const piti = pi + data.taxYr / 12 + data.insMo;

        let opex;
        if (data.propertyType === 'LTR') {
            const invPercentOpex = grossMonthlyIncome * ((data.inv_pmPct + data.inv_maintPct + data.inv_capexPct) / 100);
            const invFixedOpex = data.hoa + data.inv_utilities;
            opex = invPercentOpex + invFixedOpex;
        } else { // STR
            const invPercentOpex = grossMonthlyIncome * ((data.inv_pmPct + data.inv_platformPct + data.inv_maintPct + data.inv_capexPct) / 100);
            const invFixedOpex = (data.inv_clean * data.inv_stays) + data.hoa + data.inv_utilities + data.inv_suppliesMo;
            opex = invPercentOpex + invFixedOpex;
        }
        
        const cf_withHM = grossMonthlyIncome - piti - opex - hm_payment;
        const cf_afterHM = grossMonthlyIncome - piti - opex;

        const cashIn = data.renoFinancedHM ? data.downAmt + data.cc : data.downAmt + data.cc + data.renovation;

        const coc_withHM = cashIn > 0 ? (cf_withHM * 12) / cashIn * 100 : 0;
        const coc_afterHM = cashIn > 0 ? (cf_afterHM * 12) / cashIn * 100 : 0;
        
        const pmMonthly = grossMonthlyIncome * (data.inv_pmPct / 100);
        const maintMonthly = grossMonthlyIncome * (data.inv_maintPct / 100);
        const capexMonthly = grossMonthlyIncome * (data.inv_capexPct / 100);
        
        return { loan, piti, opex, cf: cf_withHM, cashIn, coc: coc_withHM, cf_afterHM, coc_afterHM, pmMonthly, maintMonthly, capexMonthly };
    }, [data, lenderMetrics]);
    
    const dscrPass = lenderMetrics.dscr >= data.min_dscr;

    return (
        <div className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="font-extrabold tracking-wide text-lg mb-3">DSCR Analysis</h2>

            <div className="flex gap-2 border-b mb-4">
                <button onClick={() => setActiveSubTab('lender')} className={`py-2 px-4 font-bold ${activeSubTab === 'lender' ? 'border-b-2 border-slate-800' : 'text-slate-500'}`}>Lender Facing</button>
                <button onClick={() => setActiveSubTab('investor')} className={`py-2 px-4 font-bold ${activeSubTab === 'investor' ? 'border-b-2 border-slate-800' : 'text-slate-500'}`}>Investor Facing</button>
            </div>

            {/* Lender Facing Tab */}
            <div className={activeSubTab === 'lender' ? '' : 'hidden'}>
                <div className="flex justify-center gap-4 mb-4 p-2 rounded-lg bg-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="propertyType" value="LTR" checked={data.propertyType === 'LTR'} onChange={() => onRadioChange('propertyType', 'LTR')} className="form-radio h-4 w-4 text-slate-600" />
                        <span className="font-semibold">Long-Term Rental (LTR)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="propertyType" value="STR" checked={data.propertyType === 'STR'} onChange={() => onRadioChange('propertyType', 'STR')} className="form-radio h-4 w-4 text-slate-600" />
                        <span className="font-semibold">Short-Term Rental (STR)</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SectionHeader>Property & Loan</SectionHeader>
                    <InputField label="Purchase Price" id="dscr_purchase" value={data.purchase} onChange={e => onChange('purchase', e.target.value)} min={50000} max={2000000} step={1000} />
                    <InputField label="Down Payment (%)" id="dscr_down_pct" value={data.downPct} onChange={e => onChange('downPct', e.target.value)} min={0} max={100} step={0.25} 
                        secondaryInput={{ label: 'or Down $', id: 'dscr_down_amt', value: data.downAmt, onChange: e => onChange('downAmt', e.target.value) }}/>
                    <InputField label="Interest Rate (%)" id="dscr_rate" value={data.rate} onChange={e => onChange('rate', e.target.value)} min={0} max={15} step={0.05} />
                    <InputField label="Term (years)" id="dscr_term" value={data.term} onChange={e => onChange('term', e.target.value)} min={1} max={40} step={1} />
                    <div className="col-span-1 md:col-span-2 text-xs text-slate-500 -mt-2">
                        <span>Loan Amount = <span className="font-semibold">{money(lenderMetrics.loan)}</span></span>
                    </div>

                    <SectionHeader>Renovation</SectionHeader>
                     <InputField label="Renovation ($)" id="dscr_renovation" value={data.renovation} onChange={e => onChange('renovation', e.target.value)} min={0} max={200000} step={500}
                        checkboxOption={{ label: 'Finance with Hard Money', checked: data.renoFinancedHM, onChange: e => onCheckboxChange('renoFinancedHM', e.target.checked) }}
                    />
                    {data.renoFinancedHM && (
                        <>
                            <InputField label="Hard Money Rate (%)" id="dscr_hm_rate" value={data.hm_rate} onChange={e => onChange('hm_rate', e.target.value)} min={5} max={20} step={0.25} />
                            <InputField label="Hard Money Term (years)" id="dscr_hm_term" value={data.hm_term} onChange={e => onChange('hm_term', e.target.value)} min={1} max={5} step={1}
                                infoText={`Monthly Payment: ${money(lenderMetrics.hm_payment)} • Annual Debt: ${money(lenderMetrics.hm_debtService)}`}
                            />
                        </>
                    )}

                    <SectionHeader>Revenue</SectionHeader>
                    {data.propertyType === 'LTR' ? (
                         <InputField label="Gross Monthly Rent ($)" id="dscr_ltr_rent" value={data.ltr_rent} onChange={e => onChange('ltr_rent', e.target.value)} min={0} max={10000} step={50} />
                    ) : (
                        <>
                             <InputField label="ADR ($)" id="dscr_str_adr" value={data.str_adr} onChange={e => onChange('str_adr', e.target.value)} min={0} max={1000} step={1} />
                             <InputField label="Occupancy (%)" id="dscr_str_occ" value={data.str_occ} onChange={e => onChange('str_occ', e.target.value)} min={0} max={100} step={1} />
                        </>
                    )}
                     <div className="col-span-1 md:col-span-2 text-sm text-slate-600 text-right -mt-2">
                        <span className="font-bold">Gross Potential Revenue:</span> {money(lenderMetrics.grossMonthlyIncome)}/mo • {money(lenderMetrics.grossMonthlyIncome * 12)}/yr
                    </div>

                    <SectionHeader>Operating Expenses (for DSCR)</SectionHeader>
                    <InputField 
                        label="Taxes (annual $ / rate)" 
                        id="dscr_tax_yr" 
                        value={data.taxYr} 
                        onChange={e => onChange('taxYr', e.target.value)} 
                        min={0} 
                        max={50000} 
                        step={100} 
                        secondaryInput={{ 
                            id: 'dscr_tax_rate', 
                            value: data.taxRate, 
                            onChange: e => onChange('taxRate', e.target.value), 
                            min: 0, 
                            max: 5, 
                            step: 0.01 
                        }}
                        infoText="Rate is % of purchase price. Change one to update the other."
                        isPaired={true}
                    />
                    <InputField label="Insurance ($/mo)" id="dscr_ins_mo" value={data.insMo} onChange={e => onChange('insMo', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.insMo * 12)}/yr`} />
                    <InputField label="HOA ($/mo)" id="dscr_hoa" value={data.hoa} onChange={e => onChange('hoa', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.hoa * 12)}/yr`} />

                    <SectionHeader>Lender Stress Test</SectionHeader>
                    <InputField label="Rent Haircut (%)" id="dscr_stress_vacancy" value={data.stress_vacancy} onChange={e => onChange('stress_vacancy', e.target.value)} min={0} max={50} step={0.5} infoText="Standard haircut on gross rent." />
                    <InputField label="Stress Test Rate (%)" id="dscr_stress_rate" value={data.stress_rate} onChange={e => onChange('stress_rate', e.target.value)} min={0} max={15} step={0.05} infoText="Defaults to Note Rate + 2%" />
                    <InputField label="Minimum DSCR" id="dscr_min_dscr" value={data.min_dscr} onChange={e => onChange('min_dscr', e.target.value)} min={1} max={2} step={0.01} infoText="Lender's minimum required ratio." />
                </div>
                <hr className="my-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard label="Net Operating Income (NOI)" value={money(lenderMetrics.noi / 12) + '/mo'} />
                     <KpiCard label="Cash Flow">
                        {data.renoFinancedHM ? (
                             <div className="flex justify-around items-center text-base">
                                <div className="text-center w-1/2">
                                    <span className={lenderMetrics.cashFlow_annual >= 0 ? 'text-green-600' : 'text-red-600'}>{money(lenderMetrics.cashFlow_annual / 12)}</span>
                                    <span className="block text-xs font-normal text-slate-500">With HM</span>
                                </div>
                                <div className="border-l border-slate-300 h-6"></div>
                                <div className="text-center w-1/2">
                                    <span className={lenderMetrics.cashFlowAfterHM_annual >= 0 ? 'text-green-600' : 'text-red-600'}>{money(lenderMetrics.cashFlowAfterHM_annual / 12)}</span>
                                    <span className="block text-xs font-normal text-slate-500">After HM</span>
                                </div>
                            </div>
                        ) : (
                            <span className={lenderMetrics.cashFlow_annual >= 0 ? 'text-green-600' : 'text-red-600'}>{money(lenderMetrics.cashFlow_annual / 12) + '/mo'}</span>
                        )}
                    </KpiCard>
                    <KpiCard label="Annual Debt Service">
                        <div>{money(lenderMetrics.totalDebtService)}</div>
                        {data.renoFinancedHM && (
                            <div className="text-xs font-normal text-slate-500 -mt-1">
                                ({money(lenderMetrics.primaryDebtService)} M + {money(lenderMetrics.hm_debtService)} HM)
                            </div>
                        )}
                    </KpiCard>
                    <KpiCard label="DSCR" isPositive={dscrPass} isNegative={!dscrPass}>
                        <div className="flex items-center gap-2">
                           <span>{lenderMetrics.dscr.toFixed(2)}x</span>
                           <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${dscrPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {dscrPass ? 'PASS' : 'FAIL'}
                           </span>
                        </div>
                    </KpiCard>
                </div>
            </div>

            {/* Investor Facing Tab */}
            <div className={activeSubTab === 'investor' ? '' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SectionHeader>Property & Loan</SectionHeader>
                    <ReadOnlyField label="Purchase Price" value={money(data.purchase)} />
                    <ReadOnlyField label="Down Payment" value={`${money(data.downAmt)} (${data.downPct}%)`} />
                     <ReadOnlyField label="Loan Amount" value={money(investorMetrics.loan)} />
                    <ReadOnlyField label="Interest Rate" value={`${data.rate}%`} />
                    <ReadOnlyField label="Loan Term" value={`${data.term} years`} />
                    
                    <SectionHeader>Renovation</SectionHeader>
                    <ReadOnlyField label="Renovation Amount" value={money(data.renovation)} />
                    {data.renovation > 0 && (
                        <ReadOnlyField 
                            label="Financing" 
                            value={data.renoFinancedHM ? `Hard Money (${data.hm_rate}% / ${data.hm_term}yr)` : 'Paid with Cash'} 
                            infoText={data.renoFinancedHM ? `Monthly Payment: ${money(lenderMetrics.hm_payment)} • Annual Debt: ${money(lenderMetrics.hm_debtService)}` : undefined}
                        />
                    )}

                    <SectionHeader>Revenue</SectionHeader>
                    <ReadOnlyField label="Gross Monthly Revenue" value={money(lenderMetrics.grossMonthlyIncome)} />
                    <ReadOnlyField label="Gross Annual Revenue" value={money(lenderMetrics.grossMonthlyIncome * 12)} />

                    <SectionHeader>Full Operating Expenses</SectionHeader>
                    <ReadOnlyField label="Taxes (annual)" value={money(data.taxYr)} infoText={`= ${money(data.taxYr / 12)}/mo`} />
                    <ReadOnlyField label="Insurance ($/mo)" value={money(data.insMo)} infoText={`= ${money(data.insMo * 12)}/yr`} />
                    <ReadOnlyField label="HOA ($/mo)" value={money(data.hoa)} infoText={`= ${money(data.hoa * 12)}/yr`} />
                    <InputField label={data.propertyType === 'STR' ? 'PM / Cohost (% of rev)' : 'PM (% of rent)'} id="dscr_inv_pm" value={data.inv_pmPct} onChange={e => onChange('inv_pmPct', e.target.value)} min={0} max={20} step={0.5}
                        infoText={`${money(investorMetrics.pmMonthly)}/mo • ${money(investorMetrics.pmMonthly * 12)}/yr`}
                    />
                    <InputField label="Maintenance (% of rent)" id="dscr_inv_maint" value={data.inv_maintPct} onChange={e => onChange('inv_maintPct', e.target.value)} min={0} max={20} step={0.5} 
                        infoText={`${money(investorMetrics.maintMonthly)}/mo • ${money(investorMetrics.maintMonthly * 12)}/yr`}
                    />
                    <InputField label="CapEx (% of rent)" id="dscr_inv_capex" value={data.inv_capexPct} onChange={e => onChange('inv_capexPct', e.target.value)} min={0} max={20} step={0.5} 
                        infoText={`${money(investorMetrics.capexMonthly)}/mo • ${money(investorMetrics.capexMonthly * 12)}/yr`}
                    />
                    <InputField label="Utilities ($/mo)" id="dscr_inv_utilities" value={data.inv_utilities} onChange={e => onChange('inv_utilities', e.target.value)} min={0} max={1000} step={10} 
                        infoText={`= ${money(data.inv_utilities * 12)}/yr`}
                    />

                    {data.propertyType === 'STR' && (
                        <>
                            <InputField label="Platform (% of rev)" id="dscr_inv_platform" value={data.inv_platformPct} onChange={e => onChange('inv_platformPct', e.target.value)} min={0} max={20} step={0.5} />
                            <InputField label="Supplies/Furniture ($/mo)" id="dscr_inv_supplies" value={data.inv_suppliesMo} onChange={e => onChange('inv_suppliesMo', e.target.value)} min={0} max={1000} step={10} />
                            <InputField label="Cleaning ($ per stay)" id="dscr_inv_clean" value={data.inv_clean} onChange={e => onChange('inv_clean', e.target.value)} min={0} max={500} step={5} />
                            <InputField label="Avg Stays / mo" id="dscr_inv_stays" value={data.inv_stays} onChange={e => onChange('inv_stays', e.target.value)} min={0} max={20} step={1} />
                        </>
                    )}
                </div>
                <hr className="my-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <KpiCard label="Loan Amount" value={investorMetrics.loan} />
                    <KpiCard label="Cash to Close" value={investorMetrics.cashIn} />
                    <KpiCard label="PITI / mo" value={investorMetrics.piti} />
                    <KpiCard label="Opex / mo" value={investorMetrics.opex} />
                    
                    {data.renoFinancedHM ? (
                        <>
                            <KpiCard label="Cash Flow / mo">
                                <div className="flex justify-around items-center text-base">
                                    <div className="text-center w-1/2">
                                        <span className={investorMetrics.cf >= 0 ? 'text-green-600' : 'text-red-600'}>{money(investorMetrics.cf)}</span>
                                        <span className="block text-xs font-normal text-slate-500">With HM</span>
                                    </div>
                                    <div className="border-l border-slate-300 h-6"></div>
                                    <div className="text-center w-1/2">
                                        <span className={investorMetrics.cf_afterHM >= 0 ? 'text-green-600' : 'text-red-600'}>{money(investorMetrics.cf_afterHM)}</span>
                                        <span className="block text-xs font-normal text-slate-500">After HM</span>
                                    </div>
                                </div>
                            </KpiCard>
                            <KpiCard label="Cash-on-Cash">
                                <div className="flex justify-around items-center text-base">
                                    <div className="text-center w-1/2">
                                        <span className={investorMetrics.coc >= 0 ? 'text-green-600' : 'text-red-600'}>{isFinite(investorMetrics.coc) ? investorMetrics.coc.toFixed(1) + '%' : '—'}</span>
                                        <span className="block text-xs font-normal text-slate-500">With HM</span>
                                    </div>
                                    <div className="border-l border-slate-300 h-6"></div>
                                    <div className="text-center w-1/2">
                                        <span className={investorMetrics.coc_afterHM >= 0 ? 'text-green-600' : 'text-red-600'}>{isFinite(investorMetrics.coc_afterHM) ? investorMetrics.coc_afterHM.toFixed(1) + '%' : '—'}</span>
                                        <span className="block text-xs font-normal text-slate-500">After HM</span>
                                    </div>
                                </div>
                            </KpiCard>
                        </>
                    ) : (
                        <>
                            <KpiCard label="Cash Flow / mo" value={investorMetrics.cf} isPositive={investorMetrics.cf > 0} isNegative={investorMetrics.cf < 0} />
                            <KpiCard label="Cash-on-Cash" value={`${isFinite(investorMetrics.coc) ? investorMetrics.coc.toFixed(1) + '%' : '—'}`} />
                        </>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-2">Investor analysis using actual loan terms, not stress tests. Full Opex includes PM, maintenance, CapEx, etc. Cash flow includes Hard Money payments if applicable.</p>
            </div>
        </div>
    );
};

export default DscrCalculator;