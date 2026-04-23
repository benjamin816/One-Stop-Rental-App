import React from 'react';
import InputField from './InputField';
import { money, num } from '../utils/calculators';
import type { SellerCreditResult, SellerCreditState } from '../utils/sellerCredit';

interface SellerCreditModuleProps {
  idPrefix: string;
  state: SellerCreditState;
  result: SellerCreditResult;
  onChange: (next: SellerCreditState) => void;
}

const formatRate = (value: number) => `${value.toFixed(3)}%`;

const SellerCreditModule: React.FC<SellerCreditModuleProps> = ({ idPrefix, state, result, onChange }) => {
  const updateNumber = (field: 'amount' | 'creditToClosing' | 'creditToBuydown') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({ ...state, [field]: num(event.target.value) });
  };

  const updateToggle = (field: 'enabled' | 'applyToClosingCosts' | 'applyToRateBuydown') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;
    if (field === 'enabled') {
      onChange({ ...state, enabled: checked });
      return;
    }

    let next = { ...state, [field]: checked };
    if (!next.applyToClosingCosts && !next.applyToRateBuydown) {
      next = { ...next, applyToClosingCosts: true };
    }
    onChange(next);
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-md mb-2">Seller Credit</h3>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={updateToggle('enabled')}
          className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
        />
        Seller Credit Applied
      </label>

      {state.enabled && (
        <div className="mt-4 space-y-4">
          <InputField
            label="Seller Credit Amount ($)"
            id={`${idPrefix}_seller_credit_amount`}
            value={state.amount}
            onChange={updateNumber('amount')}
            min={0}
            max={1000000}
            step={100}
          />

          {result.isFinanced ? (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={state.applyToClosingCosts}
                    onChange={updateToggle('applyToClosingCosts')}
                    className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
                  />
                  Apply to Closing Costs
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={state.applyToRateBuydown}
                    onChange={updateToggle('applyToRateBuydown')}
                    className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
                  />
                  Apply to Rate Buydown
                </label>
              </div>

              {state.applyToClosingCosts && state.applyToRateBuydown && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Credit to Closing Costs ($)"
                    id={`${idPrefix}_seller_credit_to_closing`}
                    value={state.creditToClosing}
                    onChange={updateNumber('creditToClosing')}
                    min={0}
                    max={1000000}
                    step={100}
                  />
                  <InputField
                    label="Credit to Rate Buydown ($)"
                    id={`${idPrefix}_seller_credit_to_buydown`}
                    value={state.creditToBuydown}
                    onChange={updateNumber('creditToBuydown')}
                    min={0}
                    max={1000000}
                    step={100}
                  />
                  <div className="col-span-1 md:col-span-2 text-xs text-slate-600">
                    Requested Split: {money(result.requestedToClosing)} to closing + {money(result.requestedToBuydown)} to buydown
                    {' '}of {money(result.totalCredit)} total seller credit.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-600">
              Because this is a cash purchase, seller credit first reduces closing costs and any remaining amount
              further reduces total cash required at closing.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="text-xs text-slate-700">Total Seller Credit: <span className="font-semibold">{money(result.totalCredit)}</span></div>
            <div className="text-xs text-slate-700">Applied to Closing Costs: <span className="font-semibold">{money(result.appliedToClosing)}</span></div>
            <div className="text-xs text-slate-700">Applied to Rate Buydown: <span className="font-semibold">{money(result.appliedToBuydown)}</span></div>
            <div className="text-xs text-slate-700">Remaining Closing Costs: <span className="font-semibold">{money(result.adjustedClosingCosts)}</span></div>
            <div className="text-xs text-slate-700">Updated Cash to Close: <span className="font-semibold">{money(result.adjustedCashToClose)}</span></div>
            {result.isFinanced && result.canModelBuydown && (
              <div className="text-xs text-slate-700">
                Estimated New Rate: <span className="font-semibold">{formatRate(result.estimatedNewRate)}</span>
                {' '}({formatRate(result.estimatedRateReduction)} reduction)
              </div>
            )}
          </div>

          {result.notes.length > 0 && (
            <div className="space-y-1">
              {result.notes.map((note, idx) => (
                <p key={`${idPrefix}_seller_note_${idx}`} className="text-xs text-slate-600">{note}</p>
              ))}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((warning, idx) => (
                <p key={`${idPrefix}_seller_warning_${idx}`} className="text-xs text-amber-700">{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerCreditModule;
