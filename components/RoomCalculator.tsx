import React, { useMemo } from 'react';
import InputField from './InputField';
import KpiCard from './KpiCard';
import { pmt, loanAmt, money } from '../utils/calculators';
import type { RoomData, RentalUnit } from '../App';

interface RoomCalculatorProps {
    data: RoomData;
    onChange: (field: keyof RoomData, value: string) => void;
    onCheckboxChange: (field: keyof RoomData, checked: boolean) => void;
    rentalUnits: RentalUnit[];
    addRentalUnit: (type: 'Room' | 'ADU' | 'Unit', rent?: number) => void;
    removeRentalUnit: (id: string) => void;
    updateRentalUnitRent: (id: string, rent: string) => void;
    setOwnerOccupiedUnit: (id: string) => void;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-bold text-md mt-6 mb-2 border-b pb-1 col-span-1 md:col-span-2">{children}</h3>
);

const RoomCalculator: React.FC<RoomCalculatorProps> = ({ data, onChange, onCheckboxChange, rentalUnits, addRentalUnit, removeRentalUnit, updateRentalUnitRent, setOwnerOccupiedUnit }) => {
    
    const metrics = useMemo(() => {
        const ownerOccupiedUnit = rentalUnits.find(u => u.ownerOccupied);

        const totalRentMovedOut = rentalUnits.reduce((acc, unit) => acc + unit.rent, 0);
        const totalRentLivingIn = ownerOccupiedUnit ? totalRentMovedOut - ownerOccupiedUnit.rent : totalRentMovedOut;

        const purchaseLoan = loanAmt(data.purchase, data.downPct);
        const loan = data.renoFinanced ? purchaseLoan + data.renovation : purchaseLoan;
        const pi = pmt(loan, data.rate, data.term);
        const piti = pi + data.taxYr / 12 + data.insMo;
        const cashIn = data.renoFinanced ? data.downAmt + data.cc : data.downAmt + data.cc + data.renovation;
        const ccPct = data.purchase > 0 ? (data.cc / data.purchase * 100).toFixed(2) + '%' : '—';
        
        // Moved Out scenario
        const opexMovedOut = data.hoa + data.utilities + totalRentMovedOut * (data.pmPct + data.maintPct + data.capexPct) / 100;
        const cfMovedOut = totalRentMovedOut - piti - opexMovedOut;
        const cocMovedOut = cashIn > 0 ? (cfMovedOut * 12) / cashIn * 100 : 0;
        
        // Living In scenario (only if owner occupied)
        const opexLivingIn = data.hoa + data.utilities + totalRentLivingIn * (data.pmPct + data.maintPct + data.capexPct) / 100;
        const cfLivingIn = totalRentLivingIn - piti - opexLivingIn;
        const cocLivingIn = cashIn > 0 ? (cfLivingIn * 12) / cashIn * 100 : 0;

        const pmMonthly = totalRentMovedOut * (data.pmPct / 100);
        const maintMonthly = totalRentMovedOut * (data.maintPct / 100);
        const capexMonthly = totalRentMovedOut * (data.capexPct / 100);

        return { 
            loan, pi, piti, cashIn, ccPct, pmMonthly, maintMonthly, capexMonthly, purchaseLoan,
            opex: opexMovedOut,
            cf: cfMovedOut,
            coc: cocMovedOut,
            totalRentLivingIn, totalRentMovedOut,
            opexLivingIn, cfLivingIn, cocLivingIn
        };
    }, [data, rentalUnits]);
    
    const ownerOccupiedUnit = rentalUnits.find(r => r.ownerOccupied);
    
    // This object is reset on each render to correctly number the units in the UI
    let currentCounts: Record<'Room' | 'ADU' | 'Unit', number> = { Room: 0, ADU: 0, Unit: 0 };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="font-extrabold tracking-wide text-lg mb-3">By-the-Room (House Hack)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionHeader>The Purchase</SectionHeader>
                <InputField label="Purchase" id="rm_purchase" value={data.purchase} onChange={e => onChange('purchase', e.target.value)} min={50000} max={1500000} step={1000} />
                <InputField label="Down Payment (%)" id="rm_down_pct" value={data.downPct} onChange={e => onChange('downPct', e.target.value)} min={0} max={100} step={0.25}
                    secondaryInput={{ label: 'or Down $', id: 'rm_down_amt', value: data.downAmt, onChange: e => onChange('downAmt', e.target.value) }} />
                <InputField label="Closing Costs ($)" id="rm_cc" value={data.cc} onChange={e => onChange('cc', e.target.value)} min={0} max={50000} step={100} infoText={`CC = ${metrics.ccPct} of price`} />
                <div className="col-span-1 md:col-span-2 text-xs text-slate-500 -mt-2">
                    {data.renoFinanced ? (
                        <span>Loan Amount = {money(metrics.purchaseLoan)} (purchase) + {money(data.renovation)} (reno) = <span className="font-semibold">{money(metrics.loan)}</span></span>
                    ) : (
                        <span>Loan Amount = <span className="font-semibold">{money(metrics.loan)}</span></span>
                    )}
                </div>

                <SectionHeader>The Loan</SectionHeader>
                <InputField label="Rate %" id="rm_rate" value={data.rate} onChange={e => onChange('rate', e.target.value)} min={0} max={15} step={0.05} />
                <InputField label="Term" id="rm_term" value={data.term} onChange={e => onChange('term', e.target.value)} min={1} max={40} step={1} />

                <SectionHeader>Renovation</SectionHeader>
                <InputField label="Renovation ($)" id="rm_renovation" value={data.renovation} onChange={e => onChange('renovation', e.target.value)} min={0} max={200000} step={500}
                    checkboxOption={{ label: 'Finance into loan', checked: data.renoFinanced, onChange: e => onCheckboxChange('renoFinanced', e.target.checked) }}
                />

                <SectionHeader>Operating Expenses</SectionHeader>
                <InputField label="Taxes (annual $ / rate)" id="rm_tax_yr" value={data.taxYr} onChange={e => onChange('taxYr', e.target.value)} min={0} max={20000} step={50}
                    secondaryInput={{ id: 'rm_tax_rate', value: data.taxRate, onChange: e => onChange('taxRate', e.target.value), min: 0, max: 5, step: 0.01 }}
                    infoText="When you change either side, the other updates based on price."
                    isPaired={true} />
                <InputField label="Insurance ($/mo)" id="rm_ins_mo" value={data.insMo} onChange={e => onChange('insMo', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.insMo * 12)}/yr`} />
                <InputField label="HOA ($/mo)" id="rm_hoa" value={data.hoa} onChange={e => onChange('hoa', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.hoa * 12)}/yr`} />
                <InputField label="Utilities ($/mo)" id="rm_utilities" value={data.utilities} onChange={e => onChange('utilities', e.target.value)} min={0} max={1000} step={10} infoText={`= ${money(data.utilities * 12)}/yr`} />
                <InputField label="PM (% of rent)" id="rm_pm_pct" value={data.pmPct} onChange={e => onChange('pmPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.pmMonthly)}/mo • ${money(metrics.pmMonthly * 12)}/yr`} />
                <InputField label="Maintenance (% of rent)" id="rm_maint_pct" value={data.maintPct} onChange={e => onChange('maintPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.maintMonthly)}/mo • ${money(metrics.maintMonthly * 12)}/yr`} />
                <InputField label="CapEx (% of rent)" id="rm_capex_pct" value={data.capexPct} onChange={e => onChange('capexPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(metrics.capexMonthly)}/mo • ${money(metrics.capexMonthly * 12)}/yr`} />
            </div>

            <div className="mt-6">
                 <div className="flex items-center justify-between mb-2 pb-1 border-b">
                    <h3 className="font-bold text-md">Revenue</h3>
                    <div className="flex gap-2">
                        <button onClick={() => addRentalUnit('Room')} className="py-2 px-3 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-xs">Add Room</button>
                        <button onClick={() => addRentalUnit('ADU')} className="py-2 px-3 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-xs">Add ADU</button>
                        <button onClick={() => addRentalUnit('Unit')} className="py-2 px-3 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-xs">Add Unit</button>
                    </div>
                </div>
                <div className="mt-2 space-y-3">
                    {rentalUnits.map((unit) => {
                        currentCounts[unit.type]++;
                        const unitLabel = `${unit.type} ${currentCounts[unit.type]} Rent`;
                        return (
                            <div key={unit.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start sm:items-center">
                                <InputField label={unitLabel} id={unit.id} value={unit.rent} onChange={e => updateRentalUnitRent(unit.id, e.target.value)} min={0} max={3000} step={25} />
                                <div className="flex justify-end items-center gap-4 h-full">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <input type="checkbox" checked={unit.ownerOccupied} onChange={() => setOwnerOccupiedUnit(unit.id)} className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer" />
                                        Owner Occupied
                                    </label>
                                    <button onClick={() => removeRentalUnit(unit.id)} className="py-2 px-4 rounded-full font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200 text-sm">Remove</button>
                                </div>
                            </div>
                        )}
                    )}
                </div>
                 <div className="mt-4 pt-2 border-t text-right">
                    {ownerOccupiedUnit ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-bold">Rent (Living In):</span>
                                <span className="ml-2">{money(metrics.totalRentLivingIn)}/mo</span>
                            </div>
                            <div>
                                <span className="font-bold">Rent (Moved Out):</span>
                                <span className="ml-2">{money(metrics.totalRentMovedOut)}/mo</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm">
                            <span className="font-bold">Total Monthly Rent:</span>
                            <span className="ml-2">{money(metrics.totalRentMovedOut)}/mo</span>
                        </div>
                    )}
                </div>
            </div>

            <hr className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard label="Loan Amount" value={metrics.loan} />
                <KpiCard label="Cash to Close" value={metrics.cashIn} />
                <KpiCard label="PITI / mo" value={metrics.piti} />
                <KpiCard label="Opex / mo" value={ownerOccupiedUnit ? money(metrics.opexLivingIn) : metrics.opex} />
                
                {ownerOccupiedUnit ? (
                    <>
                        <KpiCard label="Cash Flow / mo">
                            <div className="flex justify-around items-center text-base">
                                <div className="text-center w-1/2">
                                    <span className={metrics.cfLivingIn >= 0 ? 'text-green-600' : 'text-red-600'}>{money(metrics.cfLivingIn)}</span>
                                    <span className="block text-xs font-normal text-slate-500">Living In</span>
                                </div>
                                <div className="border-l border-slate-300 h-6"></div>
                                <div className="text-center w-1/2">
                                    <span className={metrics.cf >= 0 ? 'text-green-600' : 'text-red-600'}>{money(metrics.cf)}</span>
                                    <span className="block text-xs font-normal text-slate-500">Moved Out</span>
                                </div>
                            </div>
                        </KpiCard>
                        <KpiCard label="Cash-on-Cash">
                           <div className="flex justify-around items-center text-base">
                                <div className="text-center w-1/2">
                                    <span className={metrics.cocLivingIn >= 0 ? 'text-green-600' : 'text-red-600'}>{isFinite(metrics.cocLivingIn) ? metrics.cocLivingIn.toFixed(1) + '%' : '—'}</span>
                                    <span className="block text-xs font-normal text-slate-500">Living In</span>
                                </div>
                                <div className="border-l border-slate-300 h-6"></div>
                                <div className="text-center w-1/2">
                                    <span className={metrics.coc >= 0 ? 'text-green-600' : 'text-red-600'}>{isFinite(metrics.coc) ? metrics.coc.toFixed(1) + '%' : '—'}</span>
                                    <span className="block text-xs font-normal text-slate-500">Moved Out</span>
                                </div>
                            </div>
                        </KpiCard>
                    </>
                ) : (
                    <>
                        <KpiCard label="Cash Flow / mo" value={metrics.cf} isPositive={metrics.cf > 0} isNegative={metrics.cf < 0} />
                        <KpiCard label="Cash-on-Cash" value={`${isFinite(metrics.coc) ? metrics.coc.toFixed(1) + '%' : '—'}`} />
                    </>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Cash to Close = down + CC (+ reno if not financed). CoC uses Cash to Close. PM/Maint/CapEx are % of total rent.</p>
        </div>
    );
};

export default RoomCalculator;