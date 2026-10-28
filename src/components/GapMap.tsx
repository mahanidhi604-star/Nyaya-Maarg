import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Centre, AreaWithGap, Language } from '../types';

interface GapMapProps {
  centres: Centre[];
  areas: AreaWithGap[];
  selectedArea: AreaWithGap | null;
  hoveredArea: string | null;
  whatIfMode: boolean;
  whatIfPos: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onCentreClick: (centre: Centre) => void;
  onAreaHover: (areaId: string | null) => void;
  onAreaClick: (area: AreaWithGap) => void;
  lang: Language;
  threshold: number;
  showPaths?: boolean;
}

const KARNATAKA_CENTER: [number, number] = [14.85, 75.85];
const DEFAULT_ZOOM = 7;

// Color ramp for gap scores matching Nyaya-Maarg sequential Amber-to-Crimson design system
const GAP_COLORS: Record<number, string> = {
  0: '#7BA672', // Well-served (<10km) - muted sage
  1: '#E7B874', // Adequate (10-25km) - amber
  2: '#D97E3A', // Underserved (25-50km) - rust
  3: '#C64E24', // Poorly served (50-75km) - crimson
  4: '#A31D1D', // Critical gap (>75km) - deep maroon
};

export default function GapMap({
  centres,
  areas,
  selectedArea,
  hoveredArea,
  whatIfMode,
  whatIfPos,
  onMapClick,
  onCentreClick,
  onAreaHover,
  onAreaClick,
  lang,
  threshold,
  showPaths = false,
}: GapMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups
  const areasLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const centresLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const pathsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const whatIfLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const connectionLineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: KARNATAKA_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: true,
    });

    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tiles;

    pathsLayerRef.current.addTo(map);
    areasLayerRef.current.addTo(map);
    centresLayerRef.current.addTo(map);
    whatIfLayerRef.current.addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer on dark mode toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!tileLayerRef.current || !mapRef.current) return;
      const isDark = document.documentElement.classList.contains('dark');
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      tileLayerRef.current.setUrl(tileUrl);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Handle map click for What-If simulator
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clickHandler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', clickHandler);
    return () => {
      map.off('click', clickHandler);
    };
  }, [onMapClick]);

  // Update Areas Layer
  useEffect(() => {
    const layer = areasLayerRef.current;
    layer.clearLayers();

    areas.forEach((area) => {
      const isSelected = selectedArea?.id === area.id;
      const isHovered = hoveredArea === area.id;
      const fillColor = GAP_COLORS[area.gap_score] || '#F5A05D';

      // Base radius scaled subtly with population (between 7 and 13px)
      const popFactor = Math.min(Math.max((area.population - 50000) / 400000, 0), 1);
      const baseRadius = 7 + popFactor * 6;
      const radius = isSelected || isHovered ? baseRadius + 3 : baseRadius;

      const marker = L.circleMarker([area.centroid_lat, area.centroid_lng], {
        radius,
        fillColor,
        fillOpacity: isSelected || isHovered ? 0.95 : 0.78,
        color: isSelected ? '#1B7A6E' : isHovered ? '#1C1B18' : '#ffffff',
        weight: isSelected ? 3 : isHovered ? 2 : 1.5,
        className: `area-marker ${area.gap_score >= 3 ? 'high-gap' : ''}`,
      });

      const popupContent = `
        <div style="font-family: var(--font-sans); padding: 12px 14px; min-width: 190px;">
          <div style="font-weight: 700; font-size: 14px; color: var(--color-ink-primary); line-height: 1.2;">
            ${lang === 'kn' ? area.name_kn : area.name}
          </div>
          <div style="font-size: 11px; color: var(--color-ink-tertiary); margin-bottom: 8px;">
            ${area.district} District • Pop: ${area.population.toLocaleString('en-IN')}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding: 4px 8px; border-radius: 4px; background: ${fillColor}22;">
            <span style="font-size: 11px; font-weight: 600; color: ${fillColor};">
              ${area.gap_score >= 3 ? '⚠️ Underserved' : 'Status'}
            </span>
            <span style="font-size: 12px; font-weight: 700; font-family: var(--font-mono); color: var(--color-ink-primary);">
              ${area.nearest_km} km
            </span>
          </div>
          <div style="font-size: 11px; color: var(--color-ink-secondary); line-height: 1.3;">
            Nearest: <strong>${area.nearest_centre_name || 'None mapped'}</strong>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-leaflet-popup',
      });

      marker.on('click', () => {
        onAreaClick(area);
      });

      marker.on('mouseover', () => {
        onAreaHover(area.id);
      });

      marker.on('mouseout', () => {
        onAreaHover(null);
      });

      marker.addTo(layer);
    });
  }, [areas, selectedArea, hoveredArea, lang, onAreaClick, onAreaHover]);

  // Update Centres Layer
  useEffect(() => {
    const layer = centresLayerRef.current;
    layer.clearLayers();

    centres.forEach((centre) => {
      // Create custom SVG Pin for legal-aid centres (Nyaya-Maarg geometric marker)
      const iconHtml = `
        <div style="
          width: 26px;
          height: 26px;
          background: #1D5CA8;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(29,92,168,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: transform 0.15s ease-out;
        " title="${centre.name}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'centre-marker-icon',
        html: iconHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13],
      });

      const marker = L.marker([centre.lat, centre.lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: var(--font-sans); padding: 12px 14px; min-width: 220px;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1D5CA8; margin-bottom: 2px;">
            ${centre.type} ${centre.is_sample ? '<span style="background: #FEF3C7; color: #B45309; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-left: 4px;">SAMPLE</span>' : ''}
          </div>
          <div style="font-weight: 700; font-size: 14px; color: var(--color-ink-primary); line-height: 1.25; margin-bottom: 6px;">
            ${lang === 'kn' ? centre.name_kn : centre.name}
          </div>
          <div style="font-size: 11px; color: var(--color-ink-secondary); margin-bottom: 8px;">
            📍 ${centre.address}
          </div>
          ${
            centre.phone
              ? `<div style="font-size: 11px; font-family: var(--font-mono); color: var(--color-ink-primary); margin-bottom: 8px;">
                  📞 ${centre.phone}
                </div>`
              : ''
          }
          <div style="font-size: 11px; color: var(--color-ink-tertiary);">
            Click marker or side card for full services & directions
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: 'custom-leaflet-popup',
      });

      marker.on('click', () => {
        onCentreClick(centre);
      });

      marker.addTo(layer);
    });
  }, [centres, lang, onCentreClick]);

  // Render signature straight-line paths from underserved areas to nearest centres
  useEffect(() => {
    const layer = pathsLayerRef.current;
    layer.clearLayers();

    if (!showPaths) return;

    // Filter underserved areas (beyond threshold or top gap scores), sorted by distance descending
    const underserved = [...areas]
      .filter((a) => a.nearest_km > threshold && a.nearest_centre_id)
      .sort((a, b) => b.nearest_km - a.nearest_km);

    underserved.forEach((area, index) => {
      const nearest = centres.find((c) => c.id === area.nearest_centre_id);
      if (!nearest) return;

      const isHovered = hoveredArea === area.id;
      const isSelected = selectedArea?.id === area.id;
      const isHighlighted = isHovered || isSelected;

      // Color from Amber-to-Crimson sequential ramp or accent on highlight
      const lineColor = isHighlighted
        ? '#1D5CA8'
        : area.gap_score >= 4
        ? '#A31D1D'
        : area.gap_score >= 3
        ? '#C64E24'
        : '#D97E3A';

      const line = L.polyline(
        [
          [area.centroid_lat, area.centroid_lng],
          [nearest.lat, nearest.lng],
        ],
        {
          color: lineColor,
          weight: isHighlighted ? 3 : 1.25,
          opacity: isHighlighted ? 0.95 : Math.max(0.2, 0.65 - index * 0.015),
          dashArray: isHighlighted ? undefined : '3, 5',
        }
      );

      line.bindTooltip(
        `<div style="font-family: var(--font-sans); font-size: 11px; padding: 2px 4px;">
          <strong>${lang === 'kn' ? area.name_kn : area.name} → ${nearest.name}</strong><br/>
          <span style="font-family: var(--font-mono); color: #C64E24;">${area.nearest_km} km</span>
          <span style="color: #64748b;"> (approx. straight-line distance)</span>
        </div>`,
        { sticky: true, opacity: 0.95 }
      );

      line.addTo(layer);
    });
  }, [areas, centres, threshold, showPaths, hoveredArea, selectedArea, lang]);

  // Connect selected area to its nearest centre with a line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (connectionLineRef.current) {
      connectionLineRef.current.remove();
      connectionLineRef.current = null;
    }

    if (selectedArea && selectedArea.nearest_centre_id) {
      const nearestCentre = centres.find((c) => c.id === selectedArea.nearest_centre_id);
      if (nearestCentre) {
        const polyline = L.polyline(
          [
            [selectedArea.centroid_lat, selectedArea.centroid_lng],
            [nearestCentre.lat, nearestCentre.lng],
          ],
          {
            color: selectedArea.nearest_km > threshold ? '#C64E24' : '#1D5CA8',
            weight: 3,
            dashArray: '5, 6',
            opacity: 0.9,
          }
        ).addTo(map);

        connectionLineRef.current = polyline;
      }
    }
  }, [selectedArea, centres, threshold]);

  // Update What-If Layer
  useEffect(() => {
    const layer = whatIfLayerRef.current;
    layer.clearLayers();

    if (whatIfMode && whatIfPos) {
      // 1. Simulation radius circle
      L.circle([whatIfPos.lat, whatIfPos.lng], {
        radius: threshold * 1000,
        color: '#1D5CA8',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#1D5CA8',
        fillOpacity: 0.15,
      }).addTo(layer);

      // 2. Simulated Centre Marker Pin
      const simIconHtml = `
        <div style="
          width: 32px;
          height: 32px;
          background: #F59E0B;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">
          ★
        </div>
      `;

      const simIcon = L.divIcon({
        className: 'sim-centre-marker',
        html: simIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([whatIfPos.lat, whatIfPos.lng], { icon: simIcon })
        .bindTooltip(`Simulated Legal Aid Centre (${threshold}km reach)`, {
          permanent: true,
          direction: 'top',
          offset: [0, -16],
          className: 'sim-tooltip',
        })
        .addTo(layer);
    }
  }, [whatIfMode, whatIfPos, threshold]);

  // Fly to selected area if changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedArea) return;
    map.flyTo([selectedArea.centroid_lat, selectedArea.centroid_lng], 9, {
      duration: 0.8,
    });
  }, [selectedArea]);

  // Reset view helper
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(KARNATAKA_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
    }
  };

  return (
    <div className="w-full h-full relative" style={{ minHeight: '520px' }}>
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${whatIfMode ? 'cursor-crosshair' : ''}`}
        style={{ minHeight: '520px', zIndex: 1 }}
      />

      {/* Floating Map HUD & Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleResetView}
          className="px-3 py-2 rounded-lg text-xs font-semibold glass transition-all hover:scale-105"
          style={{
            background: 'rgba(250, 248, 245, 0.88)',
            color: 'var(--color-ink-primary)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-surface-2)',
          }}
          title={lang === 'kn' ? 'ನಕ್ಷೆ ಮರುಹೊಂದಿಸಿ' : 'Reset Map View'}
        >
          {lang === 'kn' ? 'ಕರ್ನಾಟಕ ವೀಕ್ಷಣೆ' : 'Reset View'}
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div
        className="absolute bottom-6 left-4 z-20 p-3 rounded-xl glass text-xs"
        style={{
          background: 'rgba(250, 248, 245, 0.92)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-surface-2)',
          maxWidth: '240px',
        }}
      >
        <div className="font-semibold mb-2" style={{ color: 'var(--color-ink-primary)' }}>
          {lang === 'kn' ? 'ಅಂತರ ಮತ್ತು ಸೌಲಭ್ಯ' : 'Distance to Centre'}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GAP_COLORS[0] }} />
            <span style={{ color: 'var(--color-ink-secondary)' }}>&lt; 10 km (Well-served)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GAP_COLORS[1] }} />
            <span style={{ color: 'var(--color-ink-secondary)' }}>10–25 km (Adequate)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GAP_COLORS[2] }} />
            <span style={{ color: 'var(--color-ink-secondary)' }}>25–50 km (Underserved)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GAP_COLORS[3] }} />
            <span style={{ color: 'var(--color-ink-secondary)' }}>50–75 km (Poorly served)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GAP_COLORS[4] }} />
            <span style={{ color: 'var(--color-ink-secondary)' }}>&gt; 75 km (Critical Gap)</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-surface-2)' }}>
            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-white font-bold" style={{ backgroundColor: '#1B7A6E' }}>
              ⚖
            </span>
            <span style={{ color: 'var(--color-ink-secondary)' }}>Legal Aid Centre</span>
          </div>
        </div>
      </div>
    </div>
  );
}
