export type SoraTenor = '1M' | '3M' | '6M' | 'DAILY';

export interface MasDailyRate {
  date: string; // YYYY-MM-DD
  sora: number; // Daily SORA rate % (e.g., 3.4520)
  compounded1M: number; // 1-Month Compounded SORA %
  compounded3M: number; // 3-Month Compounded SORA %
  compounded6M: number; // 6-Month Compounded SORA %
  soraIndex: number; // MAS SORA Index
  aggregateVolume?: number; // Aggregate volume in SGD millions
  dayCountWeight?: number; // e.g., 1 for weekday, 3 for Friday->Monday
}

export interface LoanParams {
  loanAmount: number;
  tenureYears: number;
  benchmarkTenor: '1M' | '3M' | '6M';
  customBenchmarkRate?: number; // Override if user wants to stress test
  bankSpreadYear1: number; // e.g. 0.65 for +0.65%
  bankSpreadYear2: number;
  bankSpreadYear3: number;
  bankSpreadThereafter: number;
  isSteppedSpread: boolean;
  flatSpread: number;
  repaymentType: 'amortization' | 'interest-only';
  startDate: string;
}

export interface PaymentScheduleItem {
  month: number;
  year: number;
  date: string;
  soraRate: number;
  spread: number;
  allInRate: number;
  monthlyPayment: number;
  principalPayment: number;
  interestPayment: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface LoanCalculationResult {
  initialMonthlyPayment: number;
  currentAllInRate: number;
  benchmarkRate: number;
  currentSpread: number;
  totalRepayment: number;
  totalInterest: number;
  totalPrincipal: number;
  stressTestPayment: number; // At MAS 4.0% stress rate
  stressTestAllInRate: number;
  schedule: PaymentScheduleItem[];
  yearlySummary: {
    year: number;
    annualPayment: number;
    annualPrincipal: number;
    annualInterest: number;
    endingBalance: number;
  }[];
}

export interface BankPackagePreset {
  id: string;
  bankName: string;
  name: string;
  tenor: '1M' | '3M' | '6M' | 'FIXED';
  lockInYears: number;
  spreadYear1: number;
  spreadYear2: number;
  spreadYear3: number;
  spreadThereafter: number;
  fixedRate?: number;
  features: string[];
  recommended?: boolean;
}

export interface BackendConfig {
  mode: 'built-in' | 'mas-direct' | 'custom-backend';
  customApiUrl: string;
  apiKey?: string;
  status: 'connected' | 'offline' | 'fallback';
  lastSyncTime?: string;
}
