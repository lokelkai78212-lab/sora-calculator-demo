import React, { useState, useMemo } from 'react';
import { MasDailyRate } from '../types/sora';
import { POPULAR_SG_BANK_PACKAGES } from '../data/historicalSora';
import { calculateLoanSchedule, formatSGD, formatPercent } from '../utils/soraMath';
import { Award, Check, ShieldCheck, Zap, Sparkles } from 'lucide-react';

interface Props {
  latestRate: MasDailyRate;
}

export const PackageComparison: React.FC<Props> = ({ latestRate }) => {
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [tenureYears, setTenureYears] = useState<number>(25);

  const currentSoraRates = useMemo(() => {
    return {
      '1M': latestRate.compounded1M,
      '3M': latestRate.compounded3M,
      '6M': latestRate.compounded6M,
    };
  }, [latestRate]);

  // Compute metrics for each package
  const packagesWithCalculations = useMemo(() => {
    return POPULAR_SG_BANK_PACKAGES.map((pkg) => {
      let benchmarkRate = 0;
      if (pkg.tenor === 'FIXED') {
        benchmarkRate = pkg.fixedRate || 3.10;
      } else {
        benchmarkRate = currentSoraRates[pkg.tenor];
      }

      // If fixed, year 1 and 2 spread is 0, base rate is the fixed rate
      const isFixed = pkg.tenor === 'FIXED';
      const year1Rate = isFixed ? (pkg.fixedRate || 3.10) : benchmarkRate + pkg.spreadYear1;
      const year2Rate = isFixed ? (pkg.fixedRate || 3.10) : benchmarkRate + pkg.spreadYear2;
      const year3Rate = isFixed ? currentSoraRates['3M'] + pkg.spreadYear3 : benchmarkRate + pkg.spreadYear3;

      const scheduleResult = calculateLoanSchedule(
        {
          loanAmount,
          tenureYears,
          benchmarkTenor: pkg.tenor === 'FIXED' ? '3M' : pkg.tenor,
          customBenchmarkRate: isFixed ? pkg.fixedRate : undefined,
          bankSpreadYear1: isFixed ? 0 : pkg.spreadYear1,
          bankSpreadYear2: isFixed ? 0 : pkg.spreadYear2,
          bankSpreadYear3: pkg.spreadYear3,
          bankSpreadThereafter: pkg.spreadThereafter,
          isSteppedSpread: true,
          flatSpread: pkg.spreadYear1,
          repaymentType: 'amortization',
          startDate: '2026-11-01',
        },
        currentSoraRates
      );

      // Calculate 3-year cumulative interest (critical lock-in comparison metric in SG)
      const lockInMonths = pkg.lockInYears * 12;
      const lockInInterest = scheduleResult.schedule
        .slice(0, lockInMonths)
        .reduce((sum, item) => sum + item.interestPayment, 0);

      const threeYearInterest = scheduleResult.schedule
        .slice(0, 36)
        .reduce((sum, item) => sum + item.interestPayment, 0);

      return {
        ...pkg,
        year1Rate,
        year2Rate,
        year3Rate,
        initialPayment: scheduleResult.initialMonthlyPayment,
        totalInterest: scheduleResult.totalInterest,
        totalRepayment: scheduleResult.totalRepayment,
        lockInInterest,
        threeYearInterest,
      };
    });
  }, [loanAmount, tenureYears, currentSoraRates]);

  // Find the lowest 3-year interest package
  const lowest3YrInterest = Math.min(...packagesWithCalculations.map((p) => p.threeYearInterest));

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Singapore Bank SORA Loan Comparison (2026 Market Standard)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare monthly installments and total interest across Singapore's leading SORA packages (DBS, OCBC, UOB, Standard Chartered, and Fixed rate benchmarks).
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Loan Amount</label>
            <div className="relative mt-0.5">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">S$</span>
              <input
                type="number"
                step="50000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-36 pl-7 pr-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Tenure</label>
            <select
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="mt-0.5 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              {[15, 20, 25, 30, 35].map((y) => (
                <option key={y} value={y}>{y} Years</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packagesWithCalculations.map((pkg) => {
          const isBest3Yr = pkg.threeYearInterest === lowest3YrInterest;

          return (
            <div
              key={pkg.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 relative ${
                pkg.recommended
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/50 shadow-xl shadow-emerald-950/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {pkg.recommended && (
                <div className="absolute -top-3 left-4 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3 h-3" /> Most Popular in Singapore
                </div>
              )}

              {isBest3Yr && !pkg.recommended && (
                <div className="absolute -top-3 left-4 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                  <Zap className="w-3 h-3" /> Lowest 3-Yr Interest
                </div>
              )}

              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">{pkg.bankName}</span>
                    <h3 className="text-sm font-bold text-white tracking-tight">{pkg.name}</h3>
                  </div>
                  <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono font-bold text-emerald-400">
                    {pkg.tenor}
                  </span>
                </div>

                {/* Initial Monthly Payment */}
                <div className="my-4">
                  <span className="text-[11px] text-slate-400 block font-medium">Monthly Installment (Yr 1)</span>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">
                    {formatSGD(pkg.initialPayment)}
                    <span className="text-xs font-normal text-slate-400 ml-1 font-sans">/ mo</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-mono mt-0.5 font-semibold">
                    Rate: {formatPercent(pkg.year1Rate, 4)} p.a.
                  </div>
                </div>

                {/* Rate Structure Breakdown */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Year 1:</span>
                    <span className="text-white font-medium">
                      {pkg.tenor === 'FIXED' ? `${pkg.fixedRate}% fixed` : `${pkg.tenor} SORA + ${pkg.spreadYear1.toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Year 2:</span>
                    <span className="text-white font-medium">
                      {pkg.tenor === 'FIXED' ? `${pkg.fixedRate}% fixed` : `${pkg.tenor} SORA + ${pkg.spreadYear2.toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Year 3:</span>
                    <span className="text-white font-medium">
                      {pkg.tenor === 'FIXED' ? `3M SORA + ${pkg.spreadYear3.toFixed(2)}%` : `${pkg.tenor} SORA + ${pkg.spreadYear3.toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Lock-in Period:</span>
                    <span className="text-amber-400 font-bold">{pkg.lockInYears} Years</span>
                  </div>
                </div>

                {/* 3-Year Total Interest Comparison Metric */}
                <div className="mt-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">First 3-Years Interest:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      {formatSGD(pkg.threeYearInterest, false)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-400 font-medium">Total Lifetime Interest:</span>
                    <span className="text-slate-200 font-mono">
                      {formatSGD(pkg.totalInterest, false)}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                  {pkg.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 text-center">
                  Benchmarked against MAS SORA: {formatPercent(currentSoraRates[pkg.tenor === 'FIXED' ? '3M' : pkg.tenor], 4)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide: Choosing between 1M, 3M SORA, and Fixed */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Which SORA Tenor Suits Your Financial Profile?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-emerald-400 block text-sm mb-1">1-Month Compounded SORA</strong>
            Resets every 30 days. Perfect for declining interest rate cycles because your loan payment immediately drops when MAS rates decrease. Higher volatility in rising rate environments.
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-blue-400 block text-sm mb-1">3-Month Compounded SORA</strong>
            The industry standard for Singapore mortgage loans. Smooths out temporary market shocks and provides quarterly payment stability, giving you 3 months of predictable cash flow between resets.
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-purple-400 block text-sm mb-1">Fixed Rate Packages</strong>
            Protects your household budget from interest rate volatility for 24 to 36 months. Best if you have tight TDSR margins or prefer fixed monthly expenses.
          </div>
        </div>
      </div>
    </div>
  );
};
