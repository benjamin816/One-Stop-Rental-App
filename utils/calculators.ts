export const num = (v: any): number => parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;

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
    if (r === 0) return loan / n;
    if (n === 0 || loan === 0) return 0;
    return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};