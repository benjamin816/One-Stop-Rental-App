
import React, { useMemo } from 'react';
import InputField from './InputField';
import KpiCard from './KpiCard';
import { pmt, money } from '../utils/calculators';
import type { BuildData, BuildUnitData, PropertyType, LandAcquisition, UnitStrategy } from '../App';

interface BuildCalculatorProps {
    data: BuildData;
    units: BuildUnitData[];
    onDataChange: (field: keyof BuildData, value: string | number) => void;
    onPropTypeChange: (type: PropertyType) => void;
    onUnitChange: (id: string, field: keyof BuildUnitData, value: string | number) => void;
    onUnitCheckboxChange: (id: string, field: keyof BuildUnitData, checked: boolean) => void;
    onUnitStrategyChange: (id: string, strategy: UnitStrategy) => void;
    onApplyAllChange: (checked: boolean) => void;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-bold text-md mt-6 mb-2 border-b pb-1 col-span-1 md:col-span-2">{children}</h3>
);

const RadioButton: React.FC<{ name: string; value: string; checked: boolean; onChange: (val: any) => void; label: string }> = ({ name, value, checked, onChange, label }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} value={value} checked={checked} onChange={e => onChange(e.target.value)} className="form-radio h-4 w-4 text-slate-600" />
        <span className="font-semibold text-sm">{label}</span>
    </label>
);

const UnitCard: React.FC<{ unit: BuildUnitData; index: number; onChange: BuildCalculatorProps['onUnitChange']; onCheckboxChange: BuildCalculatorProps['onUnitCheckboxChange']; onStrategyChange: BuildCalculatorProps['onUnitStrategyChange']; isFirst: boolean; applyToAll: boolean; onApplyAllChange: (checked: boolean) => void; }> = ({ unit, index, onChange, onCheckboxChange, onStrategyChange, isFirst, applyToAll, onApplyAllChange }) => {
    
    const ltrRevenue = useMemo(() => unit.ltr_rent, [unit.ltr_rent]);
    const strRevenue = useMemo(() => unit.str_adr * (30.44 * (unit.str_occ / 100)), [unit.str_adr, unit.str_occ]);

    const pmMonthly = unit.strategy === 'LTR' ? ltrRevenue * (unit.ltr_pmPct / 100) : strRevenue * (unit.str_cohostPct / 100);
    const platformMonthly = strRevenue * (unit.str_platformPct / 100);
    const cleaningMonthly = unit.str_cleaningCoveredByGuest ? 0 : unit.str_clean * unit.str_stays;
    
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold">Unit {index + 1}</h4>
                {isFirst && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={applyToAll} onChange={e => onApplyAllChange(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer" />
                        Apply to all units
                    </label>
                )}
            </div>
            <div className="flex justify-center gap-4 mb-4 p-2 rounded-lg bg-slate-200">
                <RadioButton name={`strategy-${unit.id}`} value="LTR" checked={unit.strategy === 'LTR'} onChange={(val) => onStrategyChange(unit.id, val as UnitStrategy)} label="LTR" />
                <RadioButton name={`strategy-${unit.id}`} value="STR" checked={unit.strategy === 'STR'} onChange={(val) => onStrategyChange(unit.id, val as UnitStrategy)} label="STR" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {unit.strategy === 'LTR' ? (
                    <>
                        <InputField label="Monthly Rent ($)" id={`${unit.id}_ltr_rent`} value={unit.ltr_rent} onChange={e => onChange(unit.id, 'ltr_rent', e.target.value)} min={0} max={5000} step={25} infoText={`= ${money(ltrRevenue * 12)}/yr`} />
                         <InputField label="PM (% of rent)" id={`${unit.id}_ltr_pm`} value={unit.ltr_pmPct} onChange={e => onChange(unit.id, 'ltr_pmPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(pmMonthly)}/mo • ${money(pmMonthly * 12)}/yr`} />
                    </>
                ) : (
                    <>
                        <InputField label="ADR ($)" id={`${unit.id}_str_adr`} value={unit.str_adr} onChange={e => onChange(unit.id, 'str_adr', e.target.value)} min={0} max={1000} step={1} />
                        <InputField label="Occupancy (%)" id={`${unit.id}_str_occ`} value={unit.str_occ} onChange={e => onChange(unit.id, 'str_occ', e.target.value)} min={0} max={100} step={1} infoText={`${money(strRevenue)}/mo • ${money(strRevenue * 12)}/yr`} />
                        <InputField label="PM / Cohost (% of rev)" id={`${unit.id}_str_cohost`} value={unit.str_cohostPct} onChange={e => onChange(unit.id, 'str_cohostPct', e.target.value)} min={0} max={30} step={0.5} infoText={`${money(pmMonthly)}/mo • ${money(pmMonthly * 12)}/yr`} />
                        <InputField label="Platform (% of rev)" id={`${unit.id}_str_platform`} value={unit.str_platformPct} onChange={e => onChange(unit.id, 'str_platformPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(platformMonthly)}/mo • ${money(platformMonthly * 12)}/yr`} />
                        <InputField label="Supplies/Furniture ($/mo)" id={`${unit.id}_str_supplies`} value={unit.str_suppliesMo} onChange={e => onChange(unit.id, 'str_suppliesMo', e.target.value)} min={0} max={1000} step={10} infoText={`= ${money(unit.str_suppliesMo * 12)}/yr`} />
                        <InputField label="Cleaning ($ per stay)" id={`${unit.id}_str_clean`} value={unit.str_clean} onChange={e => onChange(unit.id, 'str_clean', e.target.value)} min={0} max={500} step={5} 
                            checkboxOption={{ label: 'Cleaning covered by guests', checked: unit.str_cleaningCoveredByGuest, onChange: e => onCheckboxChange(unit.id, 'str_cleaningCoveredByGuest', e.target.checked) }}
                            disabled={unit.str_cleaningCoveredByGuest}
                            infoText={`Total: ${money(cleaningMonthly)}/mo`}
                        />
                        <InputField label="Avg Stays / mo" id={`${unit.id}_str_stays`} value={unit.str_stays} onChange={e => onChange(unit.id, 'str_stays', e.target.value)} min={0} max={20} step={1} />
                    </>
                )}
            </div>
        </div>
    );
};


const BuildCalculator: React.FC<BuildCalculatorProps> = ({ data, units, onDataChange, onPropTypeChange, onUnitChange, onUnitCheckboxChange, onUnitStrategyChange, onApplyAllChange }) => {
    
    const metrics = useMemo(() => {
        let loanableCostBase = data.hardCosts + data.softCosts + data.buffer;
        if (data.landAcquisition === 'finance') {
            loanableCostBase += data.landCost;
        }

        const constructionLoanAmt = loanableCostBase * (data.construction_ltc / 100);
        const constructionPayment = (constructionLoanAmt * (data.construction_rate / 100)) / 12;

        const totalProjectCost = (data.landAcquisition !== 'owned' ? data.landCost : 0) + data.hardCosts + data.softCosts + data.buffer;
        const upfrontCashForConstruction = totalProjectCost - constructionLoanAmt;
        
        const permanentLoanAmt = data.arv * (data.refi_ltv / 100);
        const cashOutAtRefi = permanentLoanAmt - constructionLoanAmt;
        const netCashInvested = upfrontCashForConstruction - cashOutAtRefi;

        const pi = pmt(permanentLoanAmt, data.refi_rate, data.refi_term);
        const piti = pi + data.total_taxYr / 12 + data.total_insYr / 12;

        const { totalRevenue, totalUnitOpex } = units.reduce((acc, unit) => {
            let revenue = 0;
            let opex = 0;
            if (unit.strategy === 'LTR') {
                revenue = unit.ltr_rent;
                opex = revenue * (unit.ltr_pmPct / 100);
            } else { // STR
                revenue = unit.str_adr * (30.44 * (unit.str_occ / 100));
                const cleaningCost = unit.str_cleaningCoveredByGuest ? 0 : (unit.str_clean * unit.str_stays);
                const percentOpex = revenue * ((unit.str_cohostPct + unit.str_platformPct) / 100);
                const fixedOpex = unit.str_suppliesMo + cleaningCost;
                opex = percentOpex + fixedOpex;
            }
            acc.totalRevenue += revenue;
            acc.totalUnitOpex += opex;
            return acc;
        }, { totalRevenue: 0, totalUnitOpex: 0 });

        const propertyLevelOpex = (totalRevenue * (data.maintPct + data.capexPct) / 100) + data.total_hoa + data.total_utilities;
        const totalOpex = totalUnitOpex + propertyLevelOpex;

        const stabilizedCf = totalRevenue - piti - totalOpex;
        const coc = netCashInvested > 0 ? (stabilizedCf * 12) / netCashInvested * 100 : (stabilizedCf > 0 ? Infinity : -Infinity);
        const returnOnCost = totalProjectCost > 0 ? (stabilizedCf * 12) / totalProjectCost * 100 : 0;

        let ltcInfoText = '';
        if (data.landAcquisition === 'finance') {
            ltcInfoText = 'Loan Amount on Land + Hard/Soft Costs + Buffer';
        } else {
            ltcInfoText = 'Loan Amount on Hard/Soft Costs + Buffer';
        }
        ltcInfoText += ` = ${money(constructionLoanAmt)}`;

        return { totalProjectCost, constructionLoanAmt, constructionPayment, upfrontCashForConstruction, permanentLoanAmt, cashOutAtRefi, netCashInvested, pi, piti, totalRevenue, totalOpex, stabilizedCf, coc, returnOnCost, ltcInfoText };
    }, [data, units]);
    
    const maintMonthly = (metrics.totalRevenue * data.maintPct) / 100;
    const capexMonthly = (metrics.totalRevenue * data.capexPct) / 100;

    return (
        <div className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="font-extrabold tracking-wide text-lg mb-3">New Construction Analysis</h2>
            
            <SectionHeader>Project Setup</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <div className="text-xs text-slate-500 mb-2">Property Type</div>
                    <select value={data.propertyType} onChange={e => onPropTypeChange(e.target.value as PropertyType)} className="border border-slate-300 rounded-xl py-2 px-3 w-full">
                        <option value="SFH">Detached SFH</option>
                        <option value="Townhome">Townhome</option>
                        <option value="Condo">Condo</option>
                        <option value="Duplex">Duplex</option>
                        <option value="Triplex">Triplex</option>
                        <option value="Quadplex">Quadplex</option>
                    </select>
                </div>
                <div>
                    <div className="text-xs text-slate-500 mb-2">Land Acquisition</div>
                    <div className="flex justify-around items-center p-2 rounded-lg bg-slate-100 h-full">
                        <RadioButton name="land" value="cash" checked={data.landAcquisition === 'cash'} onChange={val => onDataChange('landAcquisition', val)} label="Buy with Cash" />
                        <RadioButton name="land" value="finance" checked={data.landAcquisition === 'finance'} onChange={val => onDataChange('landAcquisition', val)} label="Finance" />
                        <RadioButton name="land" value="owned" checked={data.landAcquisition === 'owned'} onChange={val => onDataChange('landAcquisition', val)} label="Already Own" />
                    </div>
                </div>
            </div>

            <SectionHeader>Costs & Construction Financing</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.landAcquisition !== 'owned' && <InputField label="Land Cost ($)" id="build_land" value={data.landCost} onChange={e => onDataChange('landCost', e.target.value)} min={0} max={500000} step={5000} />}
                <InputField label="Hard Costs ($)" id="build_hard" value={data.hardCosts} onChange={e => onDataChange('hardCosts', e.target.value)} min={0} max={2000000} step={10000} />
                <InputField label="Soft Costs ($)" id="build_soft" value={data.softCosts} onChange={e => onDataChange('softCosts', e.target.value)} min={0} max={500000} step={2500} infoText="Covers: permits, architectural plans, engineering, impact fees, etc." />
                <InputField label="Buffer / Contingency ($)" id="build_buffer" value={data.buffer} onChange={e => onDataChange('buffer', e.target.value)} min={0} max={250000} step={2500} />
                <InputField label="Construction Loan LTC (%)" id="build_ltc" value={data.construction_ltc} onChange={e => onDataChange('construction_ltc', e.target.value)} min={50} max={90} step={1} infoText={metrics.ltcInfoText} />
                <InputField label="Construction Rate (%)" id="build_loan_rate" value={data.construction_rate} onChange={e => onDataChange('construction_rate', e.target.value)} min={5} max={15} step={0.1} />
                <InputField label="Construction Term (months)" id="build_loan_term" value={data.construction_term} onChange={e => onDataChange('construction_term', e.target.value)} min={6} max={24} step={1} />
                 <div className="col-span-1 md:col-span-2 text-sm text-slate-600 text-right -mt-2">
                    <span className="font-bold">Est. Construction Financing Payment:</span> {money(metrics.constructionPayment)}/mo (Interest Only)
                </div>
            </div>

            <SectionHeader>Permanent Financing (Refinance)</SectionHeader>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <InputField label="After Repair Value (ARV)" id="build_arv" value={data.arv} onChange={e => onDataChange('arv', e.target.value)} min={0} max={3000000} step={10000} />
                 <InputField label="Refinance LTV (%)" id="build_ltv" value={data.refi_ltv} onChange={e => onDataChange('refi_ltv', e.target.value)} min={50} max={80} step={1} infoText={`Permanent Loan Amount = ${money(metrics.permanentLoanAmt)}`} />
                 <InputField label="Refinance Rate (%)" id="build_refi_rate" value={data.refi_rate} onChange={e => onDataChange('refi_rate', e.target.value)} min={4} max={12} step={0.05} />
                 <InputField label="Refinance Term (years)" id="build_refi_term" value={data.refi_term} onChange={e => onDataChange('refi_term', e.target.value)} min={15} max={30} step={1} />
                <div className="col-span-1 md:col-span-2 text-sm text-slate-600 text-right -mt-2">
                    <span className="font-bold">Permanent Financing P&I:</span> {money(metrics.pi)}/mo
                </div>
            </div>

            <SectionHeader>Units, Revenue & Opex</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <InputField label="Property Taxes (annual $ / rate)" id="build_tax_yr" value={data.total_taxYr} onChange={e => onDataChange('total_taxYr', e.target.value)} min={0} max={50000} step={100} 
                        secondaryInput={{ id: 'build_tax_rate', value: data.total_taxRate, onChange: e => onDataChange('total_taxRate', e.target.value), min: 0, max: 5, step: 0.01 }}
                        infoText={`Monthly: ${money(data.total_taxYr / 12)}. Rate is % of ARV.`}
                        isPaired={true}
                    />
                <InputField label="Property Insurance (annual $)" id="build_ins_yr" value={data.total_insYr} onChange={e => onDataChange('total_insYr', e.target.value)} min={0} max={10000} step={50} infoText={`= ${money(data.total_insYr / 12)}/mo`} />
                <InputField label="Maintenance (% of Total Revenue)" id="build_maint_pct" value={data.maintPct} onChange={e => onDataChange('maintPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(maintMonthly)}/mo • ${money(maintMonthly * 12)}/yr`} />
                <InputField label="CapEx (% of Total Revenue)" id="build_capex_pct" value={data.capexPct} onChange={e => onDataChange('capexPct', e.target.value)} min={0} max={20} step={0.5} infoText={`${money(capexMonthly)}/mo • ${money(capexMonthly * 12)}/yr`} />
                {/* FIX: Add missing InputFields for HOA and Utilities */}
                <InputField label="HOA ($/mo)" id="build_hoa_mo" value={data.total_hoa} onChange={e => onDataChange('total_hoa', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.total_hoa * 12)}/yr`} />
                <InputField label="Utilities ($/mo)" id="build_utilities_mo" value={data.total_utilities} onChange={e => onDataChange('total_utilities', e.target.value)} min={0} max={1000} step={10} infoText={`= ${money(data.total_utilities * 12)}/yr`} />
            </div>
            <div className="space-y-4">
                {units.map((unit, index) => (
                    <UnitCard key={unit.id} unit={unit} index={index} onChange={onUnitChange} onCheckboxChange={onUnitCheckboxChange} onStrategyChange={onUnitStrategyChange} isFirst={units.length > 1 && index === 0} applyToAll={data.applyToAll} onApplyAllChange={onApplyAllChange} />
                ))}
            </div>
            
            <hr className="my-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard label="Total Project Cost" value={metrics.totalProjectCost} />
                <KpiCard label="Upfront Cash for Construction" value={metrics.upfrontCashForConstruction} />
                <KpiCard label="Cash Out/(In) at Refi" value={metrics.cashOutAtRefi} isPositive={metrics.cashOutAtRefi > 0} isNegative={metrics.cashOutAtRefi < 0} />
                <KpiCard label="Net Cash Invested" value={metrics.netCashInvested} />
                <KpiCard label="Total Revenue / mo" value={metrics.totalRevenue} />
                <KpiCard label="Total Opex / mo" value={metrics.totalOpex} />
                <KpiCard label="PITI / mo" value={metrics.piti} />
                <KpiCard label="Stabilized CF / mo" value={metrics.stabilizedCf} isPositive={metrics.stabilizedCf > 0} isNegative={metrics.stabilizedCf < 0} />
                <KpiCard label="Cash-on-Cash Return" value={`${isFinite(metrics.coc) ? metrics.coc.toFixed(1) + '%' : '—'}`} />
            </div>
             <p className="text-xs text-slate-500 mt-2">All calculations are based on the stabilized property after refinancing into permanent debt. CoC is based on Net Cash Invested.</p>
        </div>
    );
};

export default BuildCalculator;
