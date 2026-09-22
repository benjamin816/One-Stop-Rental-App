import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header';
import InvestorLeadGate from './components/InvestorLeadGate';
import Footer from './components/Footer';
import LtrCalculator from './components/LtrCalculator';
import RoomCalculator from './components/RoomCalculator';
import StrCalculator from './components/StrCalculator';
import DscrCalculator from './components/DscrCalculator';
import BuildCalculator from './components/BuildCalculator';
import MultiUnitCalculator from './components/MultiUnitCalculator';
import { num, round2, roundTo } from './utils/calculators';
import { exportElementToPdf } from './utils/pdfExport';
import {
    defaultNewConstructionRiderState,
    type NewConstructionRiderState
} from './utils/newConstructionRider';
import {
    defaultSellerCreditState,
    type SellerCreditState
} from './utils/sellerCredit';

// TYPE DEFINITIONS
interface BasePropertyData {
    purchase: number;
    downPct: number;
    downAmt: number;
    cc: number;
    renovation: number;
    rate: number;
    term: number;
    taxYr: number;
    taxRate: number;
    insMo: number;
    hoa: number;
    utilities: number;
    maintPct: number;
    capexPct: number;
    pmPct: number;
    loanType: LoanType;
    armType: ArmType;
    refiRate: number;
    payoffEnabled: boolean;
}

export interface LtrData extends BasePropertyData {
    renoFinanced: boolean;
    rent: number;
}

export interface RoomData extends Omit<BasePropertyData, 'rent' | 'pmPct'> {
    renoFinanced: boolean;
    pmPct: number;
}

export interface RentalUnit {
    id: string;
    type: 'Room' | 'ADU' | 'Unit';
    rent: number;
    ownerOccupied: boolean;
}

export interface StrData extends Omit<BasePropertyData, 'pmPct'> {
    renoFinanced: boolean;
    staging: number;
    adr: number;
    occ: number;
    suppliesMo: number;
    cohostPct: number;
    platformPct: number;
    clean: number;
    stays: number;
}

export interface DscrData {
    propertyType: 'LTR' | 'STR';
    purchase: number;
    downPct: number;
    downAmt: number;
    cc: number;
    rate: number;
    term: number;
    renovation: number;
    renoFinancedHM: boolean;
    hm_rate: number;
    hm_term: number;
    ltr_rent: number;
    str_adr: number;
    str_occ: number;
    taxYr: number;
    taxRate: number;
    insMo: number;
    hoa: number;
    stress_vacancy: number;
    stress_rate: number;
    min_dscr: number;
    inv_pmPct: number;
    inv_maintPct: number;
    inv_capexPct: number;
    inv_utilities: number;
    inv_platformPct: number;
    inv_suppliesMo: number;
    inv_clean: number;
    inv_stays: number;
    loanType: LoanType;
    armType: ArmType;
    refiRate: number;
    payoffEnabled: boolean;
}

export type PropertyType = 'SFH' | 'Townhome' | 'Condo' | 'Duplex' | 'Triplex' | 'Quadplex';
export type LandAcquisition = 'cash' | 'finance' | 'owned';
export type UnitStrategy = 'LTR' | 'STR';
export type CalculatorType = 'ltr' | 'room' | 'str' | 'multi' | 'build' | 'dscr';
export type LoanType = 'fixed' | 'arm';
export type ArmType = '3/6 ARM' | '5/6 ARM' | '7/6 ARM' | '10/6 ARM' | '5/1 ARM' | '7/1 ARM' | '10/1 ARM';

type RecentAnalysisSnapshot =
    | { tab: 'ltr'; data: LtrData; rider: NewConstructionRiderState; sellerCredit: SellerCreditState }
    | { tab: 'room'; data: RoomData; rentalUnits: RentalUnit[]; rider: NewConstructionRiderState; sellerCredit: SellerCreditState }
    | { tab: 'str'; data: StrData; rider: NewConstructionRiderState; sellerCredit: SellerCreditState }
    | { tab: 'multi'; data: MultiUnitData; units: MultiUnitItem[]; rider: NewConstructionRiderState; sellerCredit: SellerCreditState }
    | { tab: 'build'; data: BuildData; units: BuildUnitData[]; sellerCredit: SellerCreditState }
    | { tab: 'dscr'; data: DscrData; rider: NewConstructionRiderState; sellerCredit: SellerCreditState };

interface RecentAnalysisEntry {
    id: string;
    title?: string;
    createdAt: string;
    tab: CalculatorType;
    purchasePrice: number | null;
    snapshot: RecentAnalysisSnapshot;
}

const RECENT_ANALYSES_KEY = 'one_stop_recent_analyses_v1';
const MAX_RECENT_ANALYSES = 10;
const textDataFields = new Set(['loanType', 'armType', 'propertyType', 'landAcquisition']);
const getNumericPrecision = (field: string): number => {
    const normalized = field.toLowerCase();
    const isMortgageRate = normalized.includes('rate') && normalized !== 'taxrate' && normalized !== 'total_taxrate';
    return isMortgageRate ? 3 : 2;
};


export interface BuildData {
    propertyType: PropertyType;
    landAcquisition: LandAcquisition;
    landCost: number;
    hardCosts: number;
    softCosts: number;
    buffer: number;
    closingCosts: number;
    construction_ltc: number;
    construction_rate: number;
    construction_term: number;
    arv: number;
    refi_ltv: number;
    refi_rate: number;
    refi_term: number;
    total_taxYr: number;
    total_taxRate: number;
    total_insYr: number;
    maintPct: number;
    capexPct: number;
    total_hoa: number;
    total_utilities: number;
    applyToAll: boolean;
    loanType: LoanType;
    armType: ArmType;
    refiRate: number;
    payoffEnabled: boolean;
}

export interface BuildUnitData {
    id: string;
    strategy: UnitStrategy;
    ltr_rent: number;
    ltr_pmPct: number;
    str_adr: number;
    str_occ: number;
    str_cohostPct: number;
    str_platformPct: number;
    str_suppliesMo: number;
    str_clean: number;
    str_cleaningCoveredByGuest: boolean;
    str_stays: number;
}

export interface MultiUnitItem {
    id: string;
    rent: number;
}

export interface MultiUnitData extends Omit<BasePropertyData, 'maintPct' | 'capexPct' | 'pmPct'> {
    renoFinanced: boolean;
    maintPct: number; // as % of total rent
    capexPct: number; // as % of total rent
    pmPct: number; // as % of total rent
}

const initialLtrData: LtrData = {
    purchase: 350000, downPct: 20, downAmt: 70000, cc: 10500, renoFinanced: false, renovation: 15000,
    rate: 6.5, term: 30, rent: 2800, taxYr: 4200, taxRate: 1.2, insMo: 125, hoa: 0, utilities: 0,
    pmPct: 0, maintPct: 3, capexPct: 3, loanType: 'fixed', armType: '7/6 ARM', refiRate: 7, payoffEnabled: false,
};

const initialRoomData: RoomData = {
    purchase: 450000, downPct: 5, downAmt: 22500, cc: 13500, renoFinanced: false, renovation: 20000,
    rate: 6.0, term: 30, taxYr: 5400, taxRate: 1.2, insMo: 150, hoa: 50, utilities: 400,
    pmPct: 0, maintPct: 3, capexPct: 3, loanType: 'fixed', armType: '7/6 ARM', refiRate: 7, payoffEnabled: false,
};

const initialStrData: StrData = {
    purchase: 400000, downPct: 25, downAmt: 100000, cc: 12000, renoFinanced: false, renovation: 25000, staging: 15000,
    rate: 7.0, term: 30, adr: 250, occ: 75, taxYr: 4800, taxRate: 1.2, insMo: 200, hoa: 100, utilities: 500,
    suppliesMo: 150, cohostPct: 15, platformPct: 3, maintPct: 3, capexPct: 3, clean: 150, stays: 8,
    loanType: 'fixed', armType: '7/6 ARM', refiRate: 7, payoffEnabled: false,
};

const initialDscrData: DscrData = {
    propertyType: 'LTR', purchase: 500000, downPct: 25, downAmt: 125000, cc: 15000, rate: 7.5, term: 30, renovation: 0, renoFinancedHM: false, hm_rate: 12, hm_term: 1,
    ltr_rent: 4000, str_adr: 300, str_occ: 70, taxYr: 6000, taxRate: 1.2, insMo: 175, hoa: 0, stress_vacancy: 5, stress_rate: 9.5, min_dscr: 1.0,
    inv_pmPct: 15, inv_maintPct: 3, inv_capexPct: 3, inv_utilities: 300, inv_platformPct: 3, inv_suppliesMo: 150, inv_clean: 0, inv_stays: 8,
    loanType: 'fixed', armType: '7/6 ARM', refiRate: 7, payoffEnabled: false,
};

const initialBuildData: BuildData = {
    propertyType: 'SFH', landAcquisition: 'cash', landCost: 100000, hardCosts: 400000, softCosts: 50000, buffer: 50000, closingCosts: 20000, construction_ltc: 80, construction_rate: 9.5, construction_term: 12,
    arv: 750000, refi_ltv: 75, refi_rate: 6.8, refi_term: 30, total_taxYr: 9000, total_taxRate: 1.2, total_insYr: 2100, maintPct: 3, capexPct: 3, total_hoa: 0, total_utilities: 0, applyToAll: false,
    loanType: 'fixed', armType: '7/6 ARM', refiRate: 7, payoffEnabled: false,
};

const initialMultiUnitData: MultiUnitData = {
    purchase: 600000, downPct: 25, downAmt: 150000, cc: 18000, renoFinanced: false, renovation: 30000,
    rate: 7.2, term: 30, taxYr: 7200, taxRate: 1.2, insMo: 250, hoa: 0, utilities: 0,
    pmPct: 8, maintPct: 3, capexPct: 3, loanType: 'fixed', armType: '7/6 ARM', refiRate: 7, payoffEnabled: false,
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const snapshotHash = (snapshot: RecentAnalysisSnapshot): string => JSON.stringify(snapshot);

const formatRecentDate = (iso: string): string => {
    const d = new Date(iso);
    const month = d.toLocaleString('en-US', { month: 'short' }).replace('.', '');
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month}. ${day}, ${year}`;
};

const getTabLabel = (tab: CalculatorType): string => {
    const labels: Record<CalculatorType, string> = {
        ltr: 'LTR',
        room: 'By-the-Room',
        str: 'STR',
        multi: 'Multi-Unit',
        build: 'New Build',
        dscr: 'DSCR Loan'
    };
    return labels[tab];
};

const Tab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`py-2 px-4 font-bold transition-colors duration-200 ${active ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
        {children}
    </button>
);

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('ltr');
    
    // States
    const [ltrData, setLtrData] = useState<LtrData>(initialLtrData);
    const [roomData, setRoomData] = useState<RoomData>(initialRoomData);
    const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([
        { id: uuidv4(), type: 'Room', rent: 850, ownerOccupied: true },
        { id: uuidv4(), type: 'Room', rent: 800, ownerOccupied: false },
        { id: uuidv4(), type: 'Room', rent: 800, ownerOccupied: false },
        { id: uuidv4(), type: 'ADU', rent: 1200, ownerOccupied: false },
    ]);
    const [strData, setStrData] = useState<StrData>(initialStrData);
    const [dscrData, setDscrData] = useState<DscrData>(initialDscrData);
    const [buildData, setBuildData] = useState<BuildData>(initialBuildData);
    const [buildUnits, setBuildUnits] = useState<BuildUnitData[]>([
        { id: uuidv4(), strategy: 'LTR', ltr_rent: 2500, ltr_pmPct: 8, str_adr: 200, str_occ: 75, str_cohostPct: 15, str_platformPct: 3, str_suppliesMo: 150, str_clean: 120, str_cleaningCoveredByGuest: false, str_stays: 10 },
    ]);
    const [multiUnitData, setMultiUnitData] = useState<MultiUnitData>(initialMultiUnitData);
    const [multiUnits, setMultiUnits] = useState<MultiUnitItem[]>([
        { id: uuidv4(), rent: 1500 },
        { id: uuidv4(), rent: 1500 },
    ]);
    const [ltrRider, setLtrRider] = useState<NewConstructionRiderState>(clone(defaultNewConstructionRiderState));
    const [ltrSellerCredit, setLtrSellerCredit] = useState<SellerCreditState>(clone(defaultSellerCreditState));
    const [roomRider, setRoomRider] = useState<NewConstructionRiderState>(clone(defaultNewConstructionRiderState));
    const [roomSellerCredit, setRoomSellerCredit] = useState<SellerCreditState>(clone(defaultSellerCreditState));
    const [strRider, setStrRider] = useState<NewConstructionRiderState>(clone(defaultNewConstructionRiderState));
    const [strSellerCredit, setStrSellerCredit] = useState<SellerCreditState>(clone(defaultSellerCreditState));
    const [multiRider, setMultiRider] = useState<NewConstructionRiderState>(clone(defaultNewConstructionRiderState));
    const [multiSellerCredit, setMultiSellerCredit] = useState<SellerCreditState>(clone(defaultSellerCreditState));
    const [dscrRider, setDscrRider] = useState<NewConstructionRiderState>(clone(defaultNewConstructionRiderState));
    const [dscrSellerCredit, setDscrSellerCredit] = useState<SellerCreditState>(clone(defaultSellerCreditState));
    const [buildSellerCredit, setBuildSellerCredit] = useState<SellerCreditState>(clone(defaultSellerCreditState));
    const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysisEntry[]>([]);
    const [isRecentOpen, setIsRecentOpen] = useState(false);
    const [baselineHashes, setBaselineHashes] = useState<Record<CalculatorType, string> | null>(null);

    const genericHandler = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>) => (field: keyof T, value: string | number | boolean) => {
        setter(prev => {
            const newState = { ...prev };
            const purchase = (newState as any).purchase ?? (newState as any).arv ?? 0;
            const fieldStr = String(field);

            if (typeof value === 'boolean') {
                (newState as any)[fieldStr] = value;
                return newState;
            }

            if (textDataFields.has(fieldStr)) {
                (newState as any)[fieldStr] = value;
                return newState;
            }

            const numValue = roundTo(num(value), getNumericPrecision(fieldStr));

            if (fieldStr.includes('purchase') || fieldStr === 'arv') {
                (newState as any)[fieldStr] = numValue;
                if ((newState as any).downPct !== undefined) {
                    (newState as any).downAmt = round2(numValue * ((newState as any).downPct / 100));
                }
                if ((newState as any).taxRate !== undefined) {
                    (newState as any).taxYr = round2(numValue * ((newState as any).taxRate / 100));
                }
                 if ((newState as any).total_taxRate !== undefined) {
                    (newState as any).total_taxYr = round2(numValue * ((newState as any).total_taxRate / 100));
                }
            } else if (fieldStr.includes('downPct')) {
                (newState as any)[fieldStr] = numValue;
                (newState as any).downAmt = round2(purchase * (numValue / 100));
            } else if (fieldStr.includes('downAmt')) {
                (newState as any)[fieldStr] = numValue;
                (newState as any).downPct = purchase > 0 ? round2((numValue / purchase) * 100) : 0;
            } else if (fieldStr.includes('taxYr') || fieldStr.includes('total_taxYr')) {
                 (newState as any)[fieldStr] = numValue;
                 const rateField = fieldStr.includes('total_') ? 'total_taxRate' : 'taxRate';
                 if ((newState as any)[rateField] !== undefined) {
                    (newState as any)[rateField] = purchase > 0 ? round2((numValue / purchase) * 100) : 0;
                 }
            } else if (fieldStr.includes('taxRate') || fieldStr.includes('total_taxRate')) {
                (newState as any)[fieldStr] = numValue;
                const yrField = fieldStr.includes('total_') ? 'total_taxYr' : 'taxYr';
                if ((newState as any)[yrField] !== undefined) {
                    (newState as any)[yrField] = round2(purchase * (numValue / 100));
                }
            } else {
                (newState as any)[field] = numValue;
            }
            return newState;
        });
    };
    
    const genericCheckboxHandler = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>) => (field: keyof T, checked: boolean) => {
        setter(prev => ({ ...prev, [field]: checked }));
    };

    // LTR Handlers
    const handleLtrChange = genericHandler(setLtrData);
    const handleLtrCheckboxChange = genericCheckboxHandler(setLtrData);

    // Room Handlers
    const handleRoomChange = genericHandler(setRoomData);
    const handleRoomCheckboxChange = genericCheckboxHandler(setRoomData);
    const addRentalUnit = useCallback((type: 'Room' | 'ADU' | 'Unit', rent = 0) => {
        setRentalUnits(prev => [...prev, { id: uuidv4(), type, rent, ownerOccupied: false }]);
    }, []);
    const removeRentalUnit = useCallback((id: string) => {
        setRentalUnits(prev => prev.filter(u => u.id !== id));
    }, []);
    const updateRentalUnitRent = useCallback((id: string, rent: string) => {
        setRentalUnits(prev => prev.map(u => u.id === id ? { ...u, rent: round2(num(rent)) } : u));
    }, []);
    const setOwnerOccupiedUnit = useCallback((id: string) => {
        setRentalUnits(prev => prev.map(u => ({ ...u, ownerOccupied: u.id === id })));
    }, []);

    // STR Handlers
    const handleStrChange = genericHandler(setStrData);
    const handleStrCheckboxChange = genericCheckboxHandler(setStrData);

    // DSCR Handlers
    const handleDscrChange = useCallback((field: keyof DscrData, value: string | number) => {
        setDscrData(prev => {
            const newState = { ...prev };
            const purchase = newState.purchase;
            if (field === 'loanType' || field === 'armType' || field === 'propertyType') {
                (newState as any)[field] = value;
                return newState;
            }

            const numValue = roundTo(typeof value === 'string' ? num(value) : value, getNumericPrecision(String(field)));
            
            if (field === 'purchase') {
                newState.purchase = numValue;
                newState.downAmt = round2(numValue * (newState.downPct / 100));
                newState.taxYr = round2(numValue * (newState.taxRate / 100));
            } else if (field === 'downPct') {
                newState.downPct = numValue;
                newState.downAmt = round2(purchase * (numValue / 100));
            } else if (field === 'downAmt') {
                newState.downAmt = numValue;
                newState.downPct = purchase > 0 ? round2((numValue / purchase) * 100) : 0;
            } else if (field === 'taxYr') {
                newState.taxYr = numValue;
                newState.taxRate = purchase > 0 ? round2((numValue / purchase) * 100) : 0;
            } else if (field === 'taxRate') {
                newState.taxRate = numValue;
                newState.taxYr = round2(purchase * (numValue / 100));
            } else {
                (newState as any)[field] = numValue;
            }
            return newState;
        });
    }, []);
    const handleDscrCheckboxChange = genericCheckboxHandler(setDscrData);
    const handleDscrRadioChange = useCallback((field: keyof DscrData, value: 'LTR' | 'STR') => {
        setDscrData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Build Handlers
    const handleBuildChange = genericHandler(setBuildData);
    const handlePropTypeChange = useCallback((type: PropertyType) => {
        const unitCountMap: Record<PropertyType, number> = { SFH: 1, Townhome: 1, Condo: 1, Duplex: 2, Triplex: 3, Quadplex: 4 };
        const newUnitCount = unitCountMap[type];
        
        setBuildData(prev => ({ ...prev, propertyType: type }));
        
        setBuildUnits(prevUnits => {
            const currentCount = prevUnits.length;
            if (newUnitCount > currentCount) {
                const newUnits = Array.from({ length: newUnitCount - currentCount }, () => ({
                    ...(prevUnits[0] || initialBuildUnits[0]),
                    id: uuidv4(),
                }));
                return [...prevUnits, ...newUnits];
            } else if (newUnitCount < currentCount) {
                return prevUnits.slice(0, newUnitCount);
            }
            return prevUnits;
        });
    }, []);

    const initialBuildUnits = useMemo(() => [
        { id: uuidv4(), strategy: 'LTR' as UnitStrategy, ltr_rent: 2500, ltr_pmPct: 8, str_adr: 200, str_occ: 75, str_cohostPct: 15, str_platformPct: 3, str_suppliesMo: 150, str_clean: 120, str_cleaningCoveredByGuest: false, str_stays: 10 }
    ], []);

    const handleBuildUnitChange = useCallback((id: string, field: keyof BuildUnitData, value: string | number) => {
        const numValue = typeof value === 'string' ? num(value) : value;
        setBuildUnits(prev => {
            const newUnits = [...prev];
            const unitIndex = newUnits.findIndex(u => u.id === id);
            if (unitIndex === -1) return prev;

            const updatedUnit = { ...newUnits[unitIndex], [field]: numValue };
            newUnits[unitIndex] = updatedUnit;

            if (buildData.applyToAll && unitIndex === 0) {
                return newUnits.map((u, i) => i > 0 ? { ...u, [field]: numValue } : u);
            }
            return newUnits;
        });
    }, [buildData.applyToAll]);
    const handleBuildUnitCheckboxChange = useCallback((id: string, field: keyof BuildUnitData, checked: boolean) => {
         setBuildUnits(prev => {
            const newUnits = [...prev];
            const unitIndex = newUnits.findIndex(u => u.id === id);
            if (unitIndex === -1) return prev;

            const updatedUnit = { ...newUnits[unitIndex], [field]: checked };
            newUnits[unitIndex] = updatedUnit;

            if (buildData.applyToAll && unitIndex === 0) {
                return newUnits.map((u, i) => i > 0 ? { ...u, [field]: checked } : u);
            }
            return newUnits;
        });
    }, [buildData.applyToAll]);
    const handleBuildUnitStrategyChange = useCallback((id: string, strategy: UnitStrategy) => {
        setBuildUnits(prev => {
            const newUnits = [...prev];
            const unitIndex = newUnits.findIndex(u => u.id === id);
            if (unitIndex === -1) return prev;
            
            const updatedUnit = { ...newUnits[unitIndex], strategy };
            newUnits[unitIndex] = updatedUnit;

            if (buildData.applyToAll && unitIndex === 0) {
                return newUnits.map((u, i) => i > 0 ? { ...u, strategy } : u);
            }
            return newUnits;
        });
    }, [buildData.applyToAll]);
    const handleApplyAllChange = useCallback((checked: boolean) => {
        setBuildData(prev => ({...prev, applyToAll: checked}));
        if (checked) {
            setBuildUnits(prev => {
                const firstUnit = prev[0];
                if (!firstUnit) return prev;
                return prev.map(u => ({ ...firstUnit, id: u.id }));
            });
        }
    }, []);

    // Multi-Unit Handlers
    const handleMultiUnitChange = genericHandler(setMultiUnitData);
    const handleMultiUnitCheckboxChange = genericCheckboxHandler(setMultiUnitData);
    const addMultiUnit = useCallback(() => {
        setMultiUnits(prev => [...prev, { id: uuidv4(), rent: prev[prev.length-1]?.rent || 1500 }]);
    }, []);
    const removeMultiUnit = useCallback((id: string) => {
        setMultiUnits(prev => prev.length > 1 ? prev.filter(u => u.id !== id) : prev);
    }, []);
    const updateMultiUnitRent = useCallback((id: string, rent: string) => {
        setMultiUnits(prev => prev.map(u => u.id === id ? { ...u, rent: round2(num(rent)) } : u));
    }, []);

    const currentSnapshots = useMemo(() => ({
        ltr: { tab: 'ltr', data: ltrData, rider: ltrRider, sellerCredit: ltrSellerCredit } as RecentAnalysisSnapshot,
        room: { tab: 'room', data: roomData, rentalUnits, rider: roomRider, sellerCredit: roomSellerCredit } as RecentAnalysisSnapshot,
        str: { tab: 'str', data: strData, rider: strRider, sellerCredit: strSellerCredit } as RecentAnalysisSnapshot,
        multi: { tab: 'multi', data: multiUnitData, units: multiUnits, rider: multiRider, sellerCredit: multiSellerCredit } as RecentAnalysisSnapshot,
        build: { tab: 'build', data: buildData, units: buildUnits, sellerCredit: buildSellerCredit } as RecentAnalysisSnapshot,
        dscr: { tab: 'dscr', data: dscrData, rider: dscrRider, sellerCredit: dscrSellerCredit } as RecentAnalysisSnapshot
    }), [
        ltrData, ltrRider, ltrSellerCredit,
        roomData, rentalUnits, roomRider, roomSellerCredit,
        strData, strRider, strSellerCredit,
        multiUnitData, multiUnits, multiRider, multiSellerCredit,
        buildData, buildUnits, buildSellerCredit,
        dscrData, dscrRider, dscrSellerCredit
    ]);

    const currentHashes = useMemo(() => ({
        ltr: snapshotHash(currentSnapshots.ltr),
        room: snapshotHash(currentSnapshots.room),
        str: snapshotHash(currentSnapshots.str),
        multi: snapshotHash(currentSnapshots.multi),
        build: snapshotHash(currentSnapshots.build),
        dscr: snapshotHash(currentSnapshots.dscr)
    }), [currentSnapshots]);

    useEffect(() => {
        if (baselineHashes !== null) return;
        setBaselineHashes(currentHashes);
    }, [baselineHashes, currentHashes]);

    const isTabDirty = useCallback((tab: CalculatorType) => {
        if (!baselineHashes) return false;
        return currentHashes[tab] !== baselineHashes[tab];
    }, [baselineHashes, currentHashes]);

    // New Handlers for Export and Data Push
    const handleExportPdf = useCallback(async (sourceTab: CalculatorType, elementId: string, filename: string, actionsClass: string) => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Could not find element to export:', elementId);
            return false;
        }

        try {
            await exportElementToPdf({
                sourceElement: element,
                filename: `${filename}_${new Date().toISOString().slice(0, 10)}.pdf`,
                actionsClass
            });
            return true;
        } catch (error) {
            console.error('PDF export failed:', error);
            return false;
        }
    }, []);

    const handlePushData = useCallback((source: CalculatorType, destination: CalculatorType) => {
        let commonData: Partial<LtrData & StrData & RoomData & MultiUnitData> = {};

        switch (source) {
            case 'ltr':
                commonData = { ...ltrData };
                break;
            case 'room':
                commonData = { ...roomData, rent: rentalUnits.reduce((acc, u) => acc + u.rent, 0) };
                break;
            case 'str':
                commonData = { ...strData, rent: strData.adr * (30.44 * (strData.occ / 100)) };
                break;
            case 'multi':
                commonData = { ...multiUnitData, rent: multiUnits.reduce((acc, u) => acc + u.rent, 0) };
                break;
            case 'dscr':
                commonData = {
                    purchase: dscrData.purchase, downPct: dscrData.downPct, downAmt: dscrData.downAmt, cc: dscrData.cc, renovation: dscrData.renovation,
                    rate: dscrData.rate, term: dscrData.term, taxYr: dscrData.taxYr, taxRate: dscrData.taxRate, insMo: dscrData.insMo, hoa: dscrData.hoa,
                    utilities: dscrData.inv_utilities, maintPct: dscrData.inv_maintPct, capexPct: dscrData.inv_capexPct, pmPct: dscrData.inv_pmPct,
                    rent: dscrData.ltr_rent, adr: dscrData.str_adr, occ: dscrData.str_occ,
                    loanType: dscrData.loanType, armType: dscrData.armType, refiRate: dscrData.refiRate, payoffEnabled: dscrData.payoffEnabled,
                };
                break;
        }

        const { rent, adr, occ, ...baseData } = commonData;

        switch (destination) {
            case 'ltr':
                setLtrData(prev => ({ ...prev, ...baseData, rent: rent ?? prev.rent }));
                break;
            case 'room':
                setRoomData(prev => ({ ...prev, ...baseData, pmPct: baseData.pmPct ?? prev.pmPct }));
                break;
            case 'str':
                setStrData(prev => ({ ...prev, ...baseData, adr: adr ?? prev.adr, occ: occ ?? prev.occ }));
                break;
            case 'multi':
                setMultiUnitData(prev => ({ ...prev, ...baseData }));
                break;
            case 'dscr':
                setDscrData(prev => ({
                    ...prev, purchase: baseData.purchase ?? prev.purchase, downPct: baseData.downPct ?? prev.downPct, downAmt: baseData.downAmt ?? prev.downAmt,
                    cc: baseData.cc ?? prev.cc, renovation: baseData.renovation ?? prev.renovation, rate: baseData.rate ?? prev.rate, term: baseData.term ?? prev.term,
                    taxYr: baseData.taxYr ?? prev.taxYr, taxRate: baseData.taxRate ?? prev.taxRate, insMo: baseData.insMo ?? prev.insMo, hoa: baseData.hoa ?? prev.hoa,
                    ltr_rent: rent ?? prev.ltr_rent, str_adr: adr ?? prev.str_adr, str_occ: occ ?? prev.str_occ,
                    inv_utilities: baseData.utilities ?? prev.inv_utilities, inv_pmPct: baseData.pmPct ?? prev.inv_pmPct,
                    inv_maintPct: baseData.maintPct ?? prev.inv_maintPct, inv_capexPct: baseData.capexPct ?? prev.inv_capexPct,
                    loanType: baseData.loanType ?? prev.loanType, armType: baseData.armType ?? prev.armType,
                    refiRate: baseData.refiRate ?? prev.refiRate, payoffEnabled: baseData.payoffEnabled ?? prev.payoffEnabled,
                }));
                break;
        }
        setActiveTab(destination);
    }, [ltrData, roomData, strData, multiUnitData, dscrData, rentalUnits, multiUnits]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECENT_ANALYSES_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as RecentAnalysisEntry[];
            if (Array.isArray(parsed)) {
                setRecentAnalyses(parsed.slice(0, MAX_RECENT_ANALYSES));
            }
        } catch (error) {
            console.error('Failed to load recent analyses:', error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(RECENT_ANALYSES_KEY, JSON.stringify(recentAnalyses.slice(0, MAX_RECENT_ANALYSES)));
        } catch (error) {
            console.error('Failed to persist recent analyses:', error);
        }
    }, [recentAnalyses]);

    const getPurchasePriceForSnapshot = useCallback((snapshot: RecentAnalysisSnapshot): number | null => {
        switch (snapshot.tab) {
            case 'ltr':
            case 'room':
            case 'str':
            case 'multi':
            case 'dscr':
                return snapshot.data.purchase;
            case 'build':
                return snapshot.data.landAcquisition === 'owned'
                    ? snapshot.data.hardCosts + snapshot.data.softCosts + snapshot.data.buffer + snapshot.data.closingCosts
                    : snapshot.data.landCost + snapshot.data.hardCosts + snapshot.data.softCosts + snapshot.data.buffer + snapshot.data.closingCosts;
            default:
                return null;
        }
    }, []);

    const markTabClean = useCallback((tab: CalculatorType, hash: string) => {
        setBaselineHashes(prev => {
            if (!prev) return { ...currentHashes, [tab]: hash };
            return { ...prev, [tab]: hash };
        });
    }, [currentHashes]);

    const saveAnalysis = useCallback((tab: CalculatorType, title?: string) => {
        const snapshot = clone(currentSnapshots[tab]);
        const hash = currentHashes[tab];
        const entry: RecentAnalysisEntry = {
            id: uuidv4(),
            title: title?.trim() ? title.trim() : undefined,
            createdAt: new Date().toISOString(),
            tab,
            purchasePrice: getPurchasePriceForSnapshot(snapshot),
            snapshot
        };

        setRecentAnalyses(prev => [entry, ...prev].slice(0, MAX_RECENT_ANALYSES));
        markTabClean(tab, hash);
    }, [currentSnapshots, currentHashes, getPurchasePriceForSnapshot, markTabClean]);

    const saveIfDirty = useCallback((tab: CalculatorType, title?: string) => {
        if (!isTabDirty(tab)) return false;
        saveAnalysis(tab, title);
        return true;
    }, [isTabDirty, saveAnalysis]);

    const handleManualSave = useCallback((tab: CalculatorType) => {
        const title = window.prompt('Optional title for this analysis (leave blank for none):', '');
        if (title === null) return;
        saveIfDirty(tab, title);
    }, [saveIfDirty]);

    const loadRecentAnalysis = useCallback((entry: RecentAnalysisEntry) => {
        const snapshot = clone(entry.snapshot);

        switch (snapshot.tab) {
            case 'ltr':
                setLtrData({ ...initialLtrData, ...snapshot.data });
                setLtrRider(snapshot.rider);
                setLtrSellerCredit(snapshot.sellerCredit);
                break;
            case 'room':
                setRoomData({ ...initialRoomData, ...snapshot.data });
                setRentalUnits(snapshot.rentalUnits);
                setRoomRider(snapshot.rider);
                setRoomSellerCredit(snapshot.sellerCredit);
                break;
            case 'str':
                setStrData({ ...initialStrData, ...snapshot.data });
                setStrRider(snapshot.rider);
                setStrSellerCredit(snapshot.sellerCredit);
                break;
            case 'multi':
                setMultiUnitData({ ...initialMultiUnitData, ...snapshot.data });
                setMultiUnits(snapshot.units);
                setMultiRider(snapshot.rider);
                setMultiSellerCredit(snapshot.sellerCredit);
                break;
            case 'build':
                setBuildData({ ...initialBuildData, ...snapshot.data });
                setBuildUnits(snapshot.units);
                setBuildSellerCredit(snapshot.sellerCredit);
                break;
            case 'dscr':
                setDscrData({ ...initialDscrData, ...snapshot.data });
                setDscrRider(snapshot.rider);
                setDscrSellerCredit(snapshot.sellerCredit);
                break;
        }

        setActiveTab(snapshot.tab);
        setIsRecentOpen(false);

        const hash = snapshotHash(snapshot);
        markTabClean(snapshot.tab, hash);
    }, [markTabClean]);

    const handleExportWithAutosave = useCallback(async (tab: CalculatorType, elementId: string, filename: string, actionsClass: string) => {
        const ok = await handleExportPdf(tab, elementId, filename, actionsClass);
        if (!ok) return;
        saveIfDirty(tab);
    }, [handleExportPdf, saveIfDirty]);

    const handleDscrExportAutosave = useCallback(() => {
        saveIfDirty('dscr');
    }, [saveIfDirty]);


    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <div id="calculator-shell" className="min-h-screen flex flex-col">
            <Header onOpenRecent={() => setIsRecentOpen(true)} />
            <main className="container mx-auto p-4 flex-grow">
                <nav className="flex justify-center items-center mb-6 bg-white rounded-full shadow-md p-1 overflow-x-auto">
                    <Tab active={activeTab === 'ltr'} onClick={() => setActiveTab('ltr')}>LTR</Tab>
                    <Tab active={activeTab === 'room'} onClick={() => setActiveTab('room')}>By-the-Room</Tab>
                    <Tab active={activeTab === 'str'} onClick={() => setActiveTab('str')}>STR</Tab>
                    <Tab active={activeTab === 'multi'} onClick={() => setActiveTab('multi')}>Multi-Unit</Tab>
                    <Tab active={activeTab === 'build'} onClick={() => setActiveTab('build')}>New Build</Tab>
                    <Tab active={activeTab === 'dscr'} onClick={() => setActiveTab('dscr')}>DSCR Loan</Tab>
                </nav>

                <div className={activeTab === 'ltr' ? '' : 'hidden'}>
                    <LtrCalculator
                        data={ltrData}
                        rider={ltrRider}
                        sellerCredit={ltrSellerCredit}
                        onRiderChange={setLtrRider}
                        onSellerCreditChange={setLtrSellerCredit}
                        onChange={handleLtrChange}
                        onCheckboxChange={handleLtrCheckboxChange}
                        onPushData={handlePushData}
                        onExportPdf={(elementId, filename, actionsClass) => handleExportWithAutosave('ltr', elementId, filename, actionsClass)}
                        showSaveButton={isTabDirty('ltr')}
                        onSave={() => handleManualSave('ltr')}
                    />
                </div>
                <div className={activeTab === 'room' ? '' : 'hidden'}>
                    <RoomCalculator 
                        data={roomData}
                        rider={roomRider}
                        sellerCredit={roomSellerCredit}
                        onRiderChange={setRoomRider}
                        onSellerCreditChange={setRoomSellerCredit}
                        onChange={handleRoomChange} 
                        onCheckboxChange={handleRoomCheckboxChange}
                        rentalUnits={rentalUnits}
                        addRentalUnit={addRentalUnit}
                        removeRentalUnit={removeRentalUnit}
                        updateRentalUnitRent={updateRentalUnitRent}
                        setOwnerOccupiedUnit={setOwnerOccupiedUnit}
                        onPushData={handlePushData}
                        onExportPdf={(elementId, filename, actionsClass) => handleExportWithAutosave('room', elementId, filename, actionsClass)}
                        showSaveButton={isTabDirty('room')}
                        onSave={() => handleManualSave('room')}
                    />
                </div>
                 <div className={activeTab === 'str' ? '' : 'hidden'}>
                    <StrCalculator
                        data={strData}
                        rider={strRider}
                        sellerCredit={strSellerCredit}
                        onRiderChange={setStrRider}
                        onSellerCreditChange={setStrSellerCredit}
                        onChange={handleStrChange}
                        onCheckboxChange={handleStrCheckboxChange}
                        onPushData={handlePushData}
                        onExportPdf={(elementId, filename, actionsClass) => handleExportWithAutosave('str', elementId, filename, actionsClass)}
                        showSaveButton={isTabDirty('str')}
                        onSave={() => handleManualSave('str')}
                    />
                </div>
                 <div className={activeTab === 'multi' ? '' : 'hidden'}>
                    <MultiUnitCalculator 
                        data={multiUnitData}
                        units={multiUnits}
                        rider={multiRider}
                        sellerCredit={multiSellerCredit}
                        onRiderChange={setMultiRider}
                        onSellerCreditChange={setMultiSellerCredit}
                        onChange={handleMultiUnitChange}
                        onCheckboxChange={handleMultiUnitCheckboxChange}
                        addUnit={addMultiUnit}
                        removeUnit={removeMultiUnit}
                        updateUnitRent={updateMultiUnitRent}
                        onPushData={handlePushData}
                        onExportPdf={(elementId, filename, actionsClass) => handleExportWithAutosave('multi', elementId, filename, actionsClass)}
                        showSaveButton={isTabDirty('multi')}
                        onSave={() => handleManualSave('multi')}
                    />
                </div>
                <div className={activeTab === 'build' ? '' : 'hidden'}>
                    <BuildCalculator 
                        data={buildData}
                        units={buildUnits}
                        sellerCredit={buildSellerCredit}
                        onSellerCreditChange={setBuildSellerCredit}
                        onDataChange={handleBuildChange}
                        onPropTypeChange={handlePropTypeChange}
                        onUnitChange={handleBuildUnitChange}
                        onUnitCheckboxChange={handleBuildUnitCheckboxChange}
                        onUnitStrategyChange={handleBuildUnitStrategyChange}
                        onApplyAllChange={handleApplyAllChange}
                        onPushData={handlePushData}
                        onExportPdf={(elementId, filename, actionsClass) => handleExportWithAutosave('build', elementId, filename, actionsClass)}
                        showSaveButton={isTabDirty('build')}
                        onSave={() => handleManualSave('build')}
                    />
                </div>
                 <div className={activeTab === 'dscr' ? '' : 'hidden'}>
                    <DscrCalculator 
                        data={dscrData} 
                        rider={dscrRider}
                        sellerCredit={dscrSellerCredit}
                        onRiderChange={setDscrRider}
                        onSellerCreditChange={setDscrSellerCredit}
                        onChange={handleDscrChange} 
                        onCheckboxChange={handleDscrCheckboxChange}
                        onRadioChange={handleDscrRadioChange}
                        onPushData={handlePushData}
                        showSaveButton={isTabDirty('dscr')}
                        onSave={() => handleManualSave('dscr')}
                        onExportAutoSave={handleDscrExportAutosave}
                    />
                </div>
            </main>
            <div className={`fixed inset-0 z-40 ${isRecentOpen ? '' : 'pointer-events-none'}`}>
                <div
                    className={`absolute inset-0 bg-black/30 transition-opacity ${isRecentOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsRecentOpen(false)}
                />
                <aside className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ${isRecentOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="font-bold text-lg text-slate-800">Recent Analyses</h2>
                        <button className="text-slate-600 hover:text-slate-800" onClick={() => setIsRecentOpen(false)}>Close</button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-64px)]">
                        {recentAnalyses.length === 0 ? (
                            <p className="text-sm text-slate-500">No saved analyses yet.</p>
                        ) : (
                            recentAnalyses.map(entry => (
                                <button
                                    key={entry.id}
                                    className="w-full text-left border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors"
                                    onClick={() => loadRecentAnalysis(entry)}
                                >
                                    <div className="text-xs text-slate-500">{formatRecentDate(entry.createdAt)}</div>
                                    <div className="font-semibold text-slate-800">{entry.title || 'Untitled Analysis'}</div>
                                    <div className="text-sm text-slate-700">{getTabLabel(entry.tab)}</div>
                                    <div className="text-sm text-slate-700">
                                        Purchase: {entry.purchasePrice !== null ? entry.purchasePrice.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'N/A'}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>
            </div>
            <Footer />
            </div>
            <InvestorLeadGate />
        </div>
    );
};

export default App;
