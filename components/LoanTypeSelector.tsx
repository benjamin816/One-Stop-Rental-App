import React from 'react';
import InputField from './InputField';
import type { ArmType, LoanType } from '../App';

interface LoanTypeSelectorProps {
  idPrefix: string;
  loanType: LoanType;
  armType: ArmType;
  refiRate: number;
  onLoanTypeChange: (value: LoanType) => void;
  onArmTypeChange: (value: ArmType) => void;
  onRefiRateChange: (value: string) => void;
}

const commonArmTypes: ArmType[] = ['3/6 ARM', '5/6 ARM', '7/6 ARM', '10/6 ARM', '5/1 ARM', '7/1 ARM', '10/1 ARM'];

const LoanTypeSelector: React.FC<LoanTypeSelectorProps> = ({
  idPrefix,
  loanType,
  armType,
  refiRate,
  onLoanTypeChange,
  onArmTypeChange,
  onRefiRateChange
}) => (
  <div className="col-span-1 md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Loan Type</div>
    <div className="flex flex-col sm:flex-row gap-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
        <input
          type="radio"
          name={`${idPrefix}_loan_type`}
          checked={loanType === 'fixed'}
          onChange={() => onLoanTypeChange('fixed')}
          className="form-radio h-4 w-4 text-slate-600"
        />
        30-Year Fixed
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
        <input
          type="radio"
          name={`${idPrefix}_loan_type`}
          checked={loanType === 'arm'}
          onChange={() => onLoanTypeChange('arm')}
          className="form-radio h-4 w-4 text-slate-600"
        />
        Adjustable-Rate Mortgage
      </label>
    </div>

    {loanType === 'arm' && (
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">ARM Type</div>
          <select
            value={armType}
            onChange={event => onArmTypeChange(event.target.value as ArmType)}
            className="border border-slate-300 rounded-xl py-2 px-3 w-full"
          >
            {commonArmTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <InputField
          label="Refi Rate After ARM (%)"
          id={`${idPrefix}_arm_refi_rate`}
          value={refiRate}
          onChange={event => onRefiRateChange(event.target.value)}
          min={0}
          max={15}
          step={0.001}
          decimalPlaces={3}
          infoText="Used for the second output run after refinancing into today's-rate assumptions."
        />
      </div>
    )}
  </div>
);

export default LoanTypeSelector;
