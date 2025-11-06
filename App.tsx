import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header';
import LtrCalculator from './components/LtrCalculator';
import RoomCalculator from './components/RoomCalculator';
import StrCalculator from './components/StrCalculator';
import DscrCalculator from './components/DscrCalculator';
import BuildCalculator from './components/BuildCalculator';
import MultiUnitCalculator from './components/MultiUnitCalculator';
import { num } from './utils/calculators';

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
}

export type PropertyType = 'SFH' | 'Townhome' | 'Condo' | 'Duplex' | 'Triplex' | 'Quadplex';
export type LandAcquisition = 'cash' | 'finance' | 'owned';
export type UnitStrategy = 'LTR' | 'STR';

export interface BuildData {
    propertyType: PropertyType;
    landAcquisition: LandAcquisition;
    landCost: number;
    hardCosts: number;
    softCosts: number;
    buffer: number;
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
    pmPct: 8, maintPct: 5, capexPct: 5,
};

const initialRoomData: RoomData = {
    purchase: 450000, downPct: 5, downAmt: 22500, cc: 13500, renoFinanced: false, renovation: 20000,
    rate: 6.0, term: 30, taxYr: 5400, taxRate: 1.2, insMo: 150, hoa: 50, utilities: 400,
    pmPct: 0, maintPct: 5, capexPct: 5,
};

const initialStrData: StrData = {
    purchase: 400000, downPct: 25, downAmt: 100000, cc: 12000, renoFinanced: false, renovation: 25000, staging: 15000,
    rate: 7.0, term: 30, adr: 250, occ: 75, taxYr: 4800, taxRate: 1.2, insMo: 200, hoa: 100, utilities: 500,
    suppliesMo: 150, cohostPct: 15, platformPct: 3, maintPct: 5, capexPct: 5, clean: 150, stays: 8,
};

const initialDscrData: DscrData = {
    propertyType: 'LTR', purchase: 500000, downPct: 25, downAmt: 125000, cc: 15000, rate: 7.5, term: 30, renovation: 0, renoFinancedHM: false, hm_rate: 12, hm_term: 1,
    ltr_rent: 4000, str_adr: 300, str_occ: 70, taxYr: 6000, taxRate: 1.2, insMo: 175, hoa: 0, stress_vacancy: 5, stress_rate: 9.5, min_dscr: 1.0,
    inv_pmPct: 8, inv_maintPct: 5, inv_capexPct: 5, inv_utilities: 0, inv_platformPct: 3, inv_suppliesMo: 150, inv_clean: 150, inv_stays: 8,
};

const initialBuildData: BuildData = {
    propertyType: 'SFH', landAcquisition: 'cash', landCost: 100000, hardCosts: 400000, softCosts: 50000, buffer: 50000, construction_ltc: 80, construction_rate: 9.5, construction_term: 12,
    arv: 750000, refi_ltv: 75, refi_rate: 6.8, refi_term: 30, total_taxYr: 9000, total_taxRate: 1.2, total_insYr: 2100, maintPct: 5, capexPct: 5, total_hoa: 0, total_utilities: 0, applyToAll: false,
};

const initialMultiUnitData: MultiUnitData = {
    purchase: 600000, downPct: 25, downAmt: 150000, cc: 18000, renoFinanced: false, renovation: 30000,
    rate: 7.2, term: 30, taxYr: 7200, taxRate: 1.2, insMo: 250, hoa: 0, utilities: 0,
    pmPct: 8, maintPct: 5, capexPct: 5,
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

    const genericHandler = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (field: keyof T, value: string) => {
        setter(prev => {
            const newState = { ...prev };
            const purchase = (newState as any).purchase ?? (newState as any).arv ?? 0;
            const numValue = num(value);
            const fieldStr = String(field);

            if (fieldStr.includes('purchase') || fieldStr === 'arv') {
                (newState as any)[fieldStr] = numValue;
                if ((newState as any).downPct !== undefined) {
                    (newState as any).downAmt = numValue * ((newState as any).downPct / 100);
                }
                if ((newState as any).taxRate !== undefined) {
                    (newState as any).taxYr = numValue * ((newState as any).taxRate / 100);
                }
                 if ((newState as any).total_taxRate !== undefined) {
                    (newState as any).total_taxYr = numValue * ((newState as any).total_taxRate / 100);
                }
            } else if (fieldStr.includes('downPct')) {
                (newState as any)[fieldStr] = numValue;
                (newState as any).downAmt = purchase * (numValue / 100);
            } else if (fieldStr.includes('downAmt')) {
                (newState as any)[fieldStr] = numValue;
                (newState as any).downPct = purchase > 0 ? (numValue / purchase) * 100 : 0;
            } else if (fieldStr.includes('taxYr') || fieldStr.includes('total_taxYr')) {
                 (newState as any)[fieldStr] = numValue;
                 const rateField = fieldStr.includes('total_') ? 'total_taxRate' : 'taxRate';
                 if ((newState as any)[rateField] !== undefined) {
                    (newState as any)[rateField] = purchase > 0 ? (numValue / purchase) * 100 : 0;
                 }
            } else if (fieldStr.includes('taxRate') || fieldStr.includes('total_taxRate')) {
                (newState as any)[fieldStr] = numValue;
                const yrField = fieldStr.includes('total_') ? 'total_taxYr' : 'taxYr';
                if ((newState as any)[yrField] !== undefined) {
                    (newState as any)[yrField] = purchase * (numValue / 100);
                }
            } else {
                (newState as any)[field] = numValue;
            }
            return newState;
        });
    };
    
    const genericCheckboxHandler = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (field: keyof T, checked: boolean) => {
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
        setRentalUnits(prev => prev.map(u => u.id === id ? { ...u, rent: num(rent) } : u));
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
            const numValue = typeof value === 'string' ? num(value) : value;
            
            if (field === 'purchase') {
                newState.purchase = numValue;
                newState.downAmt = numValue * (newState.downPct / 100);
                newState.taxYr = numValue * (newState.taxRate / 100);
            } else if (field === 'downPct') {
                newState.downPct = numValue;
                newState.downAmt = purchase * (numValue / 100);
            } else if (field === 'downAmt') {
                newState.downAmt = numValue;
                newState.downPct = purchase > 0 ? (numValue / purchase) * 100 : 0;
            } else if (field === 'taxYr') {
                newState.taxYr = numValue;
                newState.taxRate = purchase > 0 ? (numValue / purchase) * 100 : 0;
            } else if (field === 'taxRate') {
                newState.taxRate = numValue;
                newState.taxYr = purchase * (numValue / 100);
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
        setMultiUnits(prev => prev.map(u => u.id === id ? { ...u, rent: num(rent) } : u));
    }, []);

    return (
        <div className="bg-slate-100 min-h-screen">
            <Header />
            <main className="container mx-auto p-4">
                <nav className="flex justify-center items-center mb-6 bg-white rounded-full shadow-md p-1 overflow-x-auto">
                    <Tab active={activeTab === 'ltr'} onClick={() => setActiveTab('ltr')}>LTR</Tab>
                    <Tab active={activeTab === 'room'} onClick={() => setActiveTab('room')}>By-the-Room</Tab>
                    <Tab active={activeTab === 'str'} onClick={() => setActiveTab('str')}>STR</Tab>
                    <Tab active={activeTab === 'multi'} onClick={() => setActiveTab('multi')}>Multi-Unit</Tab>
                    <Tab active={activeTab === 'build'} onClick={() => setActiveTab('build')}>New Build</Tab>
                    <Tab active={activeTab === 'dscr'} onClick={() => setActiveTab('dscr')}>DSCR Loan</Tab>
                </nav>

                <div className={activeTab === 'ltr' ? '' : 'hidden'}>
                    <LtrCalculator data={ltrData} onChange={handleLtrChange} onCheckboxChange={handleLtrCheckboxChange} />
                </div>
                <div className={activeTab === 'room' ? '' : 'hidden'}>
                    <RoomCalculator 
                        data={roomData}
                        onChange={handleRoomChange} 
                        onCheckboxChange={handleRoomCheckboxChange}
                        rentalUnits={rentalUnits}
                        addRentalUnit={addRentalUnit}
                        removeRentalUnit={removeRentalUnit}
                        updateRentalUnitRent={updateRentalUnitRent}
                        setOwnerOccupiedUnit={setOwnerOccupiedUnit}
                    />
                </div>
                 <div className={activeTab === 'str' ? '' : 'hidden'}>
                    <StrCalculator data={strData} onChange={handleStrChange} onCheckboxChange={handleStrCheckboxChange} />
                </div>
                 <div className={activeTab === 'multi' ? '' : 'hidden'}>
                    <MultiUnitCalculator 
                        data={multiUnitData}
                        units={multiUnits}
                        onChange={handleMultiUnitChange}
                        onCheckboxChange={handleMultiUnitCheckboxChange}
                        addUnit={addMultiUnit}
                        removeUnit={removeMultiUnit}
                        updateUnitRent={updateMultiUnitRent}
                    />
                </div>
                <div className={activeTab === 'build' ? '' : 'hidden'}>
                    <BuildCalculator 
                        data={buildData}
                        units={buildUnits}
                        onDataChange={handleBuildChange}
                        onPropTypeChange={handlePropTypeChange}
                        onUnitChange={handleBuildUnitChange}
                        onUnitCheckboxChange={handleBuildUnitCheckboxChange}
                        onUnitStrategyChange={handleBuildUnitStrategyChange}
                        onApplyAllChange={handleApplyAllChange}
                    />
                </div>
                 <div className={activeTab === 'dscr' ? '' : 'hidden'}>
                    <DscrCalculator 
                        data={dscrData} 
                        onChange={handleDscrChange} 
                        onCheckboxChange={handleDscrCheckboxChange}
                        onRadioChange={handleDscrRadioChange}
                    />
                </div>
            </main>
        </div>
    );
};

export default App;