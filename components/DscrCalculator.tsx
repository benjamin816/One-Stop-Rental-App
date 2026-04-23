import React, { useEffect, useMemo, useState } from 'react';
import InputField from './InputField';
import KpiCard from './KpiCard';
import NewConstructionRider from './NewConstructionRider';
import SellerCreditModule from './SellerCreditModule';
import { pmt, loanAmt, money } from '../utils/calculators';
import { exportElementToPdf } from '../utils/pdfExport';
import {
  applyRiderToCoreMetrics,
  defaultNewConstructionRiderState,
  getNewConstructionRiderImpact
} from '../utils/newConstructionRider';
import {
  defaultSellerCreditState,
  getSellerCreditResult
} from '../utils/sellerCredit';
import type { DscrData, CalculatorType } from '../App';

interface DscrCalculatorProps {
  data: DscrData;
  onChange: (field: keyof DscrData, value: string | number) => void;
  onCheckboxChange: (field: keyof DscrData, checked: boolean) => void;
  onRadioChange: (field: keyof DscrData, value: 'LTR' | 'STR') => void;
  onPushData: (source: CalculatorType, destination: CalculatorType) => void;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="font-bold text-md mt-6 mb-2 border-b pb-1 col-span-1 md:col-span-2">{children}</h3>
);

const ReadOnlyField: React.FC<{ label: string; value: string | number; infoText?: string }> = ({ label, value, infoText }) => (
  <div>
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <div className="border border-slate-200 bg-slate-50 rounded-xl py-2 px-3 w-full text-slate-700">{value}</div>
    {infoText && <div className="text-xs text-slate-500 mt-1">{infoText}</div>}
  </div>
);

const calculatorNames: Record<CalculatorType, string> = {
  ltr: 'LTR',
  room: 'By-the-Room',
  str: 'STR',
  multi: 'Multi-Unit',
  build: 'New Build',
  dscr: 'DSCR Loan'
};

const DscrCalculator: React.FC<DscrCalculatorProps> = ({ data, onChange, onCheckboxChange, onRadioChange, onPushData }) => {
  const [activeSubTab, setActiveSubTab] = useState<'lender' | 'investor'>('lender');
  const [isPushMenuOpen, setIsPushMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isStressTestDisabled, setIsStressTestDisabled] = useState(true);
  const [rider, setRider] = useState(defaultNewConstructionRiderState);
  const [sellerCredit, setSellerCredit] = useState(defaultSellerCreditState);

  const riderAssumptions = useMemo(() => ({ existingLoanRate: data.rate, existingLoanTerm: data.term }), [data.rate, data.term]);
  const dscrLoanAmount = useMemo(() => loanAmt(data.purchase, data.downPct), [data.purchase, data.downPct]);
  const dscrBaseCashToClose = useMemo(
    () => (data.renoFinancedHM ? data.downAmt + data.cc : data.downAmt + data.cc + data.renovation),
    [data.renoFinancedHM, data.downAmt, data.cc, data.renovation]
  );
  const sellerCreditResult = useMemo(
    () => getSellerCreditResult({
      state: sellerCredit,
      isFinanced: dscrLoanAmount > 0,
      totalClosingCosts: data.cc,
      loanAmount: dscrLoanAmount,
      baseInterestRate: data.rate,
      baseCashToClose: dscrBaseCashToClose
    }),
    [sellerCredit, dscrLoanAmount, data.cc, data.rate, dscrBaseCashToClose]
  );

  useEffect(() => {
    if (data.propertyType === 'LTR') {
      onChange('stress_vacancy', 5);
      onChange('min_dscr', 1.0);
    } else {
      onChange('stress_vacancy', 15);
      onChange('min_dscr', 1.0);
    }
    onChange('stress_rate', parseFloat((data.rate + 2).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.propertyType]);

  useEffect(() => {
    onChange('stress_rate', parseFloat((data.rate + 2).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rate]);

  const lenderMetrics = useMemo(() => {
    const loan = dscrLoanAmount;
    const grossMonthlyIncome = data.propertyType === 'LTR'
      ? data.ltr_rent
      : data.str_adr * (30.44 * (data.str_occ / 100));

    const effectiveVacancy = isStressTestDisabled ? 0 : data.stress_vacancy;
    const effectiveGrossIncome = grossMonthlyIncome * 12 * (1 - (effectiveVacancy / 100));
    const lenderOpex = data.taxYr + (data.insMo * 12) + (data.hoa * 12);
    const noi = effectiveGrossIncome - lenderOpex;

    const stressedRateAfterBuydown = Math.max(data.stress_rate - sellerCreditResult.estimatedRateReduction, 0);
    const effectiveStressRate = isStressTestDisabled ? sellerCreditResult.estimatedNewRate : stressedRateAfterBuydown;
    const primaryDebtService = pmt(loan, effectiveStressRate, data.term) * 12;

    const hmPayment = data.renoFinancedHM ? pmt(data.renovation, data.hm_rate, data.hm_term) : 0;
    const hmDebtService = hmPayment * 12;

    const totalDebtService = primaryDebtService + hmDebtService;
    const dscr = totalDebtService > 0 ? noi / totalDebtService : Infinity;
    const cashFlowAnnual = noi - totalDebtService;
    const cashFlowAfterHmAnnual = noi - primaryDebtService;

    return {
      loan,
      noi,
      totalDebtService,
      dscr,
      grossMonthlyIncome,
      hmPayment,
      hmDebtService,
      primaryDebtService,
      cashFlowAnnual,
      cashFlowAfterHmAnnual
    };
  }, [data, isStressTestDisabled, dscrLoanAmount, sellerCreditResult]);

  const investorMetrics = useMemo(() => {
    const loan = dscrLoanAmount;
    const grossMonthlyIncome = lenderMetrics.grossMonthlyIncome;
    const hmPayment = lenderMetrics.hmPayment;
    const pi = pmt(loan, sellerCreditResult.estimatedNewRate, data.term);
    const piti = pi + data.taxYr / 12 + data.insMo;

    let opex = 0;
    if (data.propertyType === 'LTR') {
      const invPercentOpex = grossMonthlyIncome * ((data.inv_pmPct + data.inv_maintPct + data.inv_capexPct) / 100);
      const invFixedOpex = data.hoa + data.inv_utilities;
      opex = invPercentOpex + invFixedOpex;
    } else {
      const invPercentOpex = grossMonthlyIncome * ((data.inv_pmPct + data.inv_platformPct + data.inv_maintPct + data.inv_capexPct) / 100);
      const invFixedOpex = (data.inv_clean * data.inv_stays) + data.hoa + data.inv_utilities + data.inv_suppliesMo;
      opex = invPercentOpex + invFixedOpex;
    }

    const cfWithHm = grossMonthlyIncome - piti - opex - hmPayment;
    const cfAfterHm = grossMonthlyIncome - piti - opex;
    const cashIn = sellerCreditResult.adjustedCashToClose;
    const cocWithHm = cashIn > 0 ? (cfWithHm * 12) / cashIn * 100 : 0;
    const cocAfterHm = cashIn > 0 ? (cfAfterHm * 12) / cashIn * 100 : 0;
    const pmMonthly = grossMonthlyIncome * (data.inv_pmPct / 100);
    const maintMonthly = grossMonthlyIncome * (data.inv_maintPct / 100);
    const capexMonthly = grossMonthlyIncome * (data.inv_capexPct / 100);

    return { loan, piti, opex, cfWithHm, cfAfterHm, cashIn, cocWithHm, cocAfterHm, pmMonthly, maintMonthly, capexMonthly };
  }, [data, lenderMetrics, dscrLoanAmount, sellerCreditResult]);

  const riderImpact = useMemo(() => getNewConstructionRiderImpact(rider, riderAssumptions), [rider, riderAssumptions]);

  const lenderAdjusted = useMemo(() => {
    const addedNoiAnnual = (riderImpact.monthlyRevenue - riderImpact.monthlyOpex) * 12;
    const noi = lenderMetrics.noi + addedNoiAnnual;
    const totalDebtService = lenderMetrics.totalDebtService + (riderImpact.monthlyDebtService * 12);
    const dscr = totalDebtService > 0 ? noi / totalDebtService : Infinity;
    const cashFlowAnnual = lenderMetrics.cashFlowAnnual + (riderImpact.projectCashFlow * 12);
    const cashFlowAfterHmAnnual = lenderMetrics.cashFlowAfterHmAnnual + (riderImpact.projectCashFlow * 12);
    return { noi, totalDebtService, dscr, cashFlowAnnual, cashFlowAfterHmAnnual };
  }, [lenderMetrics, riderImpact]);

  const investorAdjusted = useMemo(
    () => applyRiderToCoreMetrics(
      { piti: investorMetrics.piti, opex: investorMetrics.opex, cashFlow: investorMetrics.cfWithHm, cashIn: investorMetrics.cashIn },
      rider,
      riderAssumptions
    ),
    [investorMetrics, rider, riderAssumptions]
  );
  const investorAdjustedAfterHm = useMemo(
    () => applyRiderToCoreMetrics(
      { piti: investorMetrics.piti, opex: investorMetrics.opex, cashFlow: investorMetrics.cfAfterHm, cashIn: investorMetrics.cashIn },
      rider,
      riderAssumptions
    ),
    [investorMetrics, rider, riderAssumptions]
  );

  const dscrPass = lenderAdjusted.dscr >= data.min_dscr;
  const CALCULATOR_ID = 'dscr-calculator';
  const ACTIONS_CLASS = 'dscr-actions';
  const availableDestinations = (Object.keys(calculatorNames) as CalculatorType[]).filter(key => key !== 'dscr');

  const handlePushClick = (destination: CalculatorType) => {
    onPushData('dscr', destination);
    setIsPushMenuOpen(false);
  };

  const handleDscrExport = async (option: 'lender' | 'investor' | 'both') => {
    setIsExportMenuOpen(false);
    const element = document.getElementById(CALCULATOR_ID);
    if (!element) return;

    try {
      await exportElementToPdf({
        sourceElement: element,
        filename: `DSCR_Analysis_${option}_${new Date().toISOString().slice(0, 10)}.pdf`,
        actionsClass: ACTIONS_CLASS,
        prepareElement: exportElement => {
          const lenderTabContent = exportElement.querySelector('#dscr-lender-view') as HTMLElement | null;
          const investorTabContent = exportElement.querySelector('#dscr-investor-view') as HTMLElement | null;
          const tabButtons = exportElement.querySelector('#dscr-tabs') as HTMLElement | null;
          if (!lenderTabContent || !investorTabContent) return;

          const originalLenderDisplay = lenderTabContent.style.display;
          const originalInvestorDisplay = investorTabContent.style.display;
          const originalTabsDisplay = tabButtons ? tabButtons.style.display : '';
          let pageBreak: HTMLDivElement | null = null;

          if (tabButtons) tabButtons.style.display = 'none';
          if (option === 'lender') {
            lenderTabContent.style.display = 'block';
            investorTabContent.style.display = 'none';
          } else if (option === 'investor') {
            lenderTabContent.style.display = 'none';
            investorTabContent.style.display = 'block';
          } else {
            lenderTabContent.style.display = 'block';
            investorTabContent.style.display = 'block';
            pageBreak = document.createElement('div');
            pageBreak.className = 'html2pdf__page-break';
            investorTabContent.prepend(pageBreak);
          }

          return () => {
            lenderTabContent.style.display = originalLenderDisplay;
            investorTabContent.style.display = originalInvestorDisplay;
            if (tabButtons) tabButtons.style.display = originalTabsDisplay;
            if (pageBreak) pageBreak.remove();
          };
        }
      });
    } catch (error) {
      console.error('DSCR PDF export failed:', error);
    }
  };

  return (
    <div id={CALCULATOR_ID} className="bg-white rounded-2xl shadow-lg p-5">
      <h2 className="font-extrabold tracking-wide text-lg mb-3">DSCR Analysis</h2>

      <div className={`${ACTIONS_CLASS} flex justify-end items-center gap-2 mb-4`}>
        <div className="relative">
          <button onClick={() => setIsPushMenuOpen(prev => !prev)} className="py-2 px-4 rounded-full font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200 text-sm">
            Send Data To...
          </button>
          {isPushMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
              <ul className="py-1">
                {availableDestinations.map(key => (
                  <li key={key}><button onClick={() => handlePushClick(key)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">{calculatorNames[key]}</button></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setIsExportMenuOpen(prev => !prev)} className="py-2 px-4 rounded-full font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors duration-200 text-sm">
            Export PDF
          </button>
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
              <ul className="py-1">
                <li><button onClick={() => handleDscrExport('lender')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Lender View</button></li>
                <li><button onClick={() => handleDscrExport('investor')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Investor View</button></li>
                <li><button onClick={() => handleDscrExport('both')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Both Views</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div id="dscr-tabs" className="flex gap-2 border-b mb-4">
        <button onClick={() => setActiveSubTab('lender')} className={`py-2 px-4 font-bold ${activeSubTab === 'lender' ? 'border-b-2 border-slate-800' : 'text-slate-500'}`}>Lender Facing</button>
        <button onClick={() => setActiveSubTab('investor')} className={`py-2 px-4 font-bold ${activeSubTab === 'investor' ? 'border-b-2 border-slate-800' : 'text-slate-500'}`}>Investor Facing</button>
      </div>
      <SellerCreditModule idPrefix="dscr" state={sellerCredit} result={sellerCreditResult} onChange={setSellerCredit} />

      <div id="dscr-lender-view" style={{ display: activeSubTab === 'lender' ? 'block' : 'none' }}>
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
          <InputField label="Down Payment (%)" id="dscr_down_pct" value={data.downPct} onChange={e => onChange('downPct', e.target.value)} min={0} max={100} step={0.25} secondaryInput={{ label: 'or Down $', id: 'dscr_down_amt', value: data.downAmt, onChange: e => onChange('downAmt', e.target.value) }} />
          <InputField label="Interest Rate (%)" id="dscr_rate" value={data.rate} onChange={e => onChange('rate', e.target.value)} min={0} max={15} step={0.05} />
          <InputField label="Term (years)" id="dscr_term" value={data.term} onChange={e => onChange('term', e.target.value)} min={1} max={40} step={1} />
          <div className="col-span-1 md:col-span-2 text-xs text-slate-500 -mt-2">Loan Amount = <span className="font-semibold">{money(lenderMetrics.loan)}</span></div>

          <SectionHeader>Renovation</SectionHeader>
          <InputField label="Renovation ($)" id="dscr_renovation" value={data.renovation} onChange={e => onChange('renovation', e.target.value)} min={0} max={200000} step={500}
            checkboxOption={{ label: 'Finance with Hard Money', checked: data.renoFinancedHM, onChange: e => onCheckboxChange('renoFinancedHM', e.target.checked) }} />
          {data.renoFinancedHM && (
            <>
              <InputField label="Hard Money Rate (%)" id="dscr_hm_rate" value={data.hm_rate} onChange={e => onChange('hm_rate', e.target.value)} min={5} max={20} step={0.25} />
              <InputField label="Hard Money Term (years)" id="dscr_hm_term" value={data.hm_term} onChange={e => onChange('hm_term', e.target.value)} min={1} max={5} step={1} infoText={`Monthly Payment: ${money(lenderMetrics.hmPayment)} | Annual Debt: ${money(lenderMetrics.hmDebtService)}`} />
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
          <div className="col-span-1 md:col-span-2 text-sm text-slate-600 text-right -mt-2"><span className="font-bold">Gross Potential Revenue:</span> {money(lenderMetrics.grossMonthlyIncome)}/mo | {money(lenderMetrics.grossMonthlyIncome * 12)}/yr</div>

          <SectionHeader>Operating Expenses (for DSCR)</SectionHeader>
          <InputField label="Taxes (annual $ / rate)" id="dscr_tax_yr" value={data.taxYr} onChange={e => onChange('taxYr', e.target.value)} min={0} max={50000} step={100}
            secondaryInput={{ id: 'dscr_tax_rate', value: data.taxRate, onChange: e => onChange('taxRate', e.target.value), min: 0, max: 5, step: 0.01 }}
            infoText="Rate is % of purchase price. Change one to update the other." isPaired={true} />
          <InputField label="Insurance ($/mo)" id="dscr_ins_mo" value={data.insMo} onChange={e => onChange('insMo', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.insMo * 12)}/yr`} />
          <InputField label="HOA ($/mo)" id="dscr_hoa" value={data.hoa} onChange={e => onChange('hoa', e.target.value)} min={0} max={1000} step={5} infoText={`= ${money(data.hoa * 12)}/yr`} />

          <SectionHeader>Lender Stress Test</SectionHeader>
          <div className="col-span-1 md:col-span-2 mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={isStressTestDisabled} onChange={e => setIsStressTestDisabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer" />
              Disable Stress Test (Use Note Rate & 0% Rent Haircut)
            </label>
          </div>
          <InputField label="Rent Haircut (%)" id="dscr_stress_vacancy" value={data.stress_vacancy} onChange={e => onChange('stress_vacancy', e.target.value)} min={0} max={50} step={0.5} infoText="Standard haircut on gross rent." disabled={isStressTestDisabled} />
          <InputField label="Stress Test Rate (%)" id="dscr_stress_rate" value={data.stress_rate} onChange={e => onChange('stress_rate', e.target.value)} min={0} max={15} step={0.05} infoText="Defaults to Note Rate + 2%" disabled={isStressTestDisabled} />
          <InputField label="Minimum DSCR" id="dscr_min_dscr" value={data.min_dscr} onChange={e => onChange('min_dscr', e.target.value)} min={1} max={2} step={0.01} infoText="Lender minimum required ratio." />
        </div>

        <NewConstructionRider idPrefix="dscr_lender" rider={rider} assumptions={riderAssumptions} onChange={setRider} />
        {rider.enabled && rider.showBeforeAfter && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Before vs After</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Before NOI / mo" value={lenderMetrics.noi / 12} />
              <KpiCard label="After NOI / mo" value={lenderAdjusted.noi / 12} />
              <KpiCard label="Before DSCR" value={`${lenderMetrics.dscr.toFixed(2)}x`} />
              <KpiCard label="After DSCR" value={`${lenderAdjusted.dscr.toFixed(2)}x`} />
              <KpiCard label="Before Debt / yr" value={lenderMetrics.totalDebtService} />
              <KpiCard label="After Debt / yr" value={lenderAdjusted.totalDebtService} />
            </div>
          </div>
        )}
        {rider.enabled && rider.showProjectOnly && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">New Construction Only</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Project Revenue / mo" value={riderImpact.monthlyRevenue} />
              <KpiCard label="Project Opex / mo" value={riderImpact.monthlyOpex} />
              <KpiCard label="Project Debt / mo" value={riderImpact.monthlyDebtService} />
              <KpiCard label="Project CF / mo" value={riderImpact.projectCashFlow} isPositive={riderImpact.projectCashFlow > 0} isNegative={riderImpact.projectCashFlow < 0} />
            </div>
          </div>
        )}

        <hr className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Net Operating Income (NOI)" value={`${money(lenderAdjusted.noi / 12)}/mo`} />
          <KpiCard label="Est. Note Rate" value={`${sellerCreditResult.estimatedNewRate.toFixed(3)}%`} />
          <KpiCard label="Cash Flow">
            {data.renoFinancedHM ? (
              <div className="flex justify-around items-center text-base">
                <div className="text-center w-1/2">
                  <span className={lenderAdjusted.cashFlowAnnual >= 0 ? 'text-green-600' : 'text-red-600'}>{money(lenderAdjusted.cashFlowAnnual / 12)}</span>
                  <span className="block text-xs font-normal text-slate-500">With HM</span>
                </div>
                <div className="border-l border-slate-300 h-6"></div>
                <div className="text-center w-1/2">
                  <span className={lenderAdjusted.cashFlowAfterHmAnnual >= 0 ? 'text-green-600' : 'text-red-600'}>{money(lenderAdjusted.cashFlowAfterHmAnnual / 12)}</span>
                  <span className="block text-xs font-normal text-slate-500">After HM</span>
                </div>
              </div>
            ) : (
              <span className={lenderAdjusted.cashFlowAnnual >= 0 ? 'text-green-600' : 'text-red-600'}>{`${money(lenderAdjusted.cashFlowAnnual / 12)}/mo`}</span>
            )}
          </KpiCard>
          <KpiCard label="Annual Debt Service">
            <div>{money(lenderAdjusted.totalDebtService)}</div>
            {data.renoFinancedHM && <div className="text-xs font-normal text-slate-500 -mt-1">({money(lenderMetrics.primaryDebtService)} M + {money(lenderMetrics.hmDebtService)} HM)</div>}
          </KpiCard>
          <KpiCard label="DSCR" isPositive={dscrPass} isNegative={!dscrPass}>
            <div className="flex items-center gap-2">
              <span>{lenderAdjusted.dscr.toFixed(2)}x</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${dscrPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{dscrPass ? 'PASS' : 'FAIL'}</span>
            </div>
          </KpiCard>
        </div>
      </div>

      <div id="dscr-investor-view" style={{ display: activeSubTab === 'investor' ? 'block' : 'none' }}>
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
            <ReadOnlyField label="Financing" value={data.renoFinancedHM ? `Hard Money (${data.hm_rate}% / ${data.hm_term}yr)` : 'Paid with Cash'}
              infoText={data.renoFinancedHM ? `Monthly Payment: ${money(lenderMetrics.hmPayment)} | Annual Debt: ${money(lenderMetrics.hmDebtService)}` : undefined} />
          )}

          <SectionHeader>Revenue</SectionHeader>
          <ReadOnlyField label="Gross Monthly Revenue" value={money(lenderMetrics.grossMonthlyIncome)} />
          <ReadOnlyField label="Gross Annual Revenue" value={money(lenderMetrics.grossMonthlyIncome * 12)} />

          <SectionHeader>Full Operating Expenses</SectionHeader>
          <ReadOnlyField label="Taxes (annual)" value={money(data.taxYr)} infoText={`= ${money(data.taxYr / 12)}/mo`} />
          <ReadOnlyField label="Insurance ($/mo)" value={money(data.insMo)} infoText={`= ${money(data.insMo * 12)}/yr`} />
          <ReadOnlyField label="HOA ($/mo)" value={money(data.hoa)} infoText={`= ${money(data.hoa * 12)}/yr`} />
          <InputField label={data.propertyType === 'STR' ? 'PM / Cohost (% of rev)' : 'PM (% of rent)'} id="dscr_inv_pm" value={data.inv_pmPct} onChange={e => onChange('inv_pmPct', e.target.value)} min={0} max={20} step={0.5}
            infoText={`${money(investorMetrics.pmMonthly)}/mo | ${money(investorMetrics.pmMonthly * 12)}/yr`} />
          <InputField label="Maintenance (% of rent)" id="dscr_inv_maint" value={data.inv_maintPct} onChange={e => onChange('inv_maintPct', e.target.value)} min={0} max={20} step={0.5}
            infoText={`${money(investorMetrics.maintMonthly)}/mo | ${money(investorMetrics.maintMonthly * 12)}/yr`} />
          <InputField label="CapEx (% of rent)" id="dscr_inv_capex" value={data.inv_capexPct} onChange={e => onChange('inv_capexPct', e.target.value)} min={0} max={20} step={0.5}
            infoText={`${money(investorMetrics.capexMonthly)}/mo | ${money(investorMetrics.capexMonthly * 12)}/yr`} />
          <InputField label="Utilities ($/mo)" id="dscr_inv_utilities" value={data.inv_utilities} onChange={e => onChange('inv_utilities', e.target.value)} min={0} max={1000} step={10}
            infoText={`= ${money(data.inv_utilities * 12)}/yr`} />

          {data.propertyType === 'STR' && (
            <>
              <InputField label="Platform (% of rev)" id="dscr_inv_platform" value={data.inv_platformPct} onChange={e => onChange('inv_platformPct', e.target.value)} min={0} max={20} step={0.5} />
              <InputField label="Supplies/Furniture ($/mo)" id="dscr_inv_supplies" value={data.inv_suppliesMo} onChange={e => onChange('inv_suppliesMo', e.target.value)} min={0} max={1000} step={10} />
              <InputField label="Cleaning ($ per stay)" id="dscr_inv_clean" value={data.inv_clean} onChange={e => onChange('inv_clean', e.target.value)} min={0} max={500} step={5} />
              <InputField label="Avg Stays / mo" id="dscr_inv_stays" value={data.inv_stays} onChange={e => onChange('inv_stays', e.target.value)} min={0} max={20} step={1} />
            </>
          )}
        </div>

        <NewConstructionRider idPrefix="dscr_investor" rider={rider} assumptions={riderAssumptions} onChange={setRider} />
        {rider.enabled && rider.showBeforeAfter && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Before vs After</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Before CF / mo" value={investorMetrics.cfWithHm} isPositive={investorMetrics.cfWithHm > 0} isNegative={investorMetrics.cfWithHm < 0} />
              <KpiCard label="After CF / mo" value={investorAdjusted.cashFlow} isPositive={investorAdjusted.cashFlow > 0} isNegative={investorAdjusted.cashFlow < 0} />
              <KpiCard label="Before CoC" value={`${isFinite(investorMetrics.cocWithHm) ? investorMetrics.cocWithHm.toFixed(1) + '%' : 'N/A'}`} />
              <KpiCard label="After CoC" value={`${isFinite(investorAdjusted.coc) ? investorAdjusted.coc.toFixed(1) + '%' : 'N/A'}`} />
              <KpiCard label="Before Cash to Close" value={investorMetrics.cashIn} />
              <KpiCard label="After Cash to Close" value={investorAdjusted.cashIn} />
            </div>
          </div>
        )}
        {rider.enabled && rider.showProjectOnly && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">New Construction Only</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Project Revenue / mo" value={riderImpact.monthlyRevenue} />
              <KpiCard label="Project Opex / mo" value={riderImpact.monthlyOpex} />
              <KpiCard label="Project Debt / mo" value={riderImpact.monthlyDebtService} />
              <KpiCard label="Project CF / mo" value={riderImpact.projectCashFlow} isPositive={riderImpact.projectCashFlow > 0} isNegative={riderImpact.projectCashFlow < 0} />
            </div>
          </div>
        )}

        <hr className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard label="Loan Amount" value={investorMetrics.loan} />
          <KpiCard label="Cash to Close" value={investorAdjusted.cashIn} />
          <KpiCard label="Est. Note Rate" value={`${sellerCreditResult.estimatedNewRate.toFixed(3)}%`} />
          <KpiCard label="PITI / mo" value={investorAdjusted.piti} />
          <KpiCard label="Opex / mo" value={investorAdjusted.opex} />

          {data.renoFinancedHM ? (
            <>
              <KpiCard label="Cash Flow / mo">
                <div className="flex justify-around items-center text-base">
                  <div className="text-center w-1/2">
                    <span className={investorAdjusted.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>{money(investorAdjusted.cashFlow)}</span>
                    <span className="block text-xs font-normal text-slate-500">With HM</span>
                  </div>
                  <div className="border-l border-slate-300 h-6"></div>
                  <div className="text-center w-1/2">
                    <span className={investorAdjustedAfterHm.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>{money(investorAdjustedAfterHm.cashFlow)}</span>
                    <span className="block text-xs font-normal text-slate-500">After HM</span>
                  </div>
                </div>
              </KpiCard>
              <KpiCard label="Cash-on-Cash">
                <div className="flex justify-around items-center text-base">
                  <div className="text-center w-1/2">
                    <span className={investorAdjusted.coc >= 0 ? 'text-green-600' : 'text-red-600'}>{isFinite(investorAdjusted.coc) ? `${investorAdjusted.coc.toFixed(1)}%` : 'N/A'}</span>
                    <span className="block text-xs font-normal text-slate-500">With HM</span>
                  </div>
                  <div className="border-l border-slate-300 h-6"></div>
                  <div className="text-center w-1/2">
                    <span className={investorAdjustedAfterHm.coc >= 0 ? 'text-green-600' : 'text-red-600'}>{isFinite(investorAdjustedAfterHm.coc) ? `${investorAdjustedAfterHm.coc.toFixed(1)}%` : 'N/A'}</span>
                    <span className="block text-xs font-normal text-slate-500">After HM</span>
                  </div>
                </div>
              </KpiCard>
            </>
          ) : (
            <>
              <KpiCard label="Cash Flow / mo" value={investorAdjusted.cashFlow} isPositive={investorAdjusted.cashFlow > 0} isNegative={investorAdjusted.cashFlow < 0} />
              <KpiCard label="Cash-on-Cash" value={`${isFinite(investorAdjusted.coc) ? investorAdjusted.coc.toFixed(1) + '%' : 'N/A'}`} />
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2">Investor analysis uses actual loan terms. Rider values are included when enabled.</p>
      </div>
    </div>
  );
};

export default DscrCalculator;
