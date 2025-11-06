import React from 'react';
import { money } from '../utils/calculators';

interface KpiCardProps {
  label: string;
  value?: number | string;
  isPositive?: boolean;
  isNegative?: boolean;
  children?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, isPositive = false, isNegative = false, children }) => {
  const valueColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : '';
  
  const formattedValue = typeof value === 'number' ? money(value) : value;

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>
        {children ? children : formattedValue}
      </div>
    </div>
  );
};

export default KpiCard;