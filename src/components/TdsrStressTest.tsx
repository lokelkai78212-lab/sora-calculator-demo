import React, { useState, useMemo } from 'react';
import { MasDailyRate } from '../types/sora';
import { calculateMonthlyPayment, formatSGD, formatPercent } from '../utils/soraMath';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, Landmark, UserCheck } from 'lucide-react';

interface Props {
  latestRate: MasDailyRate;
}

export const TdsrStressTest: React.FC<Props> = ({ latestRate }) => {
  // Income
  const [fixedIncome, setFixedIncome] = useState<number>(12000);
  const [variableIncome, setVariableIncome] = useState<number>(3000); // 30% haircut applied per MAS rules
  const [propertyType, setPropertyType] = useState<'private' | 'hdb' | 'ec'>('private');

  // Existing debt obligations
  const [carLoan, setCarLoan] = useState<number>(1200);
  const [creditCardPayments, setCreditCardPayments] = useState<number>(400);
  const [otherLoans, setOtherLoans] = useState<number>(0);

  // Proposed Mortgage
  const [loanAmount, setLoanAmount] = useState<number>(1200000);
  const [tenureYears, setTenureYears] = useState<number>(25);
  const [bankSpread, setBankSpread] = useState<number>(0.65);

  const MAS_STRESS_RATE = 4.00; // 4.00% p.a. medium term stress rate
  const currentSoraRate = latestRate.compounded3M;
  const currentAllInRate = currentSoraRate + bankSpread;

  // MAS Income computation (MAS mandates 70% recognition of variable/commission income)
  const recognizedMonthlyIncome = useMemo(() => {
    return fixedIncome + variableIncome * 0.7;
  }, [fixedIncome, variableIncome]);

  // Loan monthly payments
  const totalMonths = tenureYears * 12;

  const actualMonthlyInstallment = useMemo(() => {
    return calculateMonthlyPayment(loanAmount, currentAllInRate, totalMonths);
  }, [loanAmount, currentAllInRate, totalMonths]);

  const stressMonthlyInstallment = useMemo(() => {
    return calculateMonthlyPayment(loanAmount, MAS_STRESS_RATE, totalMonths);
  }, [loanAmount, totalMonths]);

  const totalExistingCommitments = carLoan + creditCardPayments + otherLoans;

  // TDSR Calculations (Max 55% allowed)
  const actualTdsr = useMemo(() => {
    if (recognizedMonthlyIncome <= 0) return 0;
    return ((actualMonthlyInstallment + totalExistingCommitments) / recognizedMonthlyIncome) * 100;
  }, [actualMonthlyInstallment, totalExistingCommitments, recognizedMonthlyIncome]);

  const stressTdsr = useMemo(() => {
    if (recognizedMonthlyIncome <= 0) return 0;
    return ((stressMonthlyInstallment + totalExistingCommitments) / recognizedMonthlyIncome) * 100;
  }, [stressMonthlyInstallment, totalExistingCommitments, recognizedMonthlyIncome]);

  // MSR Calculation (30% cap for HDB/EC)
  const msrActual = useMemo(() => {
    if (recognizedMonthlyIncome <= 0) return 0;
    return (actualMonthlyInstallment / recognizedMonthlyIncome) * 100;
  }, [actualMonthlyInstallment, recognizedMonthlyIncome]);

  const msrStress = useMemo(() => {
    if (recognizedMonthlyIncome <= 0) return 0;
    return (stressMonthlyInstallment / recognizedMonthlyIncome) * 100;
  }, [stressMonthlyInstallment, recognizedMonthlyIncome]);

  const passesTdsr = stressTdsr <= 55.0;
  const passesMsr = propertyType === 'private' || msrStress <= 30.0;
  const isApproved = passesTdsr && passesMsr;

  // Maximum loan amount allowable under 55% TDSR at 4.0% stress rate
  const maxBorrowingPower = useMemo(() => {
    const maxAllowablePayment = recognizedMonthlyIncome * 0.55 - totalExistingCommitments;
    if (maxAllowablePayment <= 0) return 0;

    const r = MAS_STRESS_RATE / 100 / 12;
    const factor = Math.pow(1 + r, totalMonths);
    const maxPrincipal = (maxAllowablePayment * (factor - 1)) / (r * factor);
    return Math.max(0, Math.floor(maxPrincipal / 1000) * 1000);
  }, [recognizedMonthlyIncome, totalExistingCommitments, totalMonths]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              Singapore MAS Notice 645 TDSR & MSR Assessment Engine
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full">
              4.00% Stress Floor
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Singapore banks must stress-test all residential property loans at 4.0% p.a. to ensure Total Debt Servicing Ratio does not exceed 55%.
          </p>
        </div>

        {/* Pass/Fail Status Banner */}
        <div
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 ${
            isApproved
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {isApproved ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {isApproved ? 'MAS Eligibility: Compliant' : 'MAS TDSR / MSR Breached'}
            </div>
            <div className="text-[11px] opacity-80">
              {isApproved
                ? `Stress TDSR ${stressTdsr.toFixed(1)}% ≤ 55% statutory limit`
                : `Stress TDSR ${stressTdsr.toFixed(1)}% exceeds 55% statutory cap`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Borrower Financial Profile
            </h3>

            {/* Property Type */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Property Type</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['private', 'hdb', 'ec'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPropertyType(type)}
                    className={`py-2 rounded-xl border text-center uppercase font-bold transition ${
                      propertyType === type
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {type === 'private' ? 'Private Condo' : type === 'hdb' ? 'HDB Flat' : 'Exec Condo (EC)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Income Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Fixed Monthly Salary (Base)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">S$</span>
                  <input
                    type="number"
                    step="500"
                    value={fixedIncome}
                    onChange={(e) => setFixedIncome(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label className="font-medium text-slate-300">Variable Monthly Income (Bonus / Commissions)</label>
                  <span className="text-[10px] text-amber-400">30% MAS Haircut applied</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">S$</span>
                  <input
                    type="number"
                    step="500"
                    value={variableIncome}
                    onChange={(e) => setVariableIncome(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  MAS Recognized Income: <strong className="text-slate-300 font-mono">{formatSGD(recognizedMonthlyIncome)}</strong>
                </p>
              </div>
            </div>

            {/* Existing Debt Obligations */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Existing Monthly Debt Obligations
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Car Loan Installment</span>
                  <input
                    type="number"
                    step="100"
                    value={carLoan}
                    onChange={(e) => setCarLoan(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Credit Card Min.</span>
                  <input
                    type="number"
                    step="50"
                    value={creditCardPayments}
                    onChange={(e) => setCreditCardPayments(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Other Existing Property / Personal Loans</span>
                <input
                  type="number"
                  step="100"
                  value={otherLoans}
                  onChange={(e) => setOtherLoans(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Proposed Loan Parameters */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Proposed SORA Mortgage
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Loan Amount (S$)</span>
                  <input
                    type="number"
                    step="50000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white font-bold"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Tenure (Years)</span>
                  <input
                    type="number"
                    min="5"
                    max="35"
                    value={tenureYears}
                    onChange={(e) => setTenureYears(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Assessment Results */}
        <div className="lg:col-span-7 space-y-5">
          {/* Gauges & Summary Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* TDSR Gauge */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Total Debt Servicing Ratio (TDSR)
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2">Regulatory Max: 55.0%</span>
                </div>
                <span
                  className={`text-lg font-extrabold font-mono ${
                    stressTdsr <= 55 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {stressTdsr.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                <div
                  style={{ width: `${Math.min(100, (stressTdsr / 55) * 100)}%` }}
                  className={`h-full transition-all duration-300 ${
                    stressTdsr <= 55 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                ></div>
                {/* 55% marker */}
                <div className="absolute top-0 bottom-0 left-[55%] w-0.5 bg-amber-400 z-10"></div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>Actual TDSR (SORA {currentAllInRate.toFixed(2)}%): <strong className="text-white">{actualTdsr.toFixed(1)}%</strong></span>
                <span>MAS Stress Test (4.0%): <strong className={stressTdsr <= 55 ? 'text-emerald-400' : 'text-rose-400'}>{stressTdsr.toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* MSR Gauge (if HDB or EC) */}
            {propertyType !== 'private' && (
              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Mortgage Servicing Ratio (MSR)
                    </span>
                    <span className="text-[10px] text-amber-300 ml-2">HDB/EC Cap: 30.0%</span>
                  </div>
                  <span
                    className={`text-lg font-extrabold font-mono ${
                      msrStress <= 30 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {msrStress.toFixed(1)}%
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                  <div
                    style={{ width: `${Math.min(100, (msrStress / 30) * 100)}%` }}
                    className={`h-full transition-all duration-300 ${
                      msrStress <= 30 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></div>
                  <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-amber-400 z-10"></div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                  <span>Actual MSR: <strong className="text-white">{msrActual.toFixed(1)}%</strong></span>
                  <span>Stress MSR (4%): <strong className={msrStress <= 30 ? 'text-emerald-400' : 'text-rose-400'}>{msrStress.toFixed(1)}%</strong></span>
                </div>
              </div>
            )}

            {/* Payment Comparison Table */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Actual Payment (at Current SORA)
                </span>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {formatSGD(actualMonthlyInstallment)}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                  Rate: {currentAllInRate.toFixed(4)}% p.a.
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30">
                <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-semibold">
                  MAS 4% Stress Test Installment
                </span>
                <div className="text-xl font-bold text-amber-300 font-mono mt-1">
                  {formatSGD(stressMonthlyInstallment)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Buffer: +{formatSGD(Math.max(0, stressMonthlyInstallment - actualMonthlyInstallment))} /mo
                </div>
              </div>
            </div>

            {/* Max Borrowing Capacity Card */}
            <div className="p-4 bg-gradient-to-r from-emerald-950/30 to-blue-950/30 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 font-medium block">
                  Maximum Estimated Loan Borrowing Capacity:
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
                  {formatSGD(maxBorrowingPower, false)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Calculated at 55% TDSR limit under MAS 4.0% stress floor
                </span>
              </div>
              <Landmark className="w-8 h-8 text-emerald-400/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
