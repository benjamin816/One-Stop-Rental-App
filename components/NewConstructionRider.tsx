import React from 'react';
import InputField from './InputField';
import { money, num } from '../utils/calculators';
import { getNewConstructionRiderImpact } from '../utils/newConstructionRider';
import type {
  NewConstructionRiderAssumptions,
  NewConstructionRiderState,
  RiderFinancingMode,
  RiderRevenueMode
} from '../utils/newConstructionRider';

interface NewConstructionRiderProps {
  idPrefix: string;
  rider: NewConstructionRiderState;
  assumptions: NewConstructionRiderAssumptions;
  onChange: (next: NewConstructionRiderState) => void;
}

const NewConstructionRider: React.FC<NewConstructionRiderProps> = ({ idPrefix, rider, assumptions, onChange }) => {
  const impact = getNewConstructionRiderImpact(rider, assumptions);

  const updateNumber = (
    field:
      | 'hardCosts'
      | 'softCosts'
      | 'contingency'
      | 'monthlyHoldingCosts'
      | 'holdingMonths'
      | 'ltrRent'
      | 'ltrPmPct'
      | 'strAdr'
      | 'strOcc'
      | 'strCohostPct'
      | 'strPlatformPct'
      | 'strSuppliesMo'
      | 'strClean'
      | 'strStays'
      | 'maintPct'
      | 'capexPct'
      | 'hoaMo'
      | 'utilitiesMo'
      | 'separateDownPct'
      | 'separateRate'
      | 'separateTerm'
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...rider, [field]: num(event.target.value) });
  };

  const updateToggle = (
    field: 'enabled' | 'showBeforeAfter' | 'showProjectOnly' | 'strCleaningCoveredByGuest'
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...rider, [field]: event.target.checked });
  };

  const updateSelect = (field: 'financingMode' | 'revenueMode') => (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (field === 'financingMode') {
      onChange({ ...rider, financingMode: event.target.value as RiderFinancingMode });
      return;
    }
    onChange({ ...rider, revenueMode: event.target.value as RiderRevenueMode });
  };

  if (!rider.enabled) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => onChange({ ...rider, enabled: true })}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          + Add New Construction Rider
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={rider.enabled}
          onChange={updateToggle('enabled')}
          className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
        />
        New Construction Rider Enabled
      </label>

      <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Hard Costs ($)" id={`${idPrefix}_nc_hard`} value={rider.hardCosts} onChange={updateNumber('hardCosts')} min={0} max={5000000} step={1000} />
            <InputField label="Soft Costs ($)" id={`${idPrefix}_nc_soft`} value={rider.softCosts} onChange={updateNumber('softCosts')} min={0} max={2000000} step={500} />
            <InputField label="Contingency / Buffer ($)" id={`${idPrefix}_nc_buffer`} value={rider.contingency} onChange={updateNumber('contingency')} min={0} max={1000000} step={500} />
            <InputField label="Holding Cost ($/mo)" id={`${idPrefix}_nc_hold_mo`} value={rider.monthlyHoldingCosts} onChange={updateNumber('monthlyHoldingCosts')} min={0} max={200000} step={100} />
            <InputField label="Holding Months" id={`${idPrefix}_nc_hold_mo_count`} value={rider.holdingMonths} onChange={updateNumber('holdingMonths')} min={0} max={48} step={1} />
            <div>
              <div className="text-xs text-slate-500 mb-2">Revenue Mode</div>
              <select value={rider.revenueMode} onChange={updateSelect('revenueMode')} className="border border-slate-300 rounded-xl py-2 px-3 w-full">
                <option value="LTR">LTR</option>
                <option value="STR">STR</option>
              </select>
            </div>
          </div>

          {rider.revenueMode === 'LTR' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="LTR Rent ($/mo)" id={`${idPrefix}_nc_ltr_rent`} value={rider.ltrRent} onChange={updateNumber('ltrRent')} min={0} max={50000} step={50} />
              <InputField label="PM (% of rent)" id={`${idPrefix}_nc_ltr_pm`} value={rider.ltrPmPct} onChange={updateNumber('ltrPmPct')} min={0} max={30} step={0.5} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="STR ADR ($)" id={`${idPrefix}_nc_str_adr`} value={rider.strAdr} onChange={updateNumber('strAdr')} min={0} max={2000} step={1} />
              <InputField label="STR Occupancy (%)" id={`${idPrefix}_nc_str_occ`} value={rider.strOcc} onChange={updateNumber('strOcc')} min={0} max={100} step={1} />
              <InputField label="Cohost (% of rev)" id={`${idPrefix}_nc_str_cohost`} value={rider.strCohostPct} onChange={updateNumber('strCohostPct')} min={0} max={40} step={0.5} />
              <InputField label="Platform (% of rev)" id={`${idPrefix}_nc_str_platform`} value={rider.strPlatformPct} onChange={updateNumber('strPlatformPct')} min={0} max={30} step={0.5} />
              <InputField label="Supplies ($/mo)" id={`${idPrefix}_nc_str_supplies`} value={rider.strSuppliesMo} onChange={updateNumber('strSuppliesMo')} min={0} max={10000} step={50} />
              <InputField label="Cleaning ($ per stay)" id={`${idPrefix}_nc_str_clean`} value={rider.strClean} onChange={updateNumber('strClean')} min={0} max={1000} step={5} disabled={rider.strCleaningCoveredByGuest} />
              <InputField label="Stays / mo" id={`${idPrefix}_nc_str_stays`} value={rider.strStays} onChange={updateNumber('strStays')} min={0} max={60} step={1} />
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rider.strCleaningCoveredByGuest}
                  onChange={updateToggle('strCleaningCoveredByGuest')}
                  className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
                />
                Cleaning covered by guest
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Maintenance (% of revenue)" id={`${idPrefix}_nc_maint`} value={rider.maintPct} onChange={updateNumber('maintPct')} min={0} max={30} step={0.5} />
            <InputField label="CapEx (% of revenue)" id={`${idPrefix}_nc_capex`} value={rider.capexPct} onChange={updateNumber('capexPct')} min={0} max={30} step={0.5} />
            <InputField label="HOA ($/mo)" id={`${idPrefix}_nc_hoa`} value={rider.hoaMo} onChange={updateNumber('hoaMo')} min={0} max={20000} step={10} />
            <InputField label="Utilities ($/mo)" id={`${idPrefix}_nc_utilities`} value={rider.utilitiesMo} onChange={updateNumber('utilitiesMo')} min={0} max={20000} step={10} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-2">Financing Mode</div>
              <select value={rider.financingMode} onChange={updateSelect('financingMode')} className="border border-slate-300 rounded-xl py-2 px-3 w-full">
                <option value="into_existing_loan">Finance Into Existing Loan</option>
                <option value="separate_loan">Separate Loan</option>
                <option value="all_cash">All Cash</option>
              </select>
            </div>
            <div className="text-xs text-slate-500 self-end">
              Existing loan assumptions: {assumptions.existingLoanRate}% for {assumptions.existingLoanTerm} years
            </div>
            {rider.financingMode === 'separate_loan' && (
              <>
                <InputField label="Separate Loan DP (%)" id={`${idPrefix}_nc_sep_dp`} value={rider.separateDownPct} onChange={updateNumber('separateDownPct')} min={0} max={100} step={0.5} />
                <InputField label="Separate Loan Rate (%)" id={`${idPrefix}_nc_sep_rate`} value={rider.separateRate} onChange={updateNumber('separateRate')} min={0} max={20} step={0.05} />
                <InputField label="Separate Loan Term (yrs)" id={`${idPrefix}_nc_sep_term`} value={rider.separateTerm} onChange={updateNumber('separateTerm')} min={1} max={40} step={1} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="text-xs text-slate-600">Project Cost: <span className="font-semibold">{money(impact.totalProjectCost)}</span></div>
            <div className="text-xs text-slate-600">Project Loan: <span className="font-semibold">{money(impact.projectLoanAmount)}</span></div>
            <div className="text-xs text-slate-600">Project Cash In: <span className="font-semibold">{money(impact.cashInvested)}</span></div>
            <div className="text-xs text-slate-600">Project CF: <span className="font-semibold">{money(impact.projectCashFlow)}/mo</span></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rider.showBeforeAfter}
                onChange={updateToggle('showBeforeAfter')}
                className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
              />
              Show BEFORE vs AFTER
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rider.showProjectOnly}
                onChange={updateToggle('showProjectOnly')}
                className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
              />
              Show NEW CONSTRUCTION ONLY
            </label>
          </div>
      </div>
    </div>
  );
};

export default NewConstructionRider;
