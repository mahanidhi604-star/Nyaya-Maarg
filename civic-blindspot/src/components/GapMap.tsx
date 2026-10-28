import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, ArrowsCounterClockwise, MagnifyingGlass,
  ArrowSquareOut, Phone, X, Warning, MapTrifold, List as ListIcon,
  Plus, Minus
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
  isDrawerOpen?: boolean;
  isBottomSheetOpen?: boolean;
  hideInnerDrawer?: boolean;
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
  isDrawerOpen = false,
  isBottomSheetOpen = false,
  hideInnerDrawer = false,
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

  // 2. Initialize Leaflet Map (strictly NO tileLayer — 100% offline blank map with cooperative gestures)
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
      scrollWheelZoom: false, // Cooperative scrolling: scroll wheel active only on focus
      touchZoom: true,
      dragging: true,
    });

    map.on('focus', () => {
      map.scrollWheelZoom.enable();
    });
    map.on('blur', () => {
      map.scrollWheelZoom.disable();
    });

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

  // Sizing: ResizeObserver to trigger invalidateSize whenever container dimensions change
  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ pan: false });
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Invalidate size when drawer or sheet opens/closes
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize({ pan: false });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isDrawerOpen, isBottomSheetOpen, dark, showListView]);

  // 3. Render Karnataka District Boundaries GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
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
      onEachFeature: (_feature, layer) => {
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
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoLayer;
  }, [districtsGeoJson, dark]);

  // 4. Declutter and update district labels based on zoom level and pin collision avoidance
  const updateDistrictLabels = useCallback(() => {
    const map = mapRef.current;
    if (!map || !districtLabelsLayerRef.current || !districtsGeoJson) return;

    districtLabelsLayerRef.current.clearLayers();

    // Show labels only when zoomed in to level 8 or higher
    if (map.getZoom() < 8) return;

    // Get projected pixel coordinates of all legal aid pins
    const pinPoints = centres.map((c) => map.latLngToContainerPoint([c.lat, c.lng]));

    districtsGeoJson.features?.forEach((feature: any) => {
      const districtName = feature.properties?.NAME_2 || feature.properties?.district || '';
      if (!districtName) return;

      const coords = feature.geometry?.coordinates;
      if (!coords) return;

      let sumLat = 0;
      let sumLng = 0;
      let count = 0;
      const extractPoints = (pts: any) => {
        if (typeof pts[0] === 'number') {
          sumLng += pts[0];
          sumLat += pts[1];
          count++;
        } else if (Array.isArray(pts)) {
          pts.forEach(extractPoints);
        }
      };
      extractPoints(coords);
      if (count === 0) return;

      const centerLat = sumLat / count;
      const centerLng = sumLng / count;
      const centerPt = map.latLngToContainerPoint([centerLat, centerLng]);

      // Skip label if an office pin is within 34px to prevent overlapping
      const collidesWithPin = pinPoints.some((p) => {
        const dx = p.x - centerPt.x;
        const dy = p.y - centerPt.y;
        return Math.sqrt(dx * dx + dy * dy) < 34;
      });

      if (collidesWithPin) return;

      const labelHtml = `
        <div style="
          font-family: var(--font-sans);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: ${dark ? '#94A3B8' : '#475569'};
          background: ${dark ? 'rgba(11, 13, 17, 0.75)' : 'rgba(255, 255, 255, 0.75)'};
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
      L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(districtLabelsLayerRef.current!);
    });
  }, [districtsGeoJson, centres, dark]);

  // Hook label updates to zoom and move events
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    updateDistrictLabels();
    map.on('zoomend moveend', updateDistrictLabels);
    return () => {
      map.off('zoomend moveend', updateDistrictLabels);
    };
  }, [updateDistrictLabels]);

  // 5. Render Straight-line Path Vectors (Underserved centroids to nearest centre)
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

  // 6. Render Legal Aid Offices (Centres) Pins
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

  // 7. What-If Simulator Placement Marker & 25km Radius
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

  const showFloatingCentreCard = selectedCentre && !isDrawerOpen && !hideInnerDrawer;

  return (
    <div
      className="map-stacking-context relative w-full h-full min-h-0 min-w-0 flex flex-col rounded-2xl overflow-hidden border"
      style={{
        background: dark ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* Top-Right Unified Map Toolbar: Zoom, Reset, Compass, List View */}
      <div
        className="map-control-toolbar absolute top-3 transition-all duration-300 flex items-center gap-2"
        style={{
          right: isDrawerOpen ? 'calc(min(100vw, 416px) + 12px)' : '12px',
          zIndex: 'var(--z-map-controls, 20)',
        }}
      >
        {/* Zoom In/Out stack */}
        <div
          className="flex items-center rounded-xl border shadow-sm surface-card overflow-hidden"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="touch-target-44 w-11 h-11 flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus size={16} weight="bold" />
          </button>
          <div className="w-[1px] h-5 bg-[var(--color-border-subtle)]" />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="touch-target-44 w-11 h-11 flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus size={16} weight="bold" />
          </button>
        </div>

        {/* Reset View */}
        <button
          onClick={handleResetView}
          className="touch-target-44 px-3 rounded-xl text-xs font-semibold shadow-sm border transition-colors surface-card hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] flex items-center gap-1.5"
          title="Reset map view to Karnataka default bounds"
          aria-label="Reset map view to Karnataka default bounds"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <ArrowsCounterClockwise size={16} weight="bold" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* North Compass Indicator */}
        <div
          className="touch-target-44 w-11 h-11 rounded-xl border shadow-sm surface-card flex items-center justify-center"
          title="North orientation indicator"
          aria-label="North orientation indicator"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <Compass size={20} weight="fill" style={{ color: 'var(--color-accent)' }} />
        </div>

        {/* Toggle List View */}
        <button
          onClick={() => setShowListView(!showListView)}
          className="touch-target-44 px-3 rounded-xl text-xs font-semibold shadow-sm border transition-colors surface-card hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] flex items-center gap-1.5"
          title={showListView ? 'Switch to Map view' : 'Switch to List view'}
          aria-label={showListView ? 'Switch to Map view' : 'Switch to List view'}
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          {showListView ? <MapTrifold size={16} weight="bold" /> : <ListIcon size={16} weight="bold" />}
          <span className="hidden sm:inline">{showListView ? 'Map' : 'List'}</span>
        </button>
      </div>

      {/* Main Map Canvas (Offline Blank Map) */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full min-h-0 min-w-0 ${showListView ? 'hidden' : 'block'}`}
        style={{
          background: dark ? '#0B0D11' : '#F8F9FA',
        }}
      />

      {/* Top-Left What-If Placement Indicator (Non-overlapping with top toolbar) */}
      {whatIfMode && !showListView && (
        <div
          className="absolute top-16 left-3 max-w-[280px] sm:max-w-xs px-3.5 py-2 rounded-xl border shadow-md status-badge-warning text-xs font-medium flex items-center gap-2 pointer-events-none"
          style={{ zIndex: 'var(--z-map-controls, 20)' }}
        >
          <span className="truncate">Click map to simulate facility (25km coverage radius)</span>
        </div>
      )}

      {/* Bottom Scale Indicator (Clear of bottom sheet) */}
      {!showListView && (
        <div
          className="absolute left-3 transition-all duration-300 pointer-events-none"
          style={{
            bottom: isBottomSheetOpen ? 'calc(min(65dvh, 320px) + 24px)' : '14px',
            zIndex: 'var(--z-map-controls, 20)',
          }}
        >
          <div
            className="px-2.5 py-1.5 rounded-lg border text-[11px] font-mono shadow-xs surface-card backdrop-blur-md flex items-center gap-2"
            style={{
              borderColor: 'var(--color-border-subtle)',
              color: 'var(--color-ink-secondary)',
            }}
          >
            <span className="inline-block w-10 border-b-2 border-[var(--color-accent)] pb-0.5 font-bold">50 km</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold">Scale</span>
          </div>
        </div>
      )}

      {/* Warning if GeoJSON load fails */}
      {loadError && (
        <div
          className="absolute top-16 left-3 max-w-sm px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2"
          style={{ zIndex: 'var(--z-map-floating, 30)' }}
        >
          <Warning size={16} />
          <span>{loadError}</span>
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

      {/* Selected Centre Compact Drawer (Only rendered when external full drawer is not controlling it) */}
      {showFloatingCentreCard && (
        <div
          className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 p-5 rounded-2xl border shadow-xl surface-card"
          style={{
            borderColor: 'var(--color-border-strong)',
            zIndex: 'var(--z-map-floating, 30)',
          }}
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
              className="touch-target-44 w-8 h-8 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors flex items-center justify-center"
              style={{ color: 'var(--color-ink-secondary)' }}
              aria-label="Close detail card"
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
