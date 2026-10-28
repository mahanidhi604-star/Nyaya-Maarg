import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, ArrowsCounterClockwise, MagnifyingGlass,
  ArrowSquareOut, Phone, X, Warning, MapTrifold, List as ListIcon
} from '@phosphor-icons/react';
import type { Centre, AreaWithGap, Language } from '../types';
import { getGoogleMapsUrl, getPhoneUrl } from '../utils/gapAnalysis';

export interface GapMapProps {
  centres: Centre[];
  areas?: AreaWithGap[];
  areasWithGap?: AreaWithGap[];
  selectedCentre?: Centre | null;
  onSelectCentre?: (centre: Centre | null) => void;
  onCentreClick?: (centre: Centre | null) => void;
  hoveredArea?: string | null;
  onHoverArea?: (areaId: string | null) => void;
  onAreaHover?: (areaId: string | null) => void;
  selectedArea?: AreaWithGap | null;
  onSelectArea?: (area: AreaWithGap | null) => void;
  onAreaClick?: (area: AreaWithGap | null) => void;
  threshold?: number;
  whatIfMode?: boolean;
  whatIfPos?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  lang?: Language;
  dark?: boolean;
  showPaths?: boolean;
}

const KARNATAKA_CENTER: [number, number] = [15.1, 75.8];
const DEFAULT_ZOOM = 7;

export const GapMap: React.FC<GapMapProps> = ({
  centres,
  areas,
  areasWithGap: propsAreasWithGap,
  selectedCentre = null,
  onSelectCentre,
  onCentreClick,
  hoveredArea = null,
  onHoverArea,
  onAreaHover,
  selectedArea = null,
  onSelectArea,
  onAreaClick,
  threshold = 25,
  whatIfMode = false,
  whatIfPos = null,
  onMapClick = () => {},
  lang = 'en',
  dark = false,
  showPaths = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const districtLabelsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pathsLayerRef = useRef<L.LayerGroup | null>(null);
  const whatIfLayerRef = useRef<L.LayerGroup | null>(null);

  const [districtsGeoJson, setDistrictsGeoJson] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveAreas = useMemo(() => areas || propsAreasWithGap || [], [areas, propsAreasWithGap]);

  const handleSelectCentre = useCallback((c: Centre | null) => {
    if (onSelectCentre) onSelectCentre(c);
    if (onCentreClick) onCentreClick(c);
  }, [onSelectCentre, onCentreClick]);

  const handleHoverArea = useCallback((id: string | null) => {
    if (onHoverArea) onHoverArea(id);
    if (onAreaHover) onAreaHover(id);
  }, [onHoverArea, onAreaHover]);

  const handleSelectArea = useCallback((a: AreaWithGap | null) => {
    if (onSelectArea) onSelectArea(a);
    if (onAreaClick) onAreaClick(a);
  }, [onSelectArea, onAreaClick]);

  // 1. Load local GeoJSON boundary file
  const loadBoundaries = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch('/data/karnataka_districts.geojson');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDistrictsGeoJson(data);
    } catch (err: any) {
      console.warn('Local Karnataka boundaries not loaded, continuing with points:', err);
      setLoadError('Local boundary geometry could not be loaded. Displaying legal aid offices and area centroids directly.');
    }
  }, []);

  useEffect(() => {
    loadBoundaries();
  }, [loadBoundaries]);

  // 2. Initialize Leaflet Map (strictly NO tileLayer — 100% offline blank map)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: KARNATAKA_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    // Click handler for What-If simulator
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Layer groups
    districtLabelsLayerRef.current = L.layerGroup().addTo(map);
    pathsLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    whatIfLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  // 3. Render Karnataka District Boundaries GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
    if (districtLabelsLayerRef.current) {
      districtLabelsLayerRef.current.clearLayers();
    }

    if (!districtsGeoJson) return;

    const borderColor = dark ? '#4A5568' : '#CBD5E1';
    const fillColor = dark ? '#13171F' : '#FFFFFF';

    const geoLayer = L.geoJSON(districtsGeoJson, {
      style: () => ({
        color: borderColor,
        weight: 1.2,
        fillColor: fillColor,
        fillOpacity: 0.6,
      }),
      onEachFeature: (feature, layer) => {
        const districtName = feature.properties?.NAME_2 || feature.properties?.district || '';
        
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              weight: 2,
              color: dark ? '#60A5FA' : '#1D5CA8',
              fillOpacity: 0.8,
            });
          },
          mouseout: (e) => {
            geoLayer.resetStyle(e.target);
          },
        });

        // Add lightweight text label at district centroid if valid
        if (districtName && districtLabelsLayerRef.current && (layer as any).getBounds) {
          const center = (layer as any).getBounds().getCenter();
          const labelHtml = `
            <div style="
              font-family: var(--font-sans);
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: ${dark ? '#94A3B8' : '#475569'};
              background: ${dark ? 'rgba(11, 13, 17, 0.7)' : 'rgba(255, 255, 255, 0.7)'};
              padding: 1px 4px;
              border-radius: 3px;
              white-space: nowrap;
              pointer-events: none;
              text-align: center;
            ">
              ${districtName}
            </div>
          `;
          const labelIcon = L.divIcon({
            html: labelHtml,
            className: 'district-label-marker',
            iconSize: [60, 16],
            iconAnchor: [30, 8],
          });
          L.marker(center, { icon: labelIcon, interactive: false }).addTo(districtLabelsLayerRef.current);
        }
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoLayer;
  }, [districtsGeoJson, dark]);

  // 4. Render Straight-line Path Vectors (Underserved centroids to nearest centre)
  useEffect(() => {
    if (!pathsLayerRef.current) return;
    pathsLayerRef.current.clearLayers();
    if (!showPaths) return;

    const underserved = effectiveAreas.filter((a) => a.nearest_km > threshold);

    underserved.forEach((area) => {
      const nearest = area.nearest_centre_id
        ? centres.find((c) => c.id === area.nearest_centre_id)
        : null;
      if (!nearest) return;

      const isHovered = hoveredArea === area.id || selectedArea?.id === area.id;
      const lineColor = isHovered
        ? (dark ? '#60A5FA' : '#1D5CA8')
        : (dark ? '#64748B' : '#94A3B8');

      const polyline = L.polyline(
        [
          [area.centroid_lat, area.centroid_lng],
          [nearest.lat, nearest.lng],
        ],
        {
          color: lineColor,
          weight: isHovered ? 2.5 : 1.2,
          dashArray: '3, 4',
          opacity: isHovered ? 1 : 0.6,
        }
      );

      polyline.bindTooltip(
        `${area.name} to ${nearest.name}: ${area.nearest_km.toFixed(1)} km (approx. straight-line)`,
        { sticky: true, className: 'path-tooltip' }
      );

      polyline.on('mouseover', () => handleHoverArea(area.id));
      polyline.on('mouseout', () => handleHoverArea(null));
      polyline.on('click', () => handleSelectArea(area));

      polyline.addTo(pathsLayerRef.current!);
    });
  }, [effectiveAreas, centres, threshold, hoveredArea, selectedArea, dark, showPaths, handleHoverArea, handleSelectArea]);

  // 5. Render Legal Aid Offices (Centres) Pins
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    centres.forEach((centre) => {
      const isSelected = selectedCentre?.id === centre.id;
      const pinColor = isSelected ? '#154B8B' : (dark ? '#2563EB' : '#1D5CA8');

      const markerHtml = `
        <div style="
          width: ${isSelected ? '24px' : '18px'};
          height: ${isSelected ? '24px' : '18px'};
          background-color: ${pinColor};
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          <div style="width: 5px; height: 5px; background: white; border-radius: 50%;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'office-pin',
        iconSize: [isSelected ? 24 : 18, isSelected ? 24 : 18],
        iconAnchor: [isSelected ? 12 : 9, isSelected ? 12 : 9],
      });

      const marker = L.marker([centre.lat, centre.lng], { icon: customIcon });

      marker.on('click', () => {
        handleSelectCentre(centre);
      });

      marker.bindPopup(`
        <div style="font-family: var(--font-sans); padding: 8px; max-width: 240px; color: #111318;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #1D5CA8; letter-spacing: 0.05em;">
            ${centre.type}
          </div>
          <div style="font-size: 13px; font-weight: 700; margin-top: 2px;">
            ${lang === 'kn' && centre.name_kn ? centre.name_kn : centre.name}
          </div>
          <div style="font-size: 11px; color: #4D535E; margin-top: 4px; line-height: 1.3;">
            ${centre.address}
          </div>
        </div>
      `);

      marker.addTo(markersLayerRef.current!);
    });
  }, [centres, selectedCentre, handleSelectCentre, dark, lang]);

  // 6. What-If Simulator Placement Marker & 25km Radius
  useEffect(() => {
    if (!whatIfLayerRef.current) return;
    whatIfLayerRef.current.clearLayers();

    if (!whatIfMode || !whatIfPos) return;

    const starHtml = `
      <div style="
        width: 28px;
        height: 28px;
        background: #F59E0B;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
        color: white;
        font-size: 14px;
        font-weight: bold;
      ">
        ★
      </div>
    `;

    const starIcon = L.divIcon({
      html: starHtml,
      className: 'whatif-star',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([whatIfPos.lat, whatIfPos.lng], { icon: starIcon }).addTo(whatIfLayerRef.current);

    L.circle([whatIfPos.lat, whatIfPos.lng], {
      radius: 25000, // 25 km
      color: '#F59E0B',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#F59E0B',
      fillOpacity: 0.12,
    }).addTo(whatIfLayerRef.current);
  }, [whatIfMode, whatIfPos]);

  // Reset view to default Karnataka bounds
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView(KARNATAKA_CENTER, DEFAULT_ZOOM, { animate: true });
    }
  };

  // Filtered lists for fallback list view
  const filteredCentres = useMemo(() => {
    if (!searchQuery.trim()) return centres;
    const q = searchQuery.toLowerCase();
    return centres.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
    );
  }, [centres, searchQuery]);

  return (
    <div
      className="relative w-full h-full min-h-[500px] flex flex-col rounded-2xl overflow-hidden border"
      style={{
        background: dark ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* Top Map Toolbar: Orientation, Mode toggle, Reset View */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <button
          onClick={handleResetView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm border transition-colors surface-card hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          title="Reset map view to Karnataka default bounds"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <ArrowsCounterClockwise size={14} weight="bold" />
          <span>Reset View</span>
        </button>

        {/* North Compass Indicator */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg border shadow-sm surface-card"
          title="North orientation indicator"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <Compass size={18} weight="fill" style={{ color: 'var(--color-accent)' }} />
        </div>

        {/* Toggle List View */}
        <button
          onClick={() => setShowListView(!showListView)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm border transition-colors surface-card hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          title={showListView ? 'Switch to Map view' : 'Switch to List view'}
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          {showListView ? <MapTrifold size={14} weight="bold" /> : <ListIcon size={14} weight="bold" />}
          <span>{showListView ? 'Show Map' : 'List View'}</span>
        </button>
      </div>

      {/* Main Map Canvas (Offline Blank Map) */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full min-h-[500px] ${showListView ? 'hidden' : 'block'}`}
        style={{
          background: dark ? '#0B0D11' : '#F8F9FA',
        }}
      />

      {/* Warning if GeoJSON load fails */}
      {loadError && (
        <div className="absolute top-14 left-4 z-[400] max-w-sm px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <Warning size={16} />
          <span>{loadError}</span>
        </div>
      )}

      {/* What-If Mode Banner */}
      {whatIfMode && !showListView && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] px-4 py-2 rounded-xl border shadow-lg status-badge-warning text-xs font-medium flex items-center gap-2"
        >
          <span>Click anywhere in Karnataka on the blank map to place a simulated legal aid centre (25km coverage radius).</span>
        </div>
      )}

      {/* List View Fallback Mode */}
      {showListView && (
        <div className="p-6 flex-1 overflow-y-auto surface-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink-primary)' }}>
                Karnataka Legal Aid Offices Directory
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                {filteredCentres.length} mapped legal services institutions across Karnataka
              </p>
            </div>
            <div className="relative w-64">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search office or district..."
                className="input-control w-full pl-9 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCentres.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCentre(c)}
                className="p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] surface-card"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="status-badge-info text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                    {c.type}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>{c.district}</span>
                </div>
                <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink-primary)' }}>
                  {lang === 'kn' && c.name_kn ? c.name_kn : c.name}
                </h4>
                <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>{c.address}</p>

                <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <a
                    href={getGoogleMapsUrl(c.lat, c.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] font-medium hover:underline"
                    style={{ color: 'var(--color-accent-text)' }}
                  >
                    <ArrowSquareOut size={13} />
                    Google Maps
                  </a>
                  {c.phone && (
                    <a
                      href={getPhoneUrl(c.phone)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[11px] font-medium hover:underline"
                      style={{ color: 'var(--color-accent-text)' }}
                    >
                      <Phone size={13} />
                      Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Centre Detail Drawer */}
      {selectedCentre && (
        <div
          className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[500] p-5 rounded-2xl border shadow-xl surface-card"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="status-badge-info text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                {selectedCentre.type}
              </span>
              <h3 className="text-base font-bold mt-1" style={{ color: 'var(--color-ink-primary)' }}>
                {lang === 'kn' && selectedCentre.name_kn ? selectedCentre.name_kn : selectedCentre.name}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>
                District: {selectedCentre.district}
              </p>
            </div>
            <button
              onClick={() => handleSelectCentre(null)}
              className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
            {selectedCentre.address}
          </p>

          <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <a
              href={getGoogleMapsUrl(selectedCentre.lat, selectedCentre.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors surface-card hover:bg-[var(--color-surface-2)]"
              style={{ borderColor: 'var(--color-border-strong)' }}
            >
              <ArrowSquareOut size={14} />
              Open in Maps
            </a>
            {selectedCentre.phone && (
              <a
                href={getPhoneUrl(selectedCentre.phone)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                <Phone size={14} />
                Call Office
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GapMap;
