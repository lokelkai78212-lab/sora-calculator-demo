import React, { useState, useMemo } from 'react';
import { MasDailyRate } from '../types/sora';
import { calculateMasCompoundedSora, formatSGD, formatPercent } from '../utils/soraMath';
import { Calculator, Calendar, ArrowRight, Layers, FileSpreadsheet, CheckCircle2, Info } from 'lucide-react';

interface Props {
  historicalRates: MasDailyRate[];
}

export const DailyCompoundingCalculator: React.FC<Props> = ({ historicalRates }) => {
  // Principal loan amount for interest period
  const [facilityAmount, setFacilityAmount] = useState<number>(2000000);
  const [bankSpread, setBankSpread] = useState<number>(0.75);

  // Default dates: last 30 business days or preset
  const [presetPeriod, setPresetPeriod] = useState<'30D' | '90D' | 'custom'>('90D');
  
  // Custom range
  const sortedDates = useMemo(() => {
    return [...historicalRates].sort((a, b) => a.date.localeCompare(b.date));
  }, [historicalRates]);

  const defaultEnd = sortedDates[sortedDates.length - 1]?.date || '2026-10-02';
  const defaultStart = sortedDates[Math.max(0, sortedDates.length - 65)]?.date || '2026-07-01';

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // Handle preset clicks
  const handleApplyPreset = (preset: '30D' | '90D') => {
    setPresetPeriod(preset);
    const count = preset === '30D' ? 22 : 65;
    const end = sortedDates[sortedDates.length - 1]?.date || '2026-10-02';
    const startIdx = Math.max(0, sortedDates.length - count);
    const start = sortedDates[startIdx]?.date || '2026-07-01';
    setStartDate(start);
    setEndDate(end);
  };

  // Filter daily rates within the calculation period
  const calculationPeriodRates = useMemo(() => {
    const list = sortedDates.filter(
      (item) => item.date >= startDate && item.date <= endDate
    );

    return list.map((item, idx) => {
      // Determine day count weight n_i based on calendar days to next business day
      const curDate = new Date(item.date);
      const dayOfWeek = curDate.getDay();
      let weight = 1;
      if (dayOfWeek === 5) {
        weight = 3; // Friday to Monday
      }

      return {
        date: item.date,
        sora: item.sora,
        dayCountWeight: weight,
        soraIndex: item.soraIndex,
      };
    });
  }, [sortedDates, startDate, endDate]);

  // Compute MAS compounded rate
  const calculation = useMemo(() => {
    const { compoundedRate, totalDays, compoundingFactor } = calculateMasCompoundedSora(calculationPeriodRates);
    const allInRate = compoundedRate + bankSpread;
    // Singapore money market Actual/365 interest formula
    const totalInterestPayable = facilityAmount * (allInRate / 100) * (totalDays / 365);
    const benchmarkOnlyInterest = facilityAmount * (compoundedRate / 100) * (totalDays / 365);
    const spreadOnlyInterest = facilityAmount * (bankSpread / 100) * (totalDays / 365);

    return {
      compoundedRate,
      totalDays,
      businessDays: calculationPeriodRates.length,
      compoundingFactor,
      allInRate,
      totalInterestPayable,
      benchmarkOnlyInterest,
      spreadOnlyInterest,
    };
  }, [calculationPeriodRates, bankSpread, facilityAmount]);

  return (
    <div className="space-y-6">
      {/* Top Banner Explaining MAS Overnight Compounding */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                MAS Daily SORA Compounding Engine (Actual/365)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact day-by-day overnight rate compounding per the MAS & Singapore Working Group on SORA (SC-STS) conventions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Standard Presets:</span>
            <button
              onClick={() => handleApplyPreset('30D')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                presetPeriod === '30D'
                  ? 'bg-blue-500 text-slate-950 border-blue-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              1-Month (~30 Days)
            </button>
            <button
              onClick={() => handleApplyPreset('90D')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                presetPeriod === '90D'
                  ? 'bg-blue-500 text-slate-950 border-blue-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              3-Month (~90 Days)
            </button>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-800">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Loan / Facility Principal
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">S$</span>
              <input
                type="number"
                step="50000"
                value={facilityAmount}
                onChange={(e) => setFacilityAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Bank Margin / Spread (+% p.a.)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                value={bankSpread}
                onChange={(e) => setBankSpread(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">% p.a.</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Period Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPresetPeriod('custom');
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Period End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPresetPeriod('custom');
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Compounding Results Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 font-medium">MAS Compounded SORA Rate</div>
          <div className="text-3xl font-extrabold text-blue-400 font-mono mt-1">
            {formatPercent(calculation.compoundedRate, 4)}
          </div>
          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
            <div>Calendar days: <strong className="text-white font-mono">{calculation.totalDays} days</strong></div>
            <div>Business days ($d_b$): <strong className="text-white font-mono">{calculation.businessDays} fixings</strong></div>
            <div>Cumulative factor: <strong className="text-slate-300 font-mono">{calculation.compoundingFactor.toFixed(8)}</strong></div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 font-medium">All-In Lending Rate</div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
            {formatPercent(calculation.allInRate, 4)}
          </div>
          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
            <div>Compounded SORA: <strong className="text-blue-300 font-mono">{calculation.compoundedRate.toFixed(4)}%</strong></div>
            <div>Bank Margin: <strong className="text-emerald-300 font-mono">+{bankSpread.toFixed(2)}%</strong></div>
            <div>Convention: <strong className="text-white font-mono">Actual/365 (SGD)</strong></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-blue-300 font-medium">Total Interest Payable for Period</div>
          <div className="text-3xl font-extrabold text-white font-mono mt-1">
            {formatSGD(calculation.totalInterestPayable)}
          </div>
          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
            <div>SORA benchmark portion: <span className="text-slate-200 font-mono">{formatSGD(calculation.benchmarkOnlyInterest)}</span></div>
            <div>Bank spread portion: <span className="text-slate-200 font-mono">{formatSGD(calculation.spreadOnlyInterest)}</span></div>
            <div>Principal: <span className="text-white font-mono">{formatSGD(facilityAmount, false)}</span></div>
          </div>
        </div>
      </div>

      {/* Official MAS Formula Card */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Info className="w-4 h-4 text-blue-400" />
          MAS Compounding Formula Reference
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          The Monetary Authority of Singapore defines compounded SORA using the actual daily fixings published at 9:00 AM on the following business day:
        </p>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
          <code>
            Compounded SORA = [ ∏ ( 1 + (r_i × n_i / 365) ) - 1 ] × (365 / d) × 100
          </code>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-[11px] text-slate-400">
          <div><strong className="text-slate-200">r_i</strong> = Daily SORA for business day i</div>
          <div><strong className="text-slate-200">n_i</strong> = Calendar days rate applies (1 or 3)</div>
          <div><strong className="text-slate-200">d</strong> = Total calendar days in calculation period</div>
        </div>
      </div>

      {/* Daily Rates Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Underlying MAS Daily SORA Fixings ({calculationPeriodRates.length} Business Days)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {startDate} → {endDate}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Day</th>
                <th className="py-2.5 px-4 text-right">Daily SORA (r_i)</th>
                <th className="py-2.5 px-4 text-center">Days Weight (n_i)</th>
                <th className="py-2.5 px-4 text-right">Daily Factor (1 + r_i·n_i/365)</th>
                <th className="py-2.5 px-4 text-right">Daily Accrued Interest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {calculationPeriodRates.map((row, idx) => {
                const dateObj = new Date(row.date);
                const dayName = dateObj.toLocaleDateString('en-SG', { weekday: 'short' });
                const r = row.sora / 100;
                const factor = 1 + (r * row.dayCountWeight) / 365;
                const dailyAccrued = facilityAmount * ((row.sora + bankSpread) / 100) * (row.dayCountWeight / 365);

                return (
                  <tr key={row.date} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-4 font-bold text-white">{row.date}</td>
                    <td className="py-2 px-4 text-slate-400">{dayName}</td>
                    <td className="py-2 px-4 text-right text-emerald-400 font-bold">
                      {formatPercent(row.sora, 4)}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${row.dayCountWeight > 1 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'}`}>
                        {row.dayCountWeight} {row.dayCountWeight > 1 ? 'days (W/E)' : 'day'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right text-slate-400">
                      {factor.toFixed(8)}
                    </td>
                    <td className="py-2 px-4 text-right font-medium text-white">
                      {formatSGD(dailyAccrued)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
