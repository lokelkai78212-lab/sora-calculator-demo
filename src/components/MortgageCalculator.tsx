import React, { useState, useMemo } from 'react';
import { LoanParams, MasDailyRate } from '../types/sora';
import { calculateLoanSchedule, formatSGD, formatPercent } from '../utils/soraMath';
import { 
  Building, 
  HelpCircle, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  Percent, 
  Download,
  AlertTriangle,
  Info
} from 'lucide-react';

interface Props {
  latestRate: MasDailyRate;
}

export const MortgageCalculator: React.FC<Props> = ({ latestRate }) => {
  // Loan parameters
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [tenureYears, setTenureYears] = useState<number>(25);
  const [benchmarkTenor, setBenchmarkTenor] = useState<'1M' | '3M' | '6M'>('3M');
  const [isCustomSora, setIsCustomSora] = useState<boolean>(false);
  const [customSoraRate, setCustomSoraRate] = useState<number>(3.2890);
  
  // Bank spreads
  const [isSteppedSpread, setIsSteppedSpread] = useState<boolean>(true);
  const [flatSpread, setFlatSpread] = useState<number>(0.70);
  const [spreadYear1, setSpreadYear1] = useState<number>(0.65);
  const [spreadYear2, setSpreadYear2] = useState<number>(0.65);
  const [spreadYear3, setSpreadYear3] = useState<number>(0.75);
  const [spreadThereafter, setSpreadThereafter] = useState<number>(0.85);

  const [repaymentType, setRepaymentType] = useState<'amortization' | 'interest-only'>('amortization');
  const [startDate, setStartDate] = useState<string>('2026-11-01');

  // Table view state
  const [scheduleView, setScheduleView] = useState<'yearly' | 'monthly'>('yearly');
  const [showSchedule, setShowSchedule] = useState<boolean>(true);

  // Compute rates lookup
  const currentSoraRates = useMemo(() => {
    return {
      '1M': latestRate.compounded1M,
      '3M': latestRate.compounded3M,
      '6M': latestRate.compounded6M,
    };
  }, [latestRate]);

  // Execute calculation
  const loanParams: LoanParams = useMemo(() => {
    return {
      loanAmount,
      tenureYears,
      benchmarkTenor,
      customBenchmarkRate: isCustomSora ? customSoraRate : undefined,
      bankSpreadYear1: spreadYear1,
      bankSpreadYear2: spreadYear2,
      bankSpreadYear3: spreadYear3,
      bankSpreadThereafter: spreadThereafter,
      isSteppedSpread,
      flatSpread,
      repaymentType,
      startDate,
    };
  }, [
    loanAmount,
    tenureYears,
    benchmarkTenor,
    isCustomSora,
    customSoraRate,
    spreadYear1,
    spreadYear2,
    spreadYear3,
    spreadThereafter,
    isSteppedSpread,
    flatSpread,
    repaymentType,
    startDate,
  ]);

  const result = useMemo(() => {
    return calculateLoanSchedule(loanParams, currentSoraRates);
  }, [loanParams, currentSoraRates]);

  // Export Amortization Schedule to CSV
  const handleExportCSV = () => {
    const headers = ['Month', 'Year', 'Date', 'SORA Rate (%)', 'Bank Spread (%)', 'All-In Rate (%)', 'Monthly Payment (SGD)', 'Principal (SGD)', 'Interest (SGD)', 'Ending Balance (SGD)'];
    const rows = result.schedule.map(item => [
      item.month,
      item.year,
      item.date,
      item.soraRate.toFixed(4),
      item.spread.toFixed(2),
      item.allInRate.toFixed(4),
      item.monthlyPayment.toFixed(2),
      item.principalPayment.toFixed(2),
      item.interestPayment.toFixed(2),
      item.endingBalance.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Singapore_SORA_Loan_Schedule_${loanAmount}_${tenureYears}Y.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick preset loader
  const applyPreset = (amount: number, tenure: number, tenor: '1M' | '3M' | '6M', y1Spread: number) => {
    setLoanAmount(amount);
    setTenureYears(tenure);
    setBenchmarkTenor(tenor);
    setIsSteppedSpread(true);
    setSpreadYear1(y1Spread);
    setSpreadYear2(y1Spread);
    setSpreadYear3(y1Spread + 0.1);
    setSpreadThereafter(y1Spread + 0.2);
    setIsCustomSora(false);
  };

  const activeSoraBenchmark = isCustomSora ? customSoraRate : currentSoraRates[benchmarkTenor];
  const interestRatio = Math.round((result.totalInterest / result.totalRepayment) * 100) || 0;
  const principalRatio = 100 - interestRatio;

  return (
    <div className="space-y-6">
      {/* Property & Loan Presets Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyPreset(500000, 25, '3M', 0.65)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              HDB S$500k (25Y)
            </button>
            <button
              onClick={() => applyPreset(1200000, 30, '3M', 0.65)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Condo S$1.2M (30Y)
            </button>
            <button
              onClick={() => applyPreset(2500000, 30, '3M', 0.60)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Landed S$2.5M (30Y)
            </button>
            <button
              onClick={() => applyPreset(800000, 20, '1M', 0.70)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Refinancing S$800k (20Y)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Loan Inputs */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Building className="w-4 h-4 text-emerald-400" />
              Loan Parameters
            </h2>

            {/* Loan Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Loan Principal Amount</label>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {formatSGD(loanAmount, false)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">S$</span>
                <input
                  type="number"
                  min="50000"
                  max="10000000"
                  step="10000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Math.max(10000, Number(e.target.value)))}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-semibold focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <input
                type="range"
                min="100000"
                max="3000000"
                step="50000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Loan Tenure */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Loan Tenure</label>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {tenureYears} Years ({tenureYears * 12} Months)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[15, 20, 25, 30, 35].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setTenureYears(y)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      tenureYears === y
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {y} Yrs
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer mt-1"
              />
              <p className="text-[11px] text-slate-400">
                MAS regulatory maximum: 25 years for HDB flats, 30 years for private residential (or 35 years with stricter LTV).
              </p>
            </div>

            {/* SORA Tenor Selection */}
            <div className="space-y-2 mt-5 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">SORA Benchmark Tenor</label>
                <span className="text-[11px] text-slate-400">MAS Compounded Rate</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['1M', '3M', '6M'] as const).map((tenor) => {
                  const rateVal = currentSoraRates[tenor];
                  return (
                    <button
                      key={tenor}
                      type="button"
                      onClick={() => setBenchmarkTenor(tenor)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        benchmarkTenor === tenor
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{tenor} SORA</span>
                        {tenor === '3M' && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-medium">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono font-bold mt-1 text-emerald-400">
                        {formatPercent(rateVal, 4)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Stress test override toggle */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomSora}
                    onChange={(e) => {
                      setIsCustomSora(e.target.checked);
                      if (e.target.checked) setCustomSoraRate(currentSoraRates[benchmarkTenor]);
                    }}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Simulate custom SORA rate</span>
                </label>
                {isCustomSora && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="10"
                      value={customSoraRate}
                      onChange={(e) => setCustomSoraRate(Number(e.target.value))}
                      className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white text-right"
                    />
                    <span className="text-slate-400 font-mono text-xs">%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Spread / Margin */}
            <div className="space-y-3 mt-5 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Bank Spread / Margin (+ % p.a.)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSteppedSpread(true)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      isSteppedSpread ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Stepped
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSteppedSpread(false)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      !isSteppedSpread ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Flat Spread
                  </button>
                </div>
              </div>

              {isSteppedSpread ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Year 1 Spread</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-slate-500 text-xs">+</span>
                      <input
                        type="number"
                        step="0.05"
                        value={spreadYear1}
                        onChange={(e) => setSpreadYear1(Number(e.target.value))}
                        className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Year 2 Spread</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-slate-500 text-xs">+</span>
                      <input
                        type="number"
                        step="0.05"
                        value={spreadYear2}
                        onChange={(e) => setSpreadYear2(Number(e.target.value))}
                        className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Year 3 Spread</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-slate-500 text-xs">+</span>
                      <input
                        type="number"
                        step="0.05"
                        value={spreadYear3}
                        onChange={(e) => setSpreadYear3(Number(e.target.value))}
                        className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Thereafter (Yr 4+)</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-slate-500 text-xs">+</span>
                      <input
                        type="number"
                        step="0.05"
                        value={spreadThereafter}
                        onChange={(e) => setSpreadThereafter(Number(e.target.value))}
                        className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
                      />
                      <span className="text-slate-500 text-xs">%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Flat Bank Spread for All Years</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-slate-500 text-sm">+</span>
                    <input
                      type="number"
                      step="0.05"
                      value={flatSpread}
                      onChange={(e) => setFlatSpread(Number(e.target.value))}
                      className="w-full bg-transparent font-mono text-base font-semibold text-white focus:outline-none"
                    />
                    <span className="text-slate-400 text-sm">% p.a.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Repayment Type & Start Date */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Repayment Type</label>
                <select
                  value={repaymentType}
                  onChange={(e) => setRepaymentType(e.target.value as any)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="amortization">Principal + Interest</option>
                  <option value="interest-only">Interest Only</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">First Payment Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Results & Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Payment Result Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Initial Monthly Payment
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1 tracking-tight">
                  {formatSGD(result.initialMonthlyPayment)}
                  <span className="text-sm font-normal text-slate-400 ml-1.5 font-sans">/ month</span>
                </div>
              </div>

              <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 text-right">
                <div className="text-[11px] text-slate-400 font-medium">All-In Interest Rate</div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {formatPercent(result.currentAllInRate, 4)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {benchmarkTenor} SORA ({activeSoraBenchmark.toFixed(4)}%) + {result.currentSpread.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block font-medium">Principal</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {formatSGD(loanAmount, false)}
                </span>
                <span className="text-[10px] text-slate-500">100% borrowed</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block font-medium">Total Interest</span>
                <span className="text-sm font-bold text-amber-300 font-mono mt-0.5 block">
                  {formatSGD(result.totalInterest, false)}
                </span>
                <span className="text-[10px] text-amber-400/80 font-medium">{interestRatio}% of repayment</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block font-medium">Total Cost</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {formatSGD(result.totalRepayment, false)}
                </span>
                <span className="text-[10px] text-slate-500">Principal + interest</span>
              </div>

              <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-500/20">
                <span className="text-[11px] text-rose-300 block font-medium flex items-center gap-1">
                  <span>MAS 4% Stress</span>
                  <HelpCircle className="w-3 h-3 text-rose-400" />
                </span>
                <span className="text-sm font-bold text-rose-300 font-mono mt-0.5 block">
                  {formatSGD(result.stressTestPayment)}
                </span>
                <span className="text-[10px] text-rose-400/80">
                  +{formatSGD(Math.max(0, result.stressTestPayment - result.initialMonthlyPayment))} /mo
                </span>
              </div>
            </div>

            {/* Principal vs Interest Distribution Visual Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                  Principal Repayment: {formatSGD(loanAmount, false)} ({principalRatio}%)
                </span>
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
                  Total Interest: {formatSGD(result.totalInterest, false)} ({interestRatio}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div style={{ width: `${principalRatio}%` }} className="bg-emerald-500 h-full transition-all duration-300"></div>
                <div style={{ width: `${interestRatio}%` }} className="bg-amber-500 h-full transition-all duration-300"></div>
              </div>
            </div>

            {/* MAS Stress Test Advisory Banner */}
            <div className="mt-4 p-3 bg-slate-950/90 rounded-xl border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Singapore MAS Notice 645 Compliance:</strong> Singapore commercial banks are required to assess your borrowing eligibility using a medium-term stress interest rate floor of <strong>4.00% p.a.</strong> (or SORA + spread, whichever is higher) under the 55% Total Debt Servicing Ratio (TDSR) framework.
              </div>
            </div>
          </div>

          {/* Stepped Spread Schedule Projection (if stepped) */}
          {isSteppedSpread && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Rate Reset & Stepped Spread Projection
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Year 1</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {formatPercent(activeSoraBenchmark + spreadYear1, 4)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Spread: +{spreadYear1.toFixed(2)}%
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Year 2</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {formatPercent(activeSoraBenchmark + spreadYear2, 4)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Spread: +{spreadYear2.toFixed(2)}%
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Year 3</span>
                  <span className="font-mono text-amber-400 font-bold text-sm">
                    {formatPercent(activeSoraBenchmark + spreadYear3, 4)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Spread: +{spreadYear3.toFixed(2)}%
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Thereafter (Yr 4+)</span>
                  <span className="font-mono text-amber-400 font-bold text-sm">
                    {formatPercent(activeSoraBenchmark + spreadThereafter, 4)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Spread: +{spreadThereafter.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Amortization Schedule Accordion / Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mt-4">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Amortization Schedule</h3>
              <p className="text-xs text-slate-400">
                Detailed breakdown of principal reduction, interest payments, and ending balances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex">
              <button
                type="button"
                onClick={() => setScheduleView('yearly')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  scheduleView === 'yearly'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly View
              </button>
              <button
                type="button"
                onClick={() => setScheduleView('monthly')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  scheduleView === 'monthly'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly View ({tenureYears * 12} Mos)
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              title="Download CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            >
              {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showSchedule && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">{scheduleView === 'yearly' ? 'Year' : 'Month / Date'}</th>
                  <th className="py-3 px-4 font-semibold">Interest Rate</th>
                  <th className="py-3 px-4 font-semibold text-right">Payment</th>
                  <th className="py-3 px-4 font-semibold text-right">Principal</th>
                  <th className="py-3 px-4 font-semibold text-right">Interest</th>
                  <th className="py-3 px-4 font-semibold text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {scheduleView === 'yearly' ? (
                  result.yearlySummary.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-white">Year {row.year}</td>
                      <td className="py-2.5 px-4 text-emerald-400">
                        {isSteppedSpread 
                          ? `${formatPercent(activeSoraBenchmark + (row.year === 1 ? spreadYear1 : row.year === 2 ? spreadYear2 : row.year === 3 ? spreadYear3 : spreadThereafter))}`
                          : `${formatPercent(result.currentAllInRate)}`
                        }
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatSGD(row.annualPayment)}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-400">{formatSGD(row.annualPrincipal)}</td>
                      <td className="py-2.5 px-4 text-right text-amber-400">{formatSGD(row.annualInterest)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">{formatSGD(row.endingBalance)}</td>
                    </tr>
                  ))
                ) : (
                  result.schedule.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-4">
                        <span className="font-bold text-white">M{row.month}</span>
                        <span className="text-slate-500 ml-2">({row.date})</span>
                      </td>
                      <td className="py-2 px-4 text-emerald-400 font-mono">
                        {formatPercent(row.allInRate, 4)}
                      </td>
                      <td className="py-2 px-4 text-right">{formatSGD(row.monthlyPayment)}</td>
                      <td className="py-2 px-4 text-right text-emerald-400">{formatSGD(row.principalPayment)}</td>
                      <td className="py-2 px-4 text-right text-amber-400">{formatSGD(row.interestPayment)}</td>
                      <td className="py-2 px-4 text-right font-bold text-white">{formatSGD(row.endingBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
