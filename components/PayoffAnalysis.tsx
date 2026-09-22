import React from 'react';
import KpiCard from './KpiCard';

interface PayoffAnalysisProps {
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  monthlyRevenue: number;
  monthlyTaxesAndInsurance: number;
  monthlyOpex: number;
  title?: string;
  note?: string;
}

const PayoffAnalysis: React.FC<PayoffAnalysisProps> = ({
  enabled,
  onToggle,
  monthlyRevenue,
  monthlyTaxesAndInsurance,
  monthlyOpex,
  title = 'Paid-Off Analysis',
  note
}) => {
  const monthlyCashFlow = monthlyRevenue - monthlyTaxesAndInsurance - monthlyOpex;
  const annualCashFlow = monthlyCashFlow * 12;

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => onToggle(true)}
        className="mt-4 py-2 px-4 rounded-full font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200 text-sm"
      >
        Add a Payoff Analysis
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="font-bold text-md">{title}</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={event => onToggle(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
          />
          Include payoff analysis
        </label>
      </div>
      {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="T&I / mo" value={monthlyTaxesAndInsurance} />
        <KpiCard label="Opex / mo" value={monthlyOpex} />
        <KpiCard label="Cash Flow / mo" value={monthlyCashFlow} isPositive={monthlyCashFlow > 0} isNegative={monthlyCashFlow < 0} />
        <KpiCard label="Annual Cash Flow" value={annualCashFlow} isPositive={annualCashFlow > 0} isNegative={annualCashFlow < 0} />
      </div>
    </div>
  );
};

export default PayoffAnalysis;
