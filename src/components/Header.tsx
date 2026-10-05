import React from 'react';
import { MasDailyRate, BackendConfig } from '../types/sora';
import { Landmark, Server, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { formatPercent } from '../utils/soraMath';

interface HeaderProps {
  latestRate: MasDailyRate;
  activeTab: 'mortgage' | 'daily' | 'trends' | 'compare' | 'tdsr';
  setActiveTab: (tab: 'mortgage' | 'daily' | 'trends' | 'compare' | 'tdsr') => void;
  onOpenBackendModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  backendConfig: BackendConfig;
  dataSourceLabel: string;
}

export const Header: React.FC<HeaderProps> = ({
  latestRate,
  activeTab,
  setActiveTab,
  onOpenBackendModal,
  onRefresh,
  isLoading,
  backendConfig,
  dataSourceLabel,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                <Landmark className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Singapore SORA Calculator</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase tracking-wider">
                  MAS Rates
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Monetary Authority of Singapore (MAS) Compounded Overnight Rates Engine
              </p>
            </div>
          </div>

          {/* Controls & Backend status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">Fixing: <strong className="text-white font-mono">{latestRate.date}</strong></span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{dataSourceLabel}</span>
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh MAS Rates"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onOpenBackendModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl border border-blue-500/30 text-xs font-medium transition"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Backend API</span>
              {backendConfig.mode === 'custom-backend' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </div>
        </div>

        {/* Live MAS Overnight Rates Ticker Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3.5 pt-3.5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>Overnight SORA</span>
              <Activity className="w-3 h-3 text-slate-500" />
            </div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {formatPercent(latestRate.sora, 4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Daily interbank volume wt.</div>
          </div>

          <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center justify-between">
              <span>1-Month SORA</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">1M</span>
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {formatPercent(latestRate.compounded1M, 4)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Compounded in advance</div>
          </div>

          <div className="bg-blue-950/30 p-2.5 rounded-xl border border-blue-500/30 ring-1 ring-blue-500/20">
            <div className="text-[11px] text-blue-300 font-medium flex items-center justify-between">
              <span>3-Month SORA</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-200 px-1 rounded font-bold">Standard</span>
            </div>
            <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
              {formatPercent(latestRate.compounded3M, 4)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Singapore mortgage standard</div>
          </div>

          <div className="bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/30">
            <div className="text-[11px] text-purple-300 font-medium flex items-center justify-between">
              <span>6-Month SORA</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-200 px-1 rounded">6M</span>
            </div>
            <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
              {formatPercent(latestRate.compounded6M, 4)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Biannual reset package</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70">
            <div className="text-[11px] text-slate-400 font-medium">MAS SORA Index</div>
            <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {latestRate.soraIndex.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Base 100 on 02/01/2020</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70">
            <div className="text-[11px] text-slate-400 font-medium">Overnight Volume</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              S${latestRate.aggregateVolume ? (latestRate.aggregateVolume / 1000).toFixed(2) + 'B' : 'S$3.85B'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Unsecured SGD interbank</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 mt-4 overflow-x-auto pb-0.5 border-b border-transparent">
          <button
            onClick={() => setActiveTab('mortgage')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeTab === 'mortgage'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Mortgage & Loan Calculator
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Daily Compounding Engine (Actual/365)
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeTab === 'compare'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Bank Packages Comparison
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeTab === 'trends'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Historical SORA Trends & Volume
          </button>
          <button
            onClick={() => setActiveTab('tdsr')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'tdsr'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>MAS TDSR 4% Stress Test</span>
            <span className="text-[9px] bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">Notice 645</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
