import { LoanParams, LoanCalculationResult, PaymentScheduleItem, MasDailyRate } from '../types/sora';

/**
 * Calculates official MAS compounded SORA rate over a collection of daily rates.
 * Formula: [ Product_{i=1}^{d_b} (1 + (r_i * n_i / 365)) - 1 ] * (365 / d) * 100
 * @param dailyRates List of daily rates with date, sora rate (in %), and dayCountWeight (n_i)
 * @returns Compounded SORA rate annualized as percentage (e.g. 3.2854)
 */
export function calculateMasCompoundedSora(
  dailyRates: { sora: number; dayCountWeight: number }[]
): { compoundedRate: number; totalDays: number; compoundingFactor: number } {
  if (!dailyRates || dailyRates.length === 0) {
    return { compoundedRate: 0, totalDays: 0, compoundingFactor: 1 };
  }

  let product = 1;
  let totalCalendarDays = 0;

  for (const item of dailyRates) {
    const r = item.sora / 100; // convert percentage to decimal
    const n = item.dayCountWeight || 1;
    product *= (1 + (r * n) / 365);
    totalCalendarDays += n;
  }

  if (totalCalendarDays === 0) {
    return { compoundedRate: 0, totalDays: 0, compoundingFactor: 1 };
  }

  const annualizedRate = (product - 1) * (365 / totalCalendarDays) * 100;
  return {
    compoundedRate: Number(annualizedRate.toFixed(4)),
    totalDays: totalCalendarDays,
    compoundingFactor: Number(product.toFixed(8)),
  };
}

/**
 * Monthly mortgage payment for amortized loan
 */
export function calculateMonthlyPayment(principal: number, annualRatePct: number, remainingMonths: number): number {
  if (remainingMonths <= 0 || principal <= 0) return 0;
  if (annualRatePct <= 0) return principal / remainingMonths;

  const monthlyRate = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, remainingMonths);
  const payment = (principal * monthlyRate * factor) / (factor - 1);
  return payment;
}

/**
 * Generates complete loan amortization schedule with stepped spreads,
 * interest and principal split, and MAS stress test comparison.
 */
export function calculateLoanSchedule(
  params: LoanParams,
  currentSoraRates: { '1M': number; '3M': number; '6M': number }
): LoanCalculationResult {
  const {
    loanAmount,
    tenureYears,
    benchmarkTenor,
    customBenchmarkRate,
    bankSpreadYear1,
    bankSpreadYear2,
    bankSpreadYear3,
    bankSpreadThereafter,
    isSteppedSpread,
    flatSpread,
    repaymentType,
    startDate,
  } = params;

  const benchmarkRate = customBenchmarkRate !== undefined 
    ? customBenchmarkRate 
    : currentSoraRates[benchmarkTenor] || 3.30;

  const totalMonths = tenureYears * 12;
  const schedule: PaymentScheduleItem[] = [];

  let currentBalance = loanAmount;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  const start = new Date(startDate || '2026-10-01');

  // Calculate year 1 rate for initial monthly payment
  const initialSpread = isSteppedSpread ? bankSpreadYear1 : flatSpread;
  const initialAllInRate = benchmarkRate + initialSpread;

  const initialMonthlyPayment = repaymentType === 'interest-only'
    ? (loanAmount * (initialAllInRate / 100)) / 12
    : calculateMonthlyPayment(loanAmount, initialAllInRate, totalMonths);

  const yearlyMap = new Map<number, { annualPayment: number; annualPrincipal: number; annualInterest: number; endingBalance: number }>();

  for (let m = 1; m <= totalMonths; m++) {
    const currentYear = Math.ceil(m / 12);
    const monthsRemaining = totalMonths - m + 1;

    // Determine spread for current year
    let activeSpread = flatSpread;
    if (isSteppedSpread) {
      if (currentYear === 1) activeSpread = bankSpreadYear1;
      else if (currentYear === 2) activeSpread = bankSpreadYear2;
      else if (currentYear === 3) activeSpread = bankSpreadYear3;
      else activeSpread = bankSpreadThereafter;
    }

    const allInRate = benchmarkRate + activeSpread;
    const monthlyRate = allInRate / 100 / 12;

    const interestForMonth = currentBalance * monthlyRate;
    let paymentForMonth = 0;
    let principalForMonth = 0;

    if (repaymentType === 'interest-only') {
      paymentForMonth = interestForMonth;
      principalForMonth = 0;
    } else {
      // Recompute payment for remaining balance & tenure (stepped rate behavior)
      paymentForMonth = calculateMonthlyPayment(currentBalance, allInRate, monthsRemaining);
      principalForMonth = Math.min(paymentForMonth - interestForMonth, currentBalance);
      // Final month adjustment
      if (m === totalMonths) {
        principalForMonth = currentBalance;
        paymentForMonth = principalForMonth + interestForMonth;
      }
    }

    currentBalance = Math.max(0, currentBalance - principalForMonth);
    cumulativeInterest += interestForMonth;
    cumulativePrincipal += principalForMonth;

    const paymentDate = new Date(start);
    paymentDate.setMonth(paymentDate.getMonth() + m - 1);
    const dateFormatted = paymentDate.toISOString().split('T')[0];

    schedule.push({
      month: m,
      year: currentYear,
      date: dateFormatted,
      soraRate: benchmarkRate,
      spread: activeSpread,
      allInRate: Number(allInRate.toFixed(4)),
      monthlyPayment: Number(paymentForMonth.toFixed(2)),
      principalPayment: Number(principalForMonth.toFixed(2)),
      interestPayment: Number(interestForMonth.toFixed(2)),
      endingBalance: Number(currentBalance.toFixed(2)),
      cumulativeInterest: Number(cumulativeInterest.toFixed(2)),
      cumulativePrincipal: Number(cumulativePrincipal.toFixed(2)),
    });

    // Aggregate by year
    if (!yearlyMap.has(currentYear)) {
      yearlyMap.set(currentYear, {
        annualPayment: 0,
        annualPrincipal: 0,
        annualInterest: 0,
        endingBalance: 0,
      });
    }
    const yRecord = yearlyMap.get(currentYear)!;
    yRecord.annualPayment += paymentForMonth;
    yRecord.annualPrincipal += principalForMonth;
    yRecord.annualInterest += interestForMonth;
    yRecord.endingBalance = currentBalance;
  }

  const yearlySummary = Array.from(yearlyMap.entries()).map(([year, val]) => ({
    year,
    annualPayment: Number(val.annualPayment.toFixed(2)),
    annualPrincipal: Number(val.annualPrincipal.toFixed(2)),
    annualInterest: Number(val.annualInterest.toFixed(2)),
    endingBalance: Number(val.endingBalance.toFixed(2)),
  }));

  // MAS 4.0% Medium-Term Stress Rate (Notice 645 for Residential Properties)
  const MAS_STRESS_RATE = 4.00;
  const stressTestPayment = calculateMonthlyPayment(loanAmount, MAS_STRESS_RATE, totalMonths);

  return {
    initialMonthlyPayment: Number(initialMonthlyPayment.toFixed(2)),
    currentAllInRate: Number(initialAllInRate.toFixed(4)),
    benchmarkRate: Number(benchmarkRate.toFixed(4)),
    currentSpread: Number(initialSpread.toFixed(4)),
    totalRepayment: Number((cumulativePrincipal + cumulativeInterest).toFixed(2)),
    totalInterest: Number(cumulativeInterest.toFixed(2)),
    totalPrincipal: Number(cumulativePrincipal.toFixed(2)),
    stressTestPayment: Number(stressTestPayment.toFixed(2)),
    stressTestAllInRate: MAS_STRESS_RATE,
    schedule,
    yearlySummary,
  };
}

/**
 * Format currency in Singapore Dollars (SGD)
 */
export function formatSGD(amount: number, includeDecimals = true): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format percentage rate
 */
export function formatPercent(rate: number, decimals = 2): string {
  return `${rate.toFixed(decimals)}%`;
}
