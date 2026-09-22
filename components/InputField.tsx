import React, { useEffect, useState } from 'react';
import { roundTo } from '../utils/calculators';

interface CheckboxOptionProps {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SecondaryInputProps {
  id: string;
  value: number | string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  decimalPlaces?: number;
}

interface InputFieldProps {
  id: string;
  label: string;
  value: number | string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  secondaryInput?: SecondaryInputProps;
  infoText?: string;
  isPaired?: boolean;
  noLabel?: boolean;
  checkboxOption?: CheckboxOptionProps;
  disabled?: boolean;
  decimalPlaces?: number;
}

const decimalsFromStep = (step?: number, fallback = 2): number => {
  if (step === undefined) return fallback;
  const stepString = String(step);
  const decimalPart = stepString.includes('.') ? stepString.split('.')[1] : '';
  return Math.max(fallback, decimalPart.length);
};

const sanitizeNumberText = (raw: string, decimalPlaces: number): string => {
  const withoutCommas = raw.replace(/,/g, '');
  const isNegative = withoutCommas.trim().startsWith('-');
  let clean = withoutCommas.replace(/[^0-9.]/g, '');
  const firstDot = clean.indexOf('.');
  if (firstDot !== -1) {
    clean = clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '');
  }

  if (clean.startsWith('.')) clean = `0${clean}`;
  if (firstDot !== -1 && decimalPlaces >= 0) {
    const [whole, decimal = ''] = clean.split('.');
    clean = `${whole}.${decimal.slice(0, decimalPlaces)}`;
  }

  return `${isNegative ? '-' : ''}${clean}`;
};

const formatValue = (value: number | string, decimalPlaces: number): string => {
  if (typeof value === 'string') return value;
  if (!isFinite(value)) return '0';
  const rounded = roundTo(value, decimalPlaces);
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(decimalPlaces).replace(/0+$/, '').replace(/\.$/, '');
};

const emitSanitizedChange = (
  event: React.ChangeEvent<HTMLInputElement>,
  nextValue: string,
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
) => {
  onChange({
    ...event,
    target: { ...event.target, value: nextValue },
    currentTarget: { ...event.currentTarget, value: nextValue }
  } as React.ChangeEvent<HTMLInputElement>);
};

const NumberTextInput: React.FC<{
  id: string;
  value: number | string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className: string;
  disabled?: boolean;
  decimalPlaces: number;
}> = ({ id, value, onChange, className, disabled = false, decimalPlaces }) => {
  const [draft, setDraft] = useState(() => formatValue(value, decimalPlaces));

  useEffect(() => {
    setDraft(formatValue(value, decimalPlaces));
  }, [value, decimalPlaces]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeNumberText(event.target.value, decimalPlaces);
    setDraft(next);
    emitSanitizedChange(event, next, onChange);
  };

  const handleBlur = () => {
    setDraft(formatValue(Number(draft), decimalPlaces));
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={className}
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
    />
  );
};

const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, min, max, step, secondaryInput, infoText, isPaired = false, noLabel = false, checkboxOption, disabled = false, decimalPlaces }) => {
  const resolvedDecimalPlaces = decimalPlaces ?? decimalsFromStep(step);
  const secondaryDecimalPlaces = secondaryInput
    ? secondaryInput.decimalPlaces ?? decimalsFromStep(secondaryInput.step)
    : 2;

  return (
    <div data-input-field="true" className="h-full flex flex-col justify-start">
      <div className="flex justify-between items-center mb-1">
          {!noLabel && <div className="text-xs text-slate-500">{label}</div>}
          {checkboxOption && (
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={checkboxOption.checked} onChange={checkboxOption.onChange} className="h-3.5 w-3.5 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer" />
              {checkboxOption.label}
            </label>
          )}
        </div>
      <div className={`flex gap-2 ${isPaired ? 'items-start' : 'items-center'}`}>
        <div className="flex-grow">
          <NumberTextInput
            id={id}
            className={`border border-slate-300 rounded-xl py-2 px-3 w-full ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}
            value={value}
            onChange={onChange}
            disabled={disabled}
            decimalPlaces={resolvedDecimalPlaces}
          />
          {min !== undefined && (
            <input
              type="range"
              className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none mt-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              value={Number(value) || 0}
              onChange={onChange}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
            />
          )}
        </div>
        {secondaryInput && (
          <div className={isPaired ? 'w-28 flex-shrink-0' : ''}>
             <div className="flex gap-2 items-center">
              {secondaryInput.label && <span className="text-xs text-slate-500">{secondaryInput.label}</span>}
              <NumberTextInput
                id={secondaryInput.id}
                className={`border border-slate-300 rounded-xl py-2 px-3 ${isPaired ? 'w-full text-center' : 'w-full'}`}
                value={secondaryInput.value}
                onChange={secondaryInput.onChange}
                decimalPlaces={secondaryDecimalPlaces}
              />
             </div>
              {secondaryInput.min !== undefined && (
                <input
                    type="range"
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1"
                    value={Number(secondaryInput.value) || 0}
                    onChange={secondaryInput.onChange}
                    min={secondaryInput.min}
                    max={secondaryInput.max}
                    step={secondaryInput.step}
                />
            )}
          </div>
        )}
      </div>
      {infoText && <div className="text-xs text-slate-500 mt-1">{infoText}</div>}
    </div>
  );
};

export default InputField;
