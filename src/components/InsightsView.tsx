import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area as ReArea, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell
} from 'recharts';
import {
  DownloadSimple, Printer, MapTrifold, Table as TableIcon, ChartBar,
  Funnel, CalendarBlank, ShieldCheck
} from '@phosphor-icons/react';
import type { AreaWithGap, Centre, Area, Language } from '../types';
import {
  computeInsightsKPIs, computeCoverageCurve, computeDistanceHistogram,
  computeDistrictGaps, computeCentresPerLakh, computeServiceBreakdown,
  computeDataQuality, downloadAreasCSV
} from '../utils/insightsStats';
import { formatPopulation } from '../utils/gapAnalysis';
import { t } from '../i18n/translations';

interface InsightsViewProps {
  areasWithGap: AreaWithGap[];
  allAreas: Area[];
  centres: Centre[];
  threshold: number;
  selectedDistrict: string;
  selectedService: string;
  districts: string[];
  serviceTypes: string[];
  onThresholdChange: (val: number) => void;
  onDistrictChange: (dist: string) => void;
  onServiceChange: (service: string) => void;
  onJumpToMap: (district?: string) => void;
  lang: Language;
}

export default function InsightsView({
  areasWithGap,
  allAreas,
  centres,
  threshold,
  selectedDistrict,
  selectedService,
  districts,
  serviceTypes,
  onThresholdChange,
  onDistrictChange,
  onServiceChange,
  onJumpToMap,
  lang,
}: InsightsViewProps) {
  // Toggle states for "View as table" per chart
  const [tableViews, setTableViews] = useState<Record<string, boolean>>({
    coverage: false,
    histogram: false,
    districts: false,
    density: false,
    services: false,
  });

  const toggleTable = (id: string) => {
    setTableViews((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Computations
  const kpis = useMemo(() => {
    return computeInsightsKPIs(areasWithGap, centres, threshold);
  }, [areasWithGap, centres, threshold]);

  const coverageData = useMemo(() => {
    return computeCoverageCurve(areasWithGap);
  }, [areasWithGap]);

  const histogramData = useMemo(() => {
    return computeDistanceHistogram(areasWithGap);
  }, [areasWithGap]);

  const districtGapsData = useMemo(() => {
    return computeDistrictGaps(areasWithGap, threshold);
  }, [areasWithGap, threshold]);

  const densityData = useMemo(() => {
    return computeCentresPerLakh(allAreas, centres);
  }, [allAreas, centres]);

  const serviceData = useMemo(() => {
    return computeServiceBreakdown(centres);
  }, [centres]);

  const dataQuality = useMemo(() => {
    return computeDataQuality(centres, allAreas);
  }, [centres, allAreas]);

  // Color tokens
  const accentColor = '#1B7A6E';
  const dangerColor = '#BD1B28';
  const warningColor = '#E55C42';
  const surfaceBorder = 'var(--color-surface-2)';

  const handleDownloadCSV = () => {
    downloadAreasCSV(areasWithGap, `nyaya_maarg_taluks_${threshold}km.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-12">
      {/* Title & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6" style={{ borderColor: surfaceBorder }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
            >
              {lang === 'kn' ? 'ಆನ್‌ಲೈನ್ ವಿಶ್ಲೇಷಣೆ' : 'Empirical Analysis'}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--color-ink-tertiary)' }}>
              Census 2011 + DLSA Records
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}
          >
            {lang === 'kn' ? 'ನ್ಯಾಯ ಸಾಮೀಪ್ಯ ವಿಶ್ಲೇಷಣಾ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : 'Legal Aid Disparities & Coverage'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-secondary)' }}>
            {lang === 'kn'
              ? 'ತಾಲ್ಲೂಕು ಜನಸಂಖ್ಯೆ ಮತ್ತು ಕಾನೂನು ಸೇವಾ ಪ್ರಾಧಿಕಾರಗಳ ದೂರದ ವಿತರಣೆ.'
              : 'Statistical metrics linking population density and straight-line access to legal aid infrastructure.'}
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="no-print flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-[var(--color-surface-1)]"
            style={{ borderColor: surfaceBorder, color: 'var(--color-ink-primary)', background: 'var(--color-surface-0)' }}
          >
            <DownloadSimple size={16} />
            <span>{lang === 'kn' ? 'CSV ಡೌನ್‌ಲೋಡ್' : 'Export Area CSV'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-[var(--color-surface-1)]"
            style={{ borderColor: surfaceBorder, color: 'var(--color-ink-primary)', background: 'var(--color-surface-0)' }}
          >
            <Printer size={16} />
            <span>{lang === 'kn' ? 'ಮುದ್ರಿಸಿ' : 'Print Briefing'}</span>
          </button>

          <button
            onClick={() => onJumpToMap(selectedDistrict || undefined)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <MapTrifold size={16} />
            <span>{lang === 'kn' ? 'ನಕ್ಷೆಯಲ್ಲಿ ವೀಕ್ಷಿಸಿ' : 'View on Map'}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Global Filter Bar */}
      <div
        className="no-print p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
        style={{ background: 'var(--color-surface-1)', borderColor: surfaceBorder }}
      >
        <div className="flex items-center gap-2">
          <Funnel size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-primary)' }}>
            {lang === 'kn' ? 'ಫಿಲ್ಟರ್‌ಗಳು' : 'Analysis Filters'}:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
          {/* District select */}
          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs border bg-[var(--color-surface-0)] text-[var(--color-ink-primary)] outline-none"
            style={{ borderColor: surfaceBorder }}
            aria-label={t('filter_district', lang)}
          >
            <option value="">{t('all_districts', lang)}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Service select */}
          <select
            value={selectedService}
            onChange={(e) => onServiceChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs border bg-[var(--color-surface-0)] text-[var(--color-ink-primary)] outline-none"
            style={{ borderColor: surfaceBorder }}
            aria-label={t('services', lang)}
          >
            <option value="">{lang === 'kn' ? 'ಎಲ್ಲಾ ಸೇವೆಗಳು' : 'All services'}</option>
            {serviceTypes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Threshold Slider */}
          <div className="flex flex-col justify-center px-2">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--color-ink-secondary)' }}>{t('threshold', lang)}</span>
              <span className="font-mono font-bold" style={{ color: 'var(--color-accent)' }}>
                {threshold} km
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="w-full h-1 cursor-pointer"
              aria-label={t('threshold', lang)}
            />
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: lang === 'kn' ? 'ವಿಶ್ಲೇಷಿಸಲಾದ ತಾಲ್ಲೂಕುಗಳು' : 'Areas Analysed',
            value: kpis.totalAreas.toLocaleString('en-IN'),
            note: 'Census 2011 sub-districts',
          },
          {
            label: lang === 'kn' ? 'ನಕ್ಷೆಗೊಳಿಸಿದ ಕೇಂದ್ರಗಳು' : 'Centres Mapped',
            value: kpis.totalCentres.toLocaleString('en-IN'),
            note: 'DLSAs, TLSCs & clinics',
          },
          {
            label: lang === 'kn' ? 'ಕೊರತೆ ಇರುವ ಜನಸಂಖ್ಯೆ' : 'People Beyond Threshold',
            value: formatPopulation(kpis.peopleBeyond),
            color: dangerColor,
            note: `> ${threshold} km from aid`,
          },
          {
            label: lang === 'kn' ? 'ಜನಸಂಖ್ಯೆ ರಕ್ಷಣೆ (%)' : '% Population Covered',
            value: `${kpis.coveragePercent}%`,
            color: accentColor,
            note: `Within ${threshold} km reach`,
          },
          {
            label: lang === 'kn' ? 'ಮಧ್ಯಮ ಅಂತರ (ಅಂದಾಜು)' : 'Median Area Distance',
            value: `${kpis.medianDistance} km`,
            note: 'Labelled approximate',
          },
        ].map((item, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border transition-all"
            style={{
              background: 'var(--color-surface-0)',
              borderColor: surfaceBorder,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
              {item.label}
            </p>
            <p
              className="text-2xl md:text-3xl font-bold font-mono tracking-tight"
              style={{ color: item.color || 'var(--color-ink-primary)' }}
            >
              {item.value}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
              {item.note}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A: Coverage Curve */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--color-surface-0)', borderColor: surfaceBorder, boxShadow: 'var(--shadow-sm)' }}
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                  {lang === 'kn' ? 'ಸೇವಾ ವ್ಯಾಪ್ತಿ ರೇಖೆ (% ಜನಸಂಖ್ಯೆ vs ಅಂತರ)' : 'Coverage Curve: Reach vs Straight-Line Distance'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                  Cumulative percentage of Karnataka population within straight-line distance X.
                </p>
              </div>
              <button
                onClick={() => toggleTable('coverage')}
                className="p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-1)]"
                style={{ borderColor: surfaceBorder, color: 'var(--color-ink-secondary)' }}
                title="Toggle Table View"
              >
                {tableViews.coverage ? <ChartBar size={16} /> : <TableIcon size={16} />}
              </button>
            </div>

            {tableViews.coverage ? (
              <div className="max-h-64 overflow-y-auto mt-4 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: surfaceBorder }}>
                      <th className="py-2">Distance (km)</th>
                      <th className="py-2">Coverage (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageData.map((row) => (
                      <tr key={row.distance} className="border-b" style={{ borderColor: surfaceBorder }}>
                        <td className="py-1.5 font-mono">{row.distance} km</td>
                        <td className="py-1.5 font-mono">{row.coverage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={coverageData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="covGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                    <XAxis
                      dataKey="distance"
                      tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }}
                      tickFormatter={(v) => `${v}k`}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val ?? 0}% covered`, 'Coverage']}
                      labelFormatter={(label) => `Distance ≤ ${label} km`}
                      contentStyle={{
                        background: 'var(--color-surface-0)',
                        borderColor: surfaceBorder,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      x={threshold}
                      stroke={dangerColor}
                      strokeDasharray="4 4"
                      label={{ value: `${threshold}km cutoff`, position: 'top', fill: dangerColor, fontSize: 10 }}
                    />
                    <ReArea
                      type="monotone"
                      dataKey="coverage"
                      stroke={accentColor}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#covGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <p className="text-[11px] mt-3 pt-3 border-t" style={{ borderColor: surfaceBorder, color: 'var(--color-ink-tertiary)' }}>
            Note: Calculated with Census 2011 centroids. At {threshold} km, {kpis.coveragePercent}% of the total population is within reach.
          </p>
        </div>

        {/* Chart B: Distance Histogram */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--color-surface-0)', borderColor: surfaceBorder, boxShadow: 'var(--shadow-sm)' }}
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                  {lang === 'kn' ? 'ಜನಸಂಖ್ಯೆ ಆಧಾರಿತ ಅಂತರ ವಿತರಣೆ' : 'Population-Weighted Distance Histogram'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                  Distribution of citizens across straight-line distance bands to the nearest centre.
                </p>
              </div>
              <button
                onClick={() => toggleTable('histogram')}
                className="p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-1)]"
                style={{ borderColor: surfaceBorder, color: 'var(--color-ink-secondary)' }}
                title="Toggle Table View"
              >
                {tableViews.histogram ? <ChartBar size={16} /> : <TableIcon size={16} />}
              </button>
            </div>

            {tableViews.histogram ? (
              <div className="max-h-64 overflow-y-auto mt-4 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: surfaceBorder }}>
                      <th className="py-2">Distance Bracket</th>
                      <th className="py-2">Population</th>
                      <th className="py-2">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histogramData.map((row) => (
                      <tr key={row.bin} className="border-b" style={{ borderColor: surfaceBorder }}>
                        <td className="py-1.5">{row.bin}</td>
                        <td className="py-1.5 font-mono">{formatPopulation(row.population)}</td>
                        <td className="py-1.5 font-mono">{row.percentPop}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                    <XAxis dataKey="bin" tick={{ fontSize: 10, fill: 'var(--color-ink-tertiary)' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }}
                      tickFormatter={(v) => formatPopulation(v)}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        typeof val === 'number' ? formatPopulation(val) : String(val ?? ''),
                        'Population'
                      ]}
                      contentStyle={{
                        background: 'var(--color-surface-0)',
                        borderColor: surfaceBorder,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="population" radius={[6, 6, 0, 0]}>
                      {histogramData.map((_entry, index) => {
                        const colors = ['#10B981', '#FBBF24', '#F97316', '#EF4444', '#991B1B'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <p className="text-[11px] mt-3 pt-3 border-t" style={{ borderColor: surfaceBorder, color: 'var(--color-ink-tertiary)' }}>
            Sequential color ramp matches map legend. {histogramData.find((b) => b.bin === '75+ km')?.areaCount || 0} taluks exceed 75 km.
          </p>
        </div>

        {/* Chart C: Ranked District Gaps */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--color-surface-0)', borderColor: surfaceBorder, boxShadow: 'var(--shadow-sm)' }}
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                  {lang === 'kn' ? 'ಜಿಲ್ಲಾವಾರು ಕಾನೂನು ನೆರವು ಕೊರತೆಗಳು' : 'Underserved Population by District'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                  Districts ranked by population living farther than {threshold} km from any mapped centre.
                </p>
              </div>
              <button
                onClick={() => toggleTable('districts')}
                className="p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-1)]"
                style={{ borderColor: surfaceBorder, color: 'var(--color-ink-secondary)' }}
                title="Toggle Table View"
              >
                {tableViews.districts ? <ChartBar size={16} /> : <TableIcon size={16} />}
              </button>
            </div>

            {tableViews.districts ? (
              <div className="max-h-72 overflow-y-auto mt-4 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: surfaceBorder }}>
                      <th className="py-2">District</th>
                      <th className="py-2">People Beyond Cutoff</th>
                      <th className="py-2">Unserved %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtGapsData.slice(0, 10).map((row) => (
                      <tr key={row.district} className="border-b" style={{ borderColor: surfaceBorder }}>
                        <td className="py-1.5 font-medium">{row.district}</td>
                        <td className="py-1.5 font-mono">{formatPopulation(row.peopleBeyond)}</td>
                        <td className="py-1.5 font-mono">{row.unservedPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-72 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={districtGapsData.slice(0, 8)}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-surface-2)" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: 'var(--color-ink-tertiary)' }}
                      tickFormatter={(v) => formatPopulation(v)}
                    />
                    <YAxis
                      dataKey="district"
                      type="category"
                      tick={{ fontSize: 11, fill: 'var(--color-ink-primary)' }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        typeof val === 'number' ? formatPopulation(val) : String(val ?? ''),
                        'People Unserved'
                      ]}
                      contentStyle={{
                        background: 'var(--color-surface-0)',
                        borderColor: surfaceBorder,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="peopleBeyond"
                      fill={dangerColor}
                      radius={[0, 4, 4, 0]}
                      className="cursor-pointer"
                      onClick={(data: any) => {
                        if (data && data.district) {
                          onDistrictChange(data.district);
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] mt-3 pt-3 border-t" style={{ borderColor: surfaceBorder, color: 'var(--color-ink-tertiary)' }}>
            <span>Click any bar to filter and focus that district.</span>
            {selectedDistrict && (
              <button
                onClick={() => onDistrictChange('')}
                className="text-[var(--color-accent)] font-semibold hover:underline"
              >
                Clear district filter ({selectedDistrict})
              </button>
            )}
          </div>
        </div>

        {/* Chart D: Centres per Lakh Population */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--color-surface-0)', borderColor: surfaceBorder, boxShadow: 'var(--shadow-sm)' }}
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                  {lang === 'kn' ? 'ಪ್ರತಿ ಲಕ್ಷ ಜನಸಂಖ್ಯೆಗೆ ಕೇಂದ್ರಗಳ ಸಾಂದ್ರತೆ' : 'Legal Aid Centres per Lakh Population'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                  Ratio of operational legal services authorities relative to district population.
                </p>
              </div>
              <button
                onClick={() => toggleTable('density')}
                className="p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-1)]"
                style={{ borderColor: surfaceBorder, color: 'var(--color-ink-secondary)' }}
                title="Toggle Table View"
              >
                {tableViews.density ? <ChartBar size={16} /> : <TableIcon size={16} />}
              </button>
            </div>

            {tableViews.density ? (
              <div className="max-h-72 overflow-y-auto mt-4 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: surfaceBorder }}>
                      <th className="py-2">District</th>
                      <th className="py-2">Centres</th>
                      <th className="py-2">Per 100k</th>
                    </tr>
                  </thead>
                  <tbody>
                    {densityData.slice(0, 10).map((row) => (
                      <tr key={row.district} className="border-b" style={{ borderColor: surfaceBorder }}>
                        <td className="py-1.5">{row.district}</td>
                        <td className="py-1.5 font-mono">{row.centresCount}</td>
                        <td className="py-1.5 font-mono">{row.centresPerLakh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-72 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={densityData.slice(0, 8)}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                    <XAxis
                      dataKey="district"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 10, fill: 'var(--color-ink-tertiary)' }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} />
                    <Tooltip
                      formatter={(val: any) => [`${val ?? 0} centres / lakh`, 'Density']}
                      contentStyle={{
                        background: 'var(--color-surface-0)',
                        borderColor: surfaceBorder,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="centresPerLakh" fill={accentColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <p className="text-[11px] mt-3 pt-3 border-t" style={{ borderColor: surfaceBorder, color: 'var(--color-ink-tertiary)' }}>
            Calculated as (Centres ÷ District Population) × 100,000. Highlights institutional density versus demand.
          </p>
        </div>
      </div>

      {/* Second Row: Service Breakdown & Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Service Breakdown */}
        <div
          className="lg:col-span-7 p-6 rounded-2xl border"
          style={{ background: 'var(--color-surface-0)', borderColor: surfaceBorder, boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                {lang === 'kn' ? 'ಸೇವಾ ಪ್ರಕಾರಗಳ ಲಭ್ಯತೆ' : 'Service Type Breakdown'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                Volume of mapped centres providing specific aid categories.
              </p>
            </div>
            <button
              onClick={() => toggleTable('services')}
              className="p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-1)]"
              style={{ borderColor: surfaceBorder, color: 'var(--color-ink-secondary)' }}
            >
              {tableViews.services ? <ChartBar size={16} /> : <TableIcon size={16} />}
            </button>
          </div>

          {tableViews.services ? (
            <div className="max-h-60 overflow-y-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: surfaceBorder }}>
                    <th className="py-2">Service</th>
                    <th className="py-2">Centres Offering</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceData.map((row) => (
                    <tr key={row.service} className="border-b" style={{ borderColor: surfaceBorder }}>
                      <td className="py-1.5">{row.service}</td>
                      <td className="py-1.5 font-mono">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData.slice(0, 7)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-2)" />
                  <XAxis
                    dataKey="service"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 10, fill: 'var(--color-ink-tertiary)' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val ?? 0} facilities`, 'Count']}
                    contentStyle={{
                      background: 'var(--color-surface-0)',
                      borderColor: surfaceBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill={warningColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Data Quality & Integrity Panel */}
        <div
          className="lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--color-surface-1)', borderColor: surfaceBorder }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={22} style={{ color: 'var(--color-accent)' }} />
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                {lang === 'kn' ? 'ಡೇಟಾ ಸಮಗ್ರತೆ ಮತ್ತು ಪಾರದರ್ಶಕತೆ' : 'Data Quality & Provenance'}
              </h2>
            </div>
            <p className="text-xs mb-6" style={{ color: 'var(--color-ink-secondary)' }}>
              Explicit verification ratio of legal service authority entries vs synthetic sample bounds.
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-[var(--color-surface-0)]" style={{ borderColor: surfaceBorder }}>
                <span className="font-medium" style={{ color: 'var(--color-ink-primary)' }}>Verified Centres</span>
                <span className="font-mono font-bold" style={{ color: 'var(--color-accent)' }}>
                  {dataQuality.verifiedCentres} / {dataQuality.totalCentres} ({dataQuality.verifiedPercent}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-[var(--color-surface-0)]" style={{ borderColor: surfaceBorder }}>
                <span className="font-medium" style={{ color: 'var(--color-ink-primary)' }}>Sample Labelled Centres</span>
                <span className="font-mono font-bold" style={{ color: 'var(--color-sample-badge)' }}>
                  {dataQuality.sampleCentres} ({Math.round((dataQuality.sampleCentres / dataQuality.totalCentres) * 1000) / 10}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-[var(--color-surface-0)]" style={{ borderColor: surfaceBorder }}>
                <span className="font-medium" style={{ color: 'var(--color-ink-primary)' }}>Oldest Verification Date</span>
                <span className="font-mono" style={{ color: 'var(--color-ink-secondary)' }}>
                  {dataQuality.oldestVerifiedDate}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-[var(--color-surface-0)]" style={{ borderColor: surfaceBorder }}>
                <span className="font-medium" style={{ color: 'var(--color-ink-primary)' }}>Census Boundary Alignment</span>
                <span className="font-mono" style={{ color: 'var(--color-ink-secondary)' }}>
                  {dataQuality.totalAreas} Taluks
                </span>
              </div>
            </div>
          </div>

          <div
            className="mt-6 p-3 rounded-xl flex items-start gap-2 border text-[11px]"
            style={{ background: 'var(--color-surface-0)', borderColor: surfaceBorder, color: 'var(--color-ink-tertiary)' }}
          >
            <CalendarBlank size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              All sample records carry mandatory `SAMPLE` UI badges per hackathon transparency guidelines.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
