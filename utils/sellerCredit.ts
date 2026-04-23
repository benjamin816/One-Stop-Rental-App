import { money } from './calculators';

export interface SellerCreditState {
  enabled: boolean;
  amount: number;
  applyToClosingCosts: boolean;
  applyToRateBuydown: boolean;
  creditToClosing: number;
  creditToBuydown: number;
}

export interface SellerCreditInput {
  state: SellerCreditState;
  isFinanced: boolean;
  totalClosingCosts: number;
  loanAmount: number;
  baseInterestRate: number;
  baseCashToClose: number;
  allowBuydown?: boolean;
}

export interface SellerCreditResult {
  isActive: boolean;
  isFinanced: boolean;
  canModelBuydown: boolean;
  totalCredit: number;
  requestedToClosing: number;
  requestedToBuydown: number;
  appliedToClosing: number;
  appliedToBuydown: number;
  unusedCredit: number;
  adjustedClosingCosts: number;
  estimatedRateReduction: number;
  estimatedNewRate: number;
  adjustedCashToClose: number;
  notes: string[];
  warnings: string[];
}

export const defaultSellerCreditState: SellerCreditState = {
  enabled: false,
  amount: 0,
  applyToClosingCosts: true,
  applyToRateBuydown: false,
  creditToClosing: 0,
  creditToBuydown: 0
};

const clampNonNegative = (value: number) => Math.max(value, 0);

export const getSellerCreditResult = ({
  state,
  isFinanced,
  totalClosingCosts,
  loanAmount,
  baseInterestRate,
  baseCashToClose,
  allowBuydown = true
}: SellerCreditInput): SellerCreditResult => {
  const notes: string[] = [];
  const warnings: string[] = [];
  const closingCosts = clampNonNegative(totalClosingCosts);
  const safeLoanAmount = clampNonNegative(loanAmount);
  const safeBaseRate = clampNonNegative(baseInterestRate);
  const safeBaseCashToClose = clampNonNegative(baseCashToClose);
  const totalCredit = state.enabled ? clampNonNegative(state.amount) : 0;
  const canModelBuydown = isFinanced && allowBuydown && safeLoanAmount > 0;

  if (!state.enabled || totalCredit <= 0) {
    return {
      isActive: false,
      isFinanced,
      canModelBuydown,
      totalCredit: 0,
      requestedToClosing: 0,
      requestedToBuydown: 0,
      appliedToClosing: 0,
      appliedToBuydown: 0,
      unusedCredit: 0,
      adjustedClosingCosts: closingCosts,
      estimatedRateReduction: 0,
      estimatedNewRate: safeBaseRate,
      adjustedCashToClose: safeBaseCashToClose,
      notes,
      warnings
    };
  }

  if (!isFinanced) {
    const appliedToClosing = Math.min(totalCredit, closingCosts);
    const adjustedClosingCosts = Math.max(closingCosts - appliedToClosing, 0);
    const adjustedCashToClose = Math.max(safeBaseCashToClose - totalCredit, 0);

    notes.push(
      'Because this is a cash purchase, seller credit first reduces closing costs and any remaining amount further reduces total cash required at closing.'
    );
    notes.push('Seller credit reduced closing costs first, and any remaining amount reduced total cash to close.');

    return {
      isActive: true,
      isFinanced,
      canModelBuydown: false,
      totalCredit,
      requestedToClosing: totalCredit,
      requestedToBuydown: 0,
      appliedToClosing,
      appliedToBuydown: 0,
      unusedCredit: 0,
      adjustedClosingCosts,
      estimatedRateReduction: 0,
      estimatedNewRate: safeBaseRate,
      adjustedCashToClose,
      notes,
      warnings
    };
  }

  let requestedToClosing = 0;
  let requestedToBuydown = 0;

  if (state.applyToClosingCosts && state.applyToRateBuydown) {
    requestedToClosing = clampNonNegative(state.creditToClosing);
    requestedToBuydown = clampNonNegative(state.creditToBuydown);

    const requestedTotal = requestedToClosing + requestedToBuydown;
    if (requestedTotal > totalCredit) {
      const overflow = requestedTotal - totalCredit;
      requestedToBuydown = Math.max(requestedToBuydown - overflow, 0);
      if (requestedToClosing + requestedToBuydown > totalCredit) {
        requestedToClosing = Math.max(totalCredit - requestedToBuydown, 0);
      }
      warnings.push(
        `Seller credit split exceeded the total credit and was automatically capped at ${money(totalCredit)}.`
      );
    }
  } else if (state.applyToClosingCosts) {
    requestedToClosing = totalCredit;
  } else if (state.applyToRateBuydown) {
    requestedToBuydown = totalCredit;
  } else {
    requestedToClosing = totalCredit;
    warnings.push('No allocation option was selected, so seller credit was defaulted to closing costs.');
  }

  const appliedToClosing = Math.min(requestedToClosing, closingCosts);
  const adjustedClosingCosts = Math.max(closingCosts - appliedToClosing, 0);
  let overflowFromClosing = Math.max(requestedToClosing - appliedToClosing, 0);
  let appliedToBuydown = 0;
  let unusedCredit = 0;

  if (requestedToBuydown > 0) {
    if (canModelBuydown) {
      appliedToBuydown += requestedToBuydown;
    } else {
      unusedCredit += requestedToBuydown;
      warnings.push(
        'Seller credit exceeded closing costs. Overflow cannot be applied in this calculator and may not be fully reflected.'
      );
    }
  }

  if (overflowFromClosing > 0) {
    if (canModelBuydown) {
      appliedToBuydown += overflowFromClosing;
      if (state.applyToClosingCosts && state.applyToRateBuydown) {
        notes.push(
          `Closing-cost allocation exceeded actual closing costs. The excess ${money(overflowFromClosing)} was automatically moved to rate buydown.`
        );
      } else {
        notes.push(
          `Seller credit exceeded closing costs, so the remaining ${money(overflowFromClosing)} was automatically applied toward rate buydown.`
        );
      }
      overflowFromClosing = 0;
    } else {
      unusedCredit += overflowFromClosing;
      warnings.push(
        'Seller credit exceeded closing costs. Overflow cannot be applied in this calculator and may not be fully reflected.'
      );
      overflowFromClosing = 0;
    }
  }

  const unallocatedCredit = Math.max(totalCredit - (requestedToClosing + requestedToBuydown), 0);
  if (unallocatedCredit > 0) {
    unusedCredit += unallocatedCredit;
    warnings.push(`${money(unallocatedCredit)} of seller credit is currently unallocated.`);
  }

  const adjustedCashToClose = Math.max(safeBaseCashToClose - appliedToClosing, 0);

  let estimatedRateReduction = 0;
  let estimatedNewRate = safeBaseRate;
  if (canModelBuydown && appliedToBuydown > 0) {
    const rawRateReduction = (appliedToBuydown / safeLoanAmount) / 0.01 * 0.25;
    estimatedRateReduction = Math.min(Math.max(rawRateReduction, 0), 1);
    estimatedNewRate = Math.max(safeBaseRate - estimatedRateReduction, 0);
    notes.push(
      'Estimated rate buydown assumes each 1% of the loan amount applied to points reduces the rate by about 0.25%. Actual lender pricing may vary.'
    );
  }

  return {
    isActive: true,
    isFinanced,
    canModelBuydown,
    totalCredit,
    requestedToClosing,
    requestedToBuydown,
    appliedToClosing,
    appliedToBuydown,
    unusedCredit,
    adjustedClosingCosts,
    estimatedRateReduction,
    estimatedNewRate,
    adjustedCashToClose,
    notes,
    warnings
  };
};
