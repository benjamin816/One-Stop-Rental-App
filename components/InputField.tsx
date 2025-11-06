import React from 'react';

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
}

const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, min, max, step, secondaryInput, infoText, isPaired = false, noLabel = false, checkboxOption, disabled = false }) => {
  return (
    <div>
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
          <input
            id={id}
            type="text"
            className={`border border-slate-300 rounded-xl py-2 px-3 w-full ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}
            value={value}
            onChange={onChange}
            disabled={disabled}
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
              <input
                id={secondaryInput.id}
                type="text"
                className={`border border-slate-300 rounded-xl py-2 px-3 ${isPaired ? 'w-full text-center' : 'w-full'}`}
                value={secondaryInput.value}
                onChange={secondaryInput.onChange}
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