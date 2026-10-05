import React, { useState, useMemo } from 'react';
import { MasDailyRate } from '../types/sora';
import { formatPercent } from '../utils/soraMath';
import { LineChart, BarChart3, TrendingUp, Calendar, Search } from 'lucide-react';

interface Props {
  historicalRates: MasDailyRate[];
}

export const SoraRateExplorer: React.FC<Props> = ({ historicalRates }) => {
  const [activeSeries, setActiveSeries] = useState<{
    daily: boolean;
    comp1M: boolean;
    comp3M: boolean;
    comp6M: boolean;
  }>({
    daily: true,
    comp1M: true,
    comp3M: true,
    comp6M: false,
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [searchDate, setSearchDate] = useState<string>('');

  // Sort chronological
  const sorted = useMemo(() => {
    return [...historicalRates].sort((a, b) => a.date.localeCompare(b.date));
  }, [historicalRates]);

  // Filtered dataset
  const filtered = useMemo(() => {
    if (!searchDate) return sorted;
    return sorted.filter((r) => r.date.includes(searchDate));
  }, [sorted, searchDate]);

  // Statistics
  const stats = useMemo(() => {
    if (sorted.length === 0) return null;
    const soraValues = sorted.map((d) => d.sora);
    const minSora = Math.min(...soraValues);
    const maxSora = Math.max(...soraValues);
    const avgSora = soraValues.reduce((a, b) => a + b, 0) / soraValues.length;
    const latest = sorted[sorted.length - 1];

    const volumeValues = sorted.map((d) => d.aggregateVolume || 3500);
    const avgVolume = volumeValues.reduce((a, b) => a + b, 0) / volumeValues.length;

    return {
      minSora,
      maxSora,
      avgSora,
      latestSora: latest.sora,
      latestIndex: latest.soraIndex,
      avgVolume,
    };
  }, [sorted]);

  // Generate SVG points for chart
  const chartHeight = 220;
  const chartWidth = 800;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };

  const { pointsDaily, points1M, points3M, points6M, yMin, yMax } = useMemo(() => {
    if (sorted.length < 2) {
      return { pointsDaily: '', points1M: '', points3M: '', points6M: '', yMin: 3.0, yMax: 3.8 };
    }

    const allRates: number[] = [];
    sorted.forEach((d) => {
      if (activeSeries.daily) allRates.push(d.sora);
      if (activeSeries.comp1M) allRates.push(d.compounded1M);
      if (activeSeries.comp3M) allRates.push(d.compounded3M);
      if (activeSeries.comp6M) allRates.push(d.compounded6M);
    });

    const rawMin = Math.min(...allRates, 3.0);
    const rawMax = Math.max(...allRates, 3.8);
    const min = Math.floor(rawMin * 10) / 10;
    const max = Math.ceil(rawMax * 10) / 10;

    const innerW = chartWidth - padding.left - padding.right;
    const innerH = chartHeight - padding.top - padding.bottom;

    const getX = (idx: number) => padding.left + (idx / (sorted.length - 1)) * innerW;
    const getY = (val: number) => padding.top + innerH - ((val - min) / (max - min)) * innerH;

    const makePolyline = (getter: (d: MasDailyRate) => number) => {
      return sorted
        .map((d, idx) => `${getX(idx).toFixed(1)},${getY(getter(d)).toFixed(1)}`)
        .join(' ');
    };

    return {
      pointsDaily: makePolyline((d) => d.sora),
      points1M: makePolyline((d) => d.compounded1M),
      points3M: makePolyline((d) => d.compounded3M),
      points6M: makePolyline((d) => d.compounded6M),
      yMin: min,
      yMax: max,
    };
  }, [sorted, activeSeries]);

  const activeHoverPoint = hoveredIndex !== null && sorted[hoveredIndex] ? sorted[hoveredIndex] : null;

  return (
    <div className="space-y-6">
      {/* Overview Stat Badges */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium">Historical Range (Min - Max)</span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {formatPercent(stats.minSora, 3)} - {formatPercent(stats.maxSora, 3)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Span: {((stats.maxSora - stats.minSora) * 100).toFixed(0)} bps</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium">Period Mean SORA</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {formatPercent(stats.avgSora, 4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Daily volume weighted</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium">Current SORA Index</span>
            <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {stats.latestIndex.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">MAS benchmark index</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-medium">Avg Daily Volume</span>
            <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
              S${(stats.avgVolume / 1000).toFixed(2)}B
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Eligible overnight deals</div>
          </div>
        </div>
      )}

      {/* Interactive SORA Trend Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Monetary Authority of Singapore (MAS) SORA Rate Curves
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive timeline of Daily SORA, 1M Compounded, 3M Compounded, and 6M Compounded rates
            </p>
          </div>

          {/* Series Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveSeries({ ...activeSeries, daily: !activeSeries.daily })}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition flex items-center gap-1.5 ${
                activeSeries.daily
                  ? 'bg-slate-800 text-white border-slate-600'
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-200"></span>
              Daily SORA
            </button>
            <button
              onClick={() => setActiveSeries({ ...activeSeries, comp1M: !activeSeries.comp1M })}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition flex items-center gap-1.5 ${
                activeSeries.comp1M
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              1M SORA
            </button>
            <button
              onClick={() => setActiveSeries({ ...activeSeries, comp3M: !activeSeries.comp3M })}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition flex items-center gap-1.5 ${
                activeSeries.comp3M
                  ? 'bg-blue-950 text-blue-300 border-blue-600/50'
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              3M SORA
            </button>
            <button
              onClick={() => setActiveSeries({ ...activeSeries, comp6M: !activeSeries.comp6M })}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition flex items-center gap-1.5 ${
                activeSeries.comp6M
                  ? 'bg-purple-950 text-purple-300 border-purple-600/50'
                  : 'bg-transparent text-slate-500 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              6M SORA
            </button>
          </div>
        </div>

        {/* SVG Curve Container */}
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredIndex(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const ratio = mouseX / rect.width;
              const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(ratio * (sorted.length - 1))));
              setHoveredIndex(idx);
            }}
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const yVal = yMin + ratio * (yMax - yMin);
              const yPos = padding.top + (1 - ratio) * (chartHeight - padding.top - padding.bottom);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={chartWidth - padding.right}
                    y2={yPos}
                    stroke="#334155"
                    strokeDasharray="3 3"
                    strokeWidth="0.8"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 3}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {yVal.toFixed(2)}%
                  </text>
                </g>
              );
            })}

            {/* Date labels on X axis */}
            {sorted.length > 0 && (
              <>
                <text x={padding.left} y={chartHeight - 8} fill="#64748b" fontSize="10" fontFamily="monospace">
                  {sorted[0].date}
                </text>
                <text
                  x={chartWidth / 2}
                  y={chartHeight - 8}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {sorted[Math.floor(sorted.length / 2)]?.date}
                </text>
                <text
                  x={chartWidth - padding.right}
                  y={chartHeight - 8}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {sorted[sorted.length - 1].date}
                </text>
              </>
            )}

            {/* 6M Series */}
            {activeSeries.comp6M && (
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points6M}
              />
            )}

            {/* 3M Series */}
            {activeSeries.comp3M && (
              <polyline
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points3M}
              />
            )}

            {/* 1M Series */}
            {activeSeries.comp1M && (
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points1M}
              />
            )}

            {/* Daily SORA */}
            {activeSeries.daily && (
              <polyline
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsDaily}
              />
            )}

            {/* Hover vertical crosshair */}
            {hoveredIndex !== null && (
              <line
                x1={padding.left + (hoveredIndex / (sorted.length - 1)) * (chartWidth - padding.left - padding.right)}
                y1={padding.top}
                x2={padding.left + (hoveredIndex / (sorted.length - 1)) * (chartWidth - padding.left - padding.right)}
                y2={chartHeight - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* Tooltip Overlay */}
          {activeHoverPoint && (
            <div className="absolute top-2 right-4 bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono pointer-events-none z-20">
              <div className="text-white font-bold pb-1 border-b border-slate-800 flex justify-between gap-4">
                <span>MAS Fixing Date:</span>
                <span className="text-blue-400">{activeHoverPoint.date}</span>
              </div>
              <div className="space-y-1 mt-1.5 text-[11px]">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Daily SORA:</span>
                  <span className="text-white font-bold">{formatPercent(activeHoverPoint.sora, 4)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-400">1M Compounded:</span>
                  <span className="text-white font-bold">{formatPercent(activeHoverPoint.compounded1M, 4)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-blue-400">3M Compounded:</span>
                  <span className="text-white font-bold">{formatPercent(activeHoverPoint.compounded3M, 4)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-purple-400">6M Compounded:</span>
                  <span className="text-white font-bold">{formatPercent(activeHoverPoint.compounded6M, 4)}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Aggregate Vol:</span>
                  <span className="text-amber-300">S${activeHoverPoint.aggregateVolume || 3500}M</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Rates Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Historical MAS Daily Publication Ledger ({filtered.length} Fixings)
            </h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by date (YYYY-MM)..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Publication Date</th>
                <th className="py-2.5 px-4 text-right">Daily SORA</th>
                <th className="py-2.5 px-4 text-right">1M Compounded</th>
                <th className="py-2.5 px-4 text-right">3M Compounded</th>
                <th className="py-2.5 px-4 text-right">6M Compounded</th>
                <th className="py-2.5 px-4 text-right">SORA Index</th>
                <th className="py-2.5 px-4 text-right">Volume (S$M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {[...filtered].reverse().map((row) => (
                <tr key={row.date} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-4 font-bold text-white">{row.date}</td>
                  <td className="py-2 px-4 text-right text-slate-300">{formatPercent(row.sora, 4)}</td>
                  <td className="py-2 px-4 text-right text-emerald-400 font-semibold">{formatPercent(row.compounded1M, 4)}</td>
                  <td className="py-2 px-4 text-right text-blue-400 font-semibold">{formatPercent(row.compounded3M, 4)}</td>
                  <td className="py-2 px-4 text-right text-purple-400">{formatPercent(row.compounded6M, 4)}</td>
                  <td className="py-2 px-4 text-right text-amber-300">{row.soraIndex.toFixed(4)}</td>
                  <td className="py-2 px-4 text-right text-slate-400">S${row.aggregateVolume || 3500}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
