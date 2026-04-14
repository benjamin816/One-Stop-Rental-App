import { pmt } from './calculators';

export type RiderFinancingMode = 'into_existing_loan' | 'separate_loan' | 'all_cash';
export type RiderRevenueMode = 'LTR' | 'STR';

export interface NewConstructionRiderState {
  enabled: boolean;
  financingMode: RiderFinancingMode;
  revenueMode: RiderRevenueMode;
  hardCosts: number;
  softCosts: number;
  contingency: number;
  monthlyHoldingCosts: number;
  holdingMonths: number;
  ltrRent: number;
  ltrPmPct: number;
  strAdr: number;
  strOcc: number;
  strCohostPct: number;
  strPlatformPct: number;
  strSuppliesMo: number;
  strClean: number;
  strStays: number;
  strCleaningCoveredByGuest: boolean;
  maintPct: number;
  capexPct: number;
  hoaMo: number;
  utilitiesMo: number;
  separateDownPct: number;
  separateRate: number;
  separateTerm: number;
  showBeforeAfter: boolean;
  showProjectOnly: boolean;
}

export interface NewConstructionRiderAssumptions {
  existingLoanRate: number;
  existingLoanTerm: number;
}

export interface CoreBottomMetrics {
  piti: number;
  opex: number;
  cashFlow: number;
  cashIn: number;
}

export interface CoreBottomMetricsWithCoc extends CoreBottomMetrics {
  coc: number;
}

export interface NewConstructionRiderImpact {
  totalProjectCost: number;
  monthlyRevenue: number;
  monthlyOpex: number;
  monthlyDebtService: number;
  cashInvested: number;
  projectLoanAmount: number;
  projectCashFlow: number;
  annualProjectCashFlow: number;
}

export const defaultNewConstructionRiderState: NewConstructionRiderState = {
  enabled: false,
  financingMode: 'all_cash',
  revenueMode: 'LTR',
  hardCosts: 0,
  softCosts: 0,
  contingency: 0,
  monthlyHoldingCosts: 0,
  holdingMonths: 6,
  ltrRent: 0,
  ltrPmPct: 8,
  strAdr: 0,
  strOcc: 70,
  strCohostPct: 15,
  strPlatformPct: 3,
  strSuppliesMo: 0,
  strClean: 0,
  strStays: 0,
  strCleaningCoveredByGuest: false,
  maintPct: 5,
  capexPct: 5,
  hoaMo: 0,
  utilitiesMo: 0,
  separateDownPct: 20,
  separateRate: 8,
  separateTerm: 30,
  showBeforeAfter: false,
  showProjectOnly: false
};

export const getNewConstructionRiderImpact = (
  rider: NewConstructionRiderState,
  assumptions: NewConstructionRiderAssumptions
): NewConstructionRiderImpact => {
  if (!rider.enabled) {
    return {
      totalProjectCost: 0,
      monthlyRevenue: 0,
      monthlyOpex: 0,
      monthlyDebtService: 0,
      cashInvested: 0,
      projectLoanAmount: 0,
      projectCashFlow: 0,
      annualProjectCashFlow: 0
    };
  }

  const holdingTotal = rider.monthlyHoldingCosts * rider.holdingMonths;
  const totalProjectCost = rider.hardCosts + rider.softCosts + rider.contingency + holdingTotal;

  const monthlyRevenue = rider.revenueMode === 'LTR'
    ? rider.ltrRent
    : rider.strAdr * (30.44 * (rider.strOcc / 100));

  const strategyOpex = rider.revenueMode === 'LTR'
    ? monthlyRevenue * (rider.ltrPmPct / 100)
    : (
      monthlyRevenue * ((rider.strCohostPct + rider.strPlatformPct) / 100) +
      rider.strSuppliesMo +
      (rider.strCleaningCoveredByGuest ? 0 : rider.strClean * rider.strStays)
    );

  const propertyOpex = monthlyRevenue * ((rider.maintPct + rider.capexPct) / 100) + rider.hoaMo + rider.utilitiesMo;
  const monthlyOpex = strategyOpex + propertyOpex;

  let projectLoanAmount = 0;
  let cashInvested = 0;
  let monthlyDebtService = 0;

  if (rider.financingMode === 'all_cash') {
    cashInvested = totalProjectCost;
  } else if (rider.financingMode === 'into_existing_loan') {
    projectLoanAmount = totalProjectCost;
    monthlyDebtService = pmt(projectLoanAmount, assumptions.existingLoanRate, assumptions.existingLoanTerm);
  } else {
    cashInvested = totalProjectCost * (rider.separateDownPct / 100);
    projectLoanAmount = Math.max(totalProjectCost - cashInvested, 0);
    monthlyDebtService = pmt(projectLoanAmount, rider.separateRate, rider.separateTerm);
  }

  const projectCashFlow = monthlyRevenue - monthlyOpex - monthlyDebtService;
  return {
    totalProjectCost,
    monthlyRevenue,
    monthlyOpex,
    monthlyDebtService,
    cashInvested,
    projectLoanAmount,
    projectCashFlow,
    annualProjectCashFlow: projectCashFlow * 12
  };
};

export const applyRiderToCoreMetrics = (
  base: CoreBottomMetrics,
  rider: NewConstructionRiderState,
  assumptions: NewConstructionRiderAssumptions
): CoreBottomMetricsWithCoc => {
  const impact = getNewConstructionRiderImpact(rider, assumptions);
  const piti = base.piti + impact.monthlyDebtService;
  const opex = base.opex + impact.monthlyOpex;
  const cashFlow = base.cashFlow + impact.projectCashFlow;
  const cashIn = base.cashIn + impact.cashInvested;
  const coc = cashIn > 0 ? (cashFlow * 12) / cashIn * 100 : 0;

  return { piti, opex, cashFlow, cashIn, coc };
};
