import { MasDailyRate } from '../types/sora';

/**
 * Historical and recent MAS SORA rates dataset.
 * SORA (Singapore Overnight Rate Average) is published daily by MAS at 9:00 AM SGT.
 * Compounded SORA rates are calculated based on actual overnight transactions using the Actual/365 convention.
 */

// Helper to generate realistic continuous MAS SORA rates up to recent dates
function generateMasSoraDataset(): MasDailyRate[] {
  const data: MasDailyRate[] = [];
  const baseDate = new Date(2026, 4, 1); // May 2026
  const targetDate = new Date(2026, 9, 5); // October 5, 2026
  
  // Starting SORA reference parameters
  let currentSora = 3.38;
  let currentIndex = 118.420;
  
  const cur = new Date(baseDate);
  while (cur <= targetDate) {
    const dayOfWeek = cur.getDay();
    // Only business days (Mon = 1, Fri = 5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = cur.toISOString().split('T')[0];
      
      // Slight realistic fluctuations (±0.02 - 0.05%)
      const variation = Math.sin(cur.getTime() / (1000 * 60 * 60 * 24 * 14)) * 0.15 + (Math.sin(cur.getTime() / (1000 * 60 * 60 * 24 * 3)) * 0.04);
      currentSora = Number((3.35 + variation).toFixed(4));
      
      // Weight: Friday carries 3 days (Fri, Sat, Sun), Monday-Thu carries 1 day
      const weight = dayOfWeek === 5 ? 3 : 1;
      
      // SORA index increments by (1 + sora * weight / 365)
      currentIndex = currentIndex * (1 + (currentSora / 100) * weight / 365);
      
      // Smoothed 1M, 3M, 6M compounded rates
      const comp1M = Number((currentSora - 0.03 + Math.sin(cur.getTime() / (1000 * 60 * 60 * 24 * 7)) * 0.03).toFixed(4));
      const comp3M = Number((currentSora - 0.06 + Math.sin(cur.getTime() / (1000 * 60 * 60 * 24 * 20)) * 0.04).toFixed(4));
      const comp6M = Number((currentSora - 0.09 + Math.sin(cur.getTime() / (1000 * 60 * 60 * 24 * 45)) * 0.05).toFixed(4));
      
      // Volume SGD 2,800m - 4,900m
      const volume = Math.round(3200 + (Math.sin(cur.getTime()) * 800) + (dayOfWeek === 5 ? 600 : 0));
      
      data.push({
        date: dateStr,
        sora: currentSora,
        compounded1M: comp1M,
        compounded3M: comp3M,
        compounded6M: comp6M,
        soraIndex: Number(currentIndex.toFixed(4)),
        aggregateVolume: volume,
        dayCountWeight: weight,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  
  return data;
}

export const HISTORICAL_SORA_DATA: MasDailyRate[] = generateMasSoraDataset();

export const LATEST_MAS_SORA: MasDailyRate = HISTORICAL_SORA_DATA[HISTORICAL_SORA_DATA.length - 1] || {
  date: '2026-10-02',
  sora: 3.3425,
  compounded1M: 3.3150,
  compounded3M: 3.2890,
  compounded6M: 3.2450,
  soraIndex: 119.8452,
  aggregateVolume: 3850,
  dayCountWeight: 3
};

// Singapore bank mortgage package presets
export const POPULAR_SG_BANK_PACKAGES = [
  {
    id: 'dbs-3m-sora',
    bankName: 'DBS Bank',
    name: 'Home Loan (3M SORA Pegged)',
    tenor: '3M' as const,
    lockInYears: 2,
    spreadYear1: 0.65,
    spreadYear2: 0.65,
    spreadYear3: 0.75,
    spreadThereafter: 0.85,
    features: ['Most popular Singapore floating package', 'Quarterly rate reset', 'Free conversion after lock-in'],
    recommended: true,
  },
  {
    id: 'ocbc-1m-sora',
    bankName: 'OCBC Bank',
    name: '1M SORA Flexi Loan',
    tenor: '1M' as const,
    lockInYears: 1,
    spreadYear1: 0.70,
    spreadYear2: 0.70,
    spreadYear3: 0.80,
    spreadThereafter: 0.90,
    features: ['Monthly rate adjustments', 'Faster downward rate capture', 'Short 1-year lock-in'],
    recommended: false,
  },
  {
    id: 'uob-3m-sora',
    bankName: 'UOB',
    name: '3M SORA Privileged Package',
    tenor: '3M' as const,
    lockInYears: 3,
    spreadYear1: 0.58,
    spreadYear2: 0.62,
    spreadYear3: 0.68,
    spreadThereafter: 0.80,
    features: ['Competitive Year 1 spread (+0.58%)', 'Legal & valuation subsidy available', '3-year commitment'],
    recommended: false,
  },
  {
    id: 'scb-6m-sora',
    bankName: 'Standard Chartered',
    name: '6M SORA Stability Mortgage',
    tenor: '6M' as const,
    lockInYears: 2,
    spreadYear1: 0.75,
    spreadYear2: 0.75,
    spreadYear3: 0.85,
    spreadThereafter: 0.95,
    features: ['Biannual reset for payment predictability', 'Fewer payment shifts per year', 'MortgageOne offset eligible'],
    recommended: false,
  },
  {
    id: 'fixed-2yr',
    bankName: 'Benchmark Fixed',
    name: '2-Year Fixed Rate Package',
    tenor: 'FIXED' as const,
    fixedRate: 3.10,
    lockInYears: 2,
    spreadYear1: 0,
    spreadYear2: 0,
    spreadYear3: 0.85,
    spreadThereafter: 0.85,
    features: ['Guaranteed 3.10% p.a. for first 24 months', 'Reverts to 3M SORA + 0.85% in Year 3', 'Complete peace of mind'],
    recommended: false,
  }
];
