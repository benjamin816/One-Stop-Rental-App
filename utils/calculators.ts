export const num = (v: any): number => parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;

export const roundTo = (value: number, decimals = 2): number => {
    if (!isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const round2 = (value: number): number => roundTo(value, 2);

export const money = (n: number): string => {
    if (!isFinite(n) || n === 0) return '$0';
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

export const loanAmt = (price: number, downPct: number): number => {
    return Math.max(price * (1 - downPct / 100), 0);
};

export const pmt = (loan: number, ratePct: number, years: number): number => {
    const r = ratePct / 100 / 12;
    const n = years * 12;
    if (n === 0 || loan === 0) return 0;
    if (r === 0) return loan / n;
    return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};
