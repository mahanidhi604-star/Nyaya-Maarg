import React, { useRef, useEffect } from 'react';
import type { Centre, AreaWithGap } from '../types';
import {
  WarningCircle,
  MapPin,
  ArrowSquareOut,
  Phone,
  Eye,
  Funnel,
  Check,
} from '@phosphor-icons/react';
import { getNeighbouringDistricts } from '../utils/neighbouringDistricts';

export type ExplorerTab = 'offices' | 'gaps' | 'near-you';

export interface ExplorerTabsProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  centres: Centre[];
  filteredCentres: Centre[];
  areasWithGap: AreaWithGap[];
  districts: string[];
  districtCounts: Record<string, number>;
  serviceTypes: string[];
  serviceCounts: Record<string, number>;
  centreTypes: string[];
  typeCounts: Record<string, number>;
  selectedDistrict: string;
  onSelectDistrict: (d: string) => void;
  selectedType: string;
  onSelectType: (t: string) => void;
  selectedService: string;
  onSelectService: (s: string) => void;
  threshold: number;
  onThresholdChange: (th: number) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  selectedCentre: Centre | null;
  onSelectCentre: (c: Centre | null) => void;
  onHoverCentre?: (c: Centre | null) => void;
  hoveredCentreId?: string | null;
  userLocation: { lat: number; lng: number; label: string; district: string } | null;
  onClearUserLocation: () => void;
  onNavigateToNavigator: () => void;
  lang?: 'en' | 'kn';
}

export const ExplorerTabs: React.FC<ExplorerTabsProps> = ({
  activeTab,
  onTabChange,
  centres,
  filteredCentres,
  areasWithGap,
  districts,
  districtCounts,
  serviceTypes,
  serviceCounts,
  centreTypes,
  typeCounts,
  selectedDistrict,
  onSelectDistrict,
  selectedType,
  onSelectType,
  selectedService,
  onSelectService,
  threshold,
  onThresholdChange,
  onClearFilters,
  hasActiveFilters,
  selectedCentre,
  onSelectCentre,
  onHoverCentre,
  hoveredCentreId,
  userLocation,
  onClearUserLocation,
  onNavigateToNavigator,
  lang = 'en',
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);
  const officesPanelRef = useRef<HTMLDivElement>(null);
  const gapsPanelRef = useRef<HTMLDivElement>(null);
  const nearYouPanelRef = useRef<HTMLDivElement>(null);

  // Available tabs: include 'near-you' only when userLocation is set
  const tabs: { id: ExplorerTab; label: string; count?: number }[] = [
    { id: 'offices', label: 'Offices', count: filteredCentres.length },
    { id: 'gaps', label: 'Gaps (Districts)', count: districts.length },
    ...(userLocation ? [{ id: 'near-you' as const, label: 'Near you' }] : []),
  ];

  // WAI-ARIA Keyboard navigation for Tabs (ArrowLeft, ArrowRight, Home, End)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    onTabChange(tabs[nextIndex].id);
    const targetBtn = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex];
    targetBtn?.focus();
  };

  // Aggregate district deficit ranking for Gaps tab
  const districtRankings = React.useMemo(() => {
    const map = new Map<string, { maxGap: number; peopleBeyond: number; talukCount: number }>();
    districts.forEach((d) => {
      map.set(d, { maxGap: 0, peopleBeyond: 0, talukCount: 0 });
    });

    areasWithGap.forEach((a) => {
      const curr = map.get(a.district) || { maxGap: 0, peopleBeyond: 0, talukCount: 0 };
      curr.talukCount++;
      const dist = a.nearest_km ?? 0;
      if (dist > curr.maxGap) curr.maxGap = dist;
      if (dist > threshold) curr.peopleBeyond += a.population;
      map.set(a.district, curr);
    });

    return Array.from(map.entries())
      .map(([district, data]) => ({ district, ...data }))
      .sort((a, b) => b.peopleBeyond - a.peopleBeyond || b.maxGap - a.maxGap);
  }, [districts, areasWithGap, threshold]);

  // Near You Tab: legal offices in user's detected district, sorted ALPHABETICALLY (never by distance)
  const nearYouOffices = React.useMemo(() => {
    if (!userLocation) return [];
    return centres
      .filter((c) => c.district.toLowerCase() === userLocation.district.toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [centres, userLocation]);

  // Neighbouring districts if current district has zero legal aid offices
  const neighbouringDistricts = React.useMemo(() => {
    if (!userLocation || nearYouOffices.length > 0) return [];
    return getNeighbouringDistricts(userLocation.district);
  }, [userLocation, nearYouOffices]);

  // Scroll active office into view
  useEffect(() => {
    if (selectedCentre && activeTab === 'offices') {
      const row = document.getElementById(`office-row-${selectedCentre.id}`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedCentre, activeTab]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* WAI-ARIA TabList */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Explorer Categories"
        onKeyDown={handleKeyDown}
        className="flex items-center border-b border-[var(--color-surface-2)] mb-3 flex-shrink-0"
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className="touch-target-44 relative py-2.5 px-3.5 text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-t-lg"
              style={{
                color: isSelected ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
                borderBottom: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                  style={{
                    background: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface-2)',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-ink-tertiary)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB PANEL 1: OFFICES */}
      <div
        ref={officesPanelRef}
        role="tabpanel"
        id="panel-offices"
        aria-labelledby="tab-offices"
        tabIndex={0}
        hidden={activeTab !== 'offices'}
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 focus-visible:outline-none"
      >
        {/* Filters Header */}
        <div className="space-y-2.5 p-3 rounded-xl border surface-card" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
              <Funnel size={14} />
              <span>Filter Offices</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-[11px] font-semibold text-[var(--color-accent-text)] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <select
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border surface-card text-xs"
              style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
              aria-label="Filter by district"
            >
              <option value="">All Districts (31)</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d} {districtCounts[d] ? `(${districtCounts[d]})` : ''}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => onSelectType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border surface-card text-xs"
              style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
              aria-label="Filter by office type"
            >
              <option value="">All Office Types</option>
              {centreTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({typeCounts[t] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <select
              value={selectedService}
              onChange={(e) => onSelectService(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border surface-card text-xs"
              style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
              aria-label="Filter by service"
            >
              <option value="">All Services</option>
              {serviceTypes.map((s) => (
                <option key={s} value={s}>
                  {s} ({serviceCounts[s] || 0})
                </option>
              ))}
            </select>

            {/* Threshold preset pill buttons */}
            <div className="flex items-center gap-1">
              {[10, 25, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onThresholdChange(preset)}
                  className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                    threshold === preset
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-3)]'
                  }`}
                  aria-pressed={threshold === preset}
                >
                  {preset}km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Office Rows List */}
        <div className="space-y-2">
          {filteredCentres.length === 0 ? (
            <div className="p-6 text-center rounded-xl border surface-card space-y-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
                No offices match these filters.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredCentres.map((centre) => {
              const isSelected = selectedCentre?.id === centre.id;
              const isHovered = hoveredCentreId === centre.id;
              return (
                <button
                  key={centre.id}
                  id={`office-row-${centre.id}`}
                  type="button"
                  onClick={() => onSelectCentre(isSelected ? null : centre)}
                  onMouseEnter={() => onHoverCentre?.(centre)}
                  onMouseLeave={() => onHoverCentre?.(null)}
                  className={`w-full text-left p-3 rounded-xl border transition-all touch-target-44 surface-card flex items-start justify-between gap-3 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                    isSelected ? 'ring-2 ring-[var(--color-accent)] font-semibold' : ''
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                    background: isSelected
                      ? 'var(--color-accent-subtle)'
                      : isHovered
                      ? 'var(--color-surface-2)'
                      : 'var(--color-surface-0)',
                  }}
                  aria-selected={isSelected}
                  aria-label={`${centre.name}, ${centre.type} in ${centre.district}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded status-badge-info">
                        {centre.type}
                      </span>
                      <span className="text-xs font-medium text-[var(--color-ink-tertiary)] truncate">
                        {centre.district}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-[var(--color-accent)] flex items-center gap-0.5">
                          <Check size={12} weight="bold" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs truncate" style={{ color: 'var(--color-ink-primary)' }}>
                      {lang === 'kn' ? centre.name_kn : centre.name}
                    </h4>
                    <p className="text-[11px] text-[var(--color-ink-secondary)] truncate mt-0.5">
                      {centre.address}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
                    <span className="text-[11px] font-semibold text-[var(--color-accent-text)] flex items-center gap-1">
                      <Eye size={13} />
                      <span>{isSelected ? 'Selected' : 'View'}</span>
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* TAB PANEL 2: GAPS (DISTRICTS) */}
      <div
        ref={gapsPanelRef}
        role="tabpanel"
        id="panel-gaps"
        aria-labelledby="tab-gaps"
        tabIndex={0}
        hidden={activeTab !== 'gaps'}
        className="flex-1 overflow-y-auto space-y-2 pr-1 focus-visible:outline-none"
      >
        <div className="p-2.5 rounded-lg bg-[var(--color-surface-1)] border text-[11px] text-[var(--color-ink-secondary)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
          Ranked by citizens beyond the {threshold} km reach threshold. Click any district to zoom and view gap vectors.
        </div>

        {districtRankings.map((rankItem, idx) => {
          const isSelected = selectedDistrict.toLowerCase() === rankItem.district.toLowerCase();
          return (
            <button
              key={rankItem.district}
              type="button"
              onClick={() => onSelectDistrict(isSelected ? '' : rankItem.district)}
              className={`w-full text-left p-3 rounded-xl border transition-all touch-target-44 surface-card flex items-center justify-between gap-3 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                isSelected ? 'ring-2 ring-[var(--color-accent)] font-semibold' : ''
              }`}
              style={{
                borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                background: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface-0)',
              }}
              aria-selected={isSelected}
              aria-label={`${rankItem.district} District, rank ${idx + 1}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0"
                  style={{
                    background: idx < 5 ? 'var(--color-status-danger-bg)' : 'var(--color-surface-2)',
                    color: idx < 5 ? 'var(--color-status-danger)' : 'var(--color-ink-secondary)',
                  }}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate" style={{ color: 'var(--color-ink-primary)' }}>
                    {rankItem.district} District
                  </h4>
                  <p className="text-[11px] text-[var(--color-ink-tertiary)]">
                    {rankItem.peopleBeyond.toLocaleString()} beyond {threshold}km
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-mono font-bold text-xs text-[var(--color-status-danger)] block">
                  approx {rankItem.maxGap.toFixed(0)} km
                </span>
                <span className="text-[10px] text-[var(--color-ink-tertiary)]">max taluk gap</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB PANEL 3: NEAR YOU (Rendered when user location is chosen) */}
      {userLocation && (
        <div
          ref={nearYouPanelRef}
          role="tabpanel"
          id="panel-near-you"
          aria-labelledby="tab-near-you"
          tabIndex={0}
          hidden={activeTab !== 'near-you'}
          className="flex-1 overflow-y-auto space-y-3.5 pr-1 focus-visible:outline-none"
        >
          {/* Location Summary Header */}
          <div
            className="p-3.5 rounded-xl border space-y-2 surface-card"
            style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-accent)]">
                    Your Detected District
                  </span>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--color-ink-primary)' }}>
                    {userLocation.district} District
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearUserLocation}
                className="text-[11px] font-semibold text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
              <WarningCircle size={14} className="flex-shrink-0" />
              <span>Potential gap, needs ground verification.</span>
            </div>
          </div>

          {/* Alphabetical List of Legal Aid Offices in this District */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
                Legal Offices in {userLocation.district} ({nearYouOffices.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--color-ink-tertiary)]">
                Sorted Alphabetically
              </span>
            </div>

            {nearYouOffices.length === 0 ? (
              <div
                className="p-4 rounded-xl border space-y-3 surface-card text-xs"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  No mapped legal aid office in this district. This may be a data gap or an access gap.
                </p>
                {neighbouringDistricts.length > 0 && (
                  <div>
                    <span className="font-semibold block mb-1" style={{ color: 'var(--color-ink-primary)' }}>
                      Adjacent administrative districts with offices:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {neighbouringDistricts.map((nd) => (
                        <button
                          key={nd}
                          type="button"
                          onClick={() => {
                            onSelectDistrict(nd);
                            onTabChange('offices');
                          }}
                          className="px-2 py-1 rounded text-xs border surface-card hover:bg-[var(--color-surface-2)]"
                          style={{ borderColor: 'var(--color-border-subtle)' }}
                        >
                          {nd}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <button
                    type="button"
                    onClick={onNavigateToNavigator}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <span>Need Help? Open Legal Navigator</span>
                    <ArrowSquareOut size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {nearYouOffices.map((office) => {
                  const isSelected = selectedCentre?.id === office.id;
                  const gmapsDirUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                    userLocation.label
                  )}&destination=${office.lat},${office.lng}`;

                  return (
                    <div
                      key={office.id}
                      className="p-3.5 rounded-xl border surface-card space-y-2.5 transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                        background: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface-0)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded status-badge-info">
                            {office.type}
                          </span>
                          <h4 className="font-bold text-xs mt-1" style={{ color: 'var(--color-ink-primary)' }}>
                            {lang === 'kn' ? office.name_kn : office.name}
                          </h4>
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--color-ink-secondary)]">
                        {office.address}
                      </p>

                      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => onSelectCentre(office)}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-white transition-opacity hover:opacity-90"
                          style={{ background: 'var(--color-accent)' }}
                        >
                          <Eye size={14} />
                          <span>View on map</span>
                        </button>

                        <a
                          href={gmapsDirUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 surface-card hover:bg-[var(--color-surface-2)] transition-colors"
                          style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
                        >
                          <ArrowSquareOut size={14} />
                          <span>Directions</span>
                        </a>

                        {office.phone && (
                          <a
                            href={`tel:${office.phone}`}
                            className="p-1.5 rounded-lg border surface-card hover:bg-[var(--color-surface-2)] text-[var(--color-ink-primary)]"
                            style={{ borderColor: 'var(--color-border-subtle)' }}
                            title={`Call ${office.phone}`}
                            aria-label={`Call ${office.phone}`}
                          >
                            <Phone size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
