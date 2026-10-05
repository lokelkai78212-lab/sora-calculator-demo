import React, { useState, useEffect, useCallback } from 'react';
import { MasDailyRate, BackendConfig } from './types/sora';
import { HISTORICAL_SORA_DATA, LATEST_MAS_SORA } from './data/historicalSora';
import { fetchMasRates } from './services/masApiService';
import { Header } from './components/Header';
import { MortgageCalculator } from './components/MortgageCalculator';
import { DailyCompoundingCalculator } from './components/DailyCompoundingCalculator';
import { SoraRateExplorer } from './components/SoraRateExplorer';
import { PackageComparison } from './components/PackageComparison';
import { TdsrStressTest } from './components/TdsrStressTest';
import { BackendIntegrationModal } from './components/BackendIntegrationModal';
import { Shield, ExternalLink, HelpCircle, Building2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'mortgage' | 'daily' | 'trends' | 'compare' | 'tdsr'>('mortgage');

  const [backendConfig, setBackendConfig] = useState<BackendConfig>(() => {
    const saved = localStorage.getItem('sg_sora_backend_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      mode: 'built-in',
      customApiUrl: 'http://localhost:8000/api/mas/sora',
      status: 'fallback',
    };
  });

  const [latestRate, setLatestRate] = useState<MasDailyRate>(LATEST_MAS_SORA);
  const [historicalRates, setHistoricalRates] = useState<MasDailyRate[]>(HISTORICAL_SORA_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('MAS Published Rates');
  const [isBackendModalOpen, setIsBackendModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchMasRates(backendConfig);
      setLatestRate(result.latest);
      setHistoricalRates(result.rates);
      setDataSourceLabel(
        result.source === 'custom-backend'
          ? 'Custom MAS Backend'
          : result.source === 'mas-official'
          ? 'Live MAS Open Data'
          : 'MAS Official Rates'
      );
      setNotification(`Rates synced (${result.statusMessage})`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Error fetching rates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [backendConfig]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleSaveConfig = (newConfig: BackendConfig) => {
    setBackendConfig(newConfig);
    localStorage.setItem('sg_sora_backend_config', JSON.stringify(newConfig));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <Header
        latestRate={latestRate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBackendModal={() => setIsBackendModalOpen(true)}
        onRefresh={loadRates}
        isLoading={isLoading}
        backendConfig={backendConfig}
        dataSourceLabel={dataSourceLabel}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'mortgage' && <MortgageCalculator latestRate={latestRate} />}
        {activeTab === 'daily' && <DailyCompoundingCalculator historicalRates={historicalRates} />}
        {activeTab === 'compare' && <PackageComparison latestRate={latestRate} />}
        {activeTab === 'trends' && <SoraRateExplorer historicalRates={historicalRates} />}
        {activeTab === 'tdsr' && <TdsrStressTest latestRate={latestRate} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 mt-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-900">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>About Singapore SORA</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                The Singapore Overnight Rate Average (SORA) is published by the Monetary Authority of Singapore (MAS) at 9:00 AM on each business day. It is the volume-weighted average rate of unsecured SGD overnight cash transactions brokered in Singapore between 8:00 AM and 6:15 PM.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>MAS Calculation Conventions</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Compounded SORA rates are calculated based on the actual number of calendar days in the compounding period divided by 365 (Actual/365 convention). Friday and weekend fixings are carried forward to Monday.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Regulatory Notice 645 & TDSR</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Calculations conform to MAS Notice 645 and Notice 1115 for Residential Property Loans. Stress test calculations incorporate the mandatory 4.00% p.a. medium-term interest rate floor and 55% Total Debt Servicing Ratio threshold.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[11px] text-slate-500">
            <div>
              © 2026 Singapore SORA Calculator • MAS Open Data Compatible • Singapore Money Market Standards
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.mas.gov.sg/bonds-and-bills/sora"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-300 flex items-center gap-1 transition"
              >
                Official MAS SORA Portal <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setIsBackendModalOpen(true)}
                className="hover:text-emerald-400 text-slate-400 underline transition"
              >
                Developer API Integration
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Backend Integration Modal */}
      <BackendIntegrationModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        config={backendConfig}
        onSaveConfig={handleSaveConfig}
        onRefreshData={loadRates}
        isLoading={isLoading}
      />
    </div>
  );
}
