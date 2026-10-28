import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Warning, ArrowsCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import type { Centre, AreaWithGap, Language } from '../types';
import { getGoogleMapsUrl, getPhoneUrl, formatDistance } from '../utils/gapAnalysis';

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

// Center of Karnataka: [lng, lat]
const KARNATAKA_CENTER: [number, number] = [75.85, 14.85];
const DEFAULT_ZOOM = 6.8;

// Color ramp for gap scores matching Nyaya-Maarg sequential Amber-to-Crimson design system
const GAP_COLORS: Record<number, string> = {
  0: '#7BA672', // Well-served (<=10km) - muted sage
  1: '#E7B874', // Adequate (10-25km) - amber
  2: '#D97E3A', // Underserved (25-50km) - rust
  3: '#C64E24', // Poorly served (50-75km) - crimson
  4: '#A31D1D', // Critical gap (>75km) - deep maroon
};

// Generates approximate polygon coordinates for a circle given center and radius in meters
function createGeoJSONCircle(center: [number, number], radiusInMeters: number, points = 64) {
  const coords: [number, number][] = [];
  const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110540;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const centreMarkersRef = useRef<maplibregl.Marker[]>([]);
  const whatIfMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  // MapTiler Key from environment variable - never logged or exposed
  const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY || '';

  const getStyleUrl = useCallback(
    (darkTheme: boolean) => {
      const styleId = darkTheme ? 'dataviz-dark' : 'dataviz-light';
      return `https://api.maptiler.com/maps/${styleId}/style.json?key=${mapTilerKey}`;
    },
    [mapTilerKey]
  );

  // GeoJSON data for areas
  const areasGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: areas.map((a) => {
        const isHovered = hoveredArea === a.id;
        const isSelected = selectedArea?.id === a.id;
        return {
          type: 'Feature' as const,
          id: a.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [a.centroid_lng, a.centroid_lat] as [number, number],
          },
          properties: {
            id: a.id,
            name: a.name,
            name_kn: a.name_kn,
            district: a.district,
            population: a.population,
            nearest_km: a.nearest_km,
            gap_score: a.gap_score,
            nearest_centre_name: a.nearest_centre_name || 'None mapped',
            color: GAP_COLORS[a.gap_score] || GAP_COLORS[2],
            isHovered: isHovered || isSelected,
            isCritical: a.gap_score >= 3,
          },
        };
      }),
    };
  }, [areas, hoveredArea, selectedArea]);

  // GeoJSON data for signature straight-line paths
  const pathsGeoJSON = useMemo(() => {
    if (!showPaths) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    const underserved = [...areas]
      .filter((a) => a.nearest_km > threshold && a.nearest_centre_id)
      .sort((a, b) => b.nearest_km - a.nearest_km);

    const features = underserved.map((area, index) => {
      const nearest = centres.find((c) => c.id === area.nearest_centre_id);
      if (!nearest) return null;

      const isHovered = hoveredArea === area.id;
      const isSelected = selectedArea?.id === area.id;
      const isHighlighted = isHovered || isSelected;

      const lineColor = isHighlighted
        ? '#1D5CA8'
        : area.gap_score >= 4
        ? '#A31D1D'
        : area.gap_score >= 3
        ? '#C64E24'
        : '#D97E3A';

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [area.centroid_lng, area.centroid_lat],
            [nearest.lng, nearest.lat],
          ] as [number, number][],
        },
        properties: {
          areaId: area.id,
          areaName: area.name,
          nearestName: nearest.name,
          nearest_km: area.nearest_km,
          lineColor,
          lineWidth: isHighlighted ? 3.5 : 1.5,
          lineOpacity: isHighlighted ? 1.0 : Math.max(0.25, 0.7 - index * 0.015),
          isHighlighted,
        },
      };
    }).filter(Boolean);

    return {
      type: 'FeatureCollection' as const,
      features: features as any[],
    };
  }, [areas, centres, threshold, showPaths, hoveredArea, selectedArea]);

  // GeoJSON data for connection line between selected area and its nearest centre
  const connectionLineGeoJSON = useMemo(() => {
    if (!selectedArea || !selectedArea.nearest_centre_id) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    const nearest = centres.find((c) => c.id === selectedArea.nearest_centre_id);
    if (!nearest) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [selectedArea.centroid_lng, selectedArea.centroid_lat],
              [nearest.lng, nearest.lat],
            ] as [number, number][],
          },
          properties: {
            color: selectedArea.nearest_km > threshold ? '#C64E24' : '#1D5CA8',
          },
        },
      ],
    };
  }, [selectedArea, centres, threshold]);

  // GeoJSON data for What-If radius circle
  const whatIfRadiusGeoJSON = useMemo(() => {
    if (!whatIfMode || !whatIfPos) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    const circleFeature = createGeoJSONCircle([whatIfPos.lng, whatIfPos.lat], threshold * 1000);
    return {
      type: 'FeatureCollection' as const,
      features: [circleFeature],
    };
  }, [whatIfMode, whatIfPos, threshold]);

  // Setup all custom sources and layers on the MapLibre map
  const setupLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. Paths Source & Layers
    if (!map.getSource('paths-source')) {
      map.addSource('paths-source', {
        type: 'geojson',
        data: pathsGeoJSON,
      });

      map.addLayer({
        id: 'paths-layer',
        type: 'line',
        source: 'paths-source',
        paint: {
          'line-color': ['get', 'lineColor'],
          'line-width': ['get', 'lineWidth'],
          'line-opacity': ['get', 'lineOpacity'],
          'line-dasharray': [3, 2],
        },
      });
    }

    // 2. Selected Connection Line Source & Layer
    if (!map.getSource('connection-line-source')) {
      map.addSource('connection-line-source', {
        type: 'geojson',
        data: connectionLineGeoJSON,
      });

      map.addLayer({
        id: 'connection-line-layer',
        type: 'line',
        source: 'connection-line-source',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.95,
          'line-dasharray': [4, 3],
        },
      });
    }

    // 3. What-If Simulation Radius Source & Layer
    if (!map.getSource('whatif-radius-source')) {
      map.addSource('whatif-radius-source', {
        type: 'geojson',
        data: whatIfRadiusGeoJSON,
      });

      map.addLayer({
        id: 'whatif-radius-fill',
        type: 'fill',
        source: 'whatif-radius-source',
        paint: {
          'fill-color': '#1D5CA8',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: 'whatif-radius-outline',
        type: 'line',
        source: 'whatif-radius-source',
        paint: {
          'line-color': '#1D5CA8',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });
    }

    // 4. Areas (Taluks) Source & Layers
    if (!map.getSource('areas-source')) {
      map.addSource('areas-source', {
        type: 'geojson',
        data: areasGeoJSON,
      });

      // Halo circle for high-gap areas
      map.addLayer({
        id: 'areas-halo-layer',
        type: 'circle',
        source: 'areas-source',
        filter: ['==', ['get', 'isCritical'], true],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 7,
            10, 16,
            14, 28,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.22,
        },
      });

      // Core point circle
      map.addLayer({
        id: 'areas-circle-layer',
        type: 'circle',
        source: 'areas-source',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'isHovered'], false],
            [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, 7,
              10, 12,
              14, 20,
            ],
            [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, 4.5,
              10, 8,
              14, 14,
            ],
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'isHovered'], false],
            2.5,
            1.25,
          ],
          'circle-opacity': 0.95,
        },
      });
    }
  }, [pathsGeoJSON, connectionLineGeoJSON, whatIfRadiusGeoJSON, areasGeoJSON]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!mapTilerKey) {
      setMapError('VITE_MAPTILER_KEY is not configured in .env.local');
      return;
    }

    const dark = document.documentElement.classList.contains('dark');
    const styleUrl = getStyleUrl(dark);

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: KARNATAKA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 5.5,
        maxZoom: 16,
        attributionControl: false,
      });

      // Add Attribution (MapTiler + OpenStreetMap)
      map.addControl(
        new maplibregl.AttributionControl({
          compact: false,
          customAttribution: '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
        }),
        'bottom-right'
      );

      // Add Navigation Controls (Zoom / Pitch)
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      map.on('style.load', () => {
        setMapError(null);
        setupLayers();
      });

      map.on('error', (e: any) => {
        // Log clean diagnostic without exposing secret keys
        const msg = (e.error && e.error.message) || 'Failed to load vector basemap';
        if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')) {
          setMapError('Invalid or unauthorized MapTiler API key. Please check your VITE_MAPTILER_KEY in .env.local');
        } else if (!map.isStyleLoaded()) {
          setMapError('Unable to connect to MapTiler basemap service. Check your internet connection or allowed origins.');
        }
      });

      // Map Click Handler
      map.on('click', (e: any) => {
        if (whatIfMode) {
          onMapClick(e.lngLat.lat, e.lngLat.lng);
          return;
        }

        // Check if clicked on area
        const features = map.queryRenderedFeatures(e.point, { layers: ['areas-circle-layer'] });
        if (features && features.length > 0) {
          const areaId = features[0].properties?.id;
          const foundArea = areas.find((a) => a.id === areaId);
          if (foundArea) {
            onAreaClick(foundArea);
          }
        }
      });

      // Pointer / Hover Handlers for Areas
      map.on('mousemove', 'areas-circle-layer', (e: any) => {
        if (whatIfMode) return;
        map.getCanvas().style.cursor = 'pointer';

        if (e.features && e.features[0]) {
          const props = e.features[0].properties as any;
          onAreaHover(props.id);

          if (!popupRef.current) {
            popupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: 'nyaya-map-popup',
              offset: 12,
            });
          }

          const coordinates = (e.features[0].geometry as any).coordinates.slice();
          const popupHtml = `
            <div style="font-family: var(--font-sans); padding: 8px 10px; min-width: 170px;">
              <div style="font-weight: 700; font-size: 13px; color: var(--color-ink-primary); line-height: 1.2;">
                ${lang === 'kn' ? props.name_kn : props.name}
              </div>
              <div style="font-size: 11px; color: var(--color-ink-tertiary); margin-bottom: 6px;">
                ${props.district} District • Pop: ${Number(props.population).toLocaleString('en-IN')}
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; border-radius: 4px; background: ${props.color}22;">
                <span style="font-size: 10px; font-weight: 700; color: ${props.color};">
                  ${props.isCritical ? '⚠️ Underserved' : 'Status'}
                </span>
                <span style="font-size: 12px; font-weight: 700; font-family: var(--font-mono); color: var(--color-ink-primary);">
                  ${props.nearest_km} km
                </span>
              </div>
              <div style="font-size: 10.5px; color: var(--color-ink-secondary); margin-top: 5px;">
                Nearest: <strong>${props.nearest_centre_name}</strong>
              </div>
            </div>
          `;

          popupRef.current.setLngLat(coordinates).setHTML(popupHtml).addTo(map);
        }
      });

      map.on('mouseleave', 'areas-circle-layer', () => {
        map.getCanvas().style.cursor = '';
        onAreaHover(null);
        if (popupRef.current) {
          popupRef.current.remove();
        }
      });

      mapRef.current = map;
    } catch {
      setMapError('Failed to initialize MapLibre GL engine.');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapTilerKey, getStyleUrl, retryNonce]);

  // Update GeoJSON Sources when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const areasSrc = map.getSource('areas-source') as maplibregl.GeoJSONSource;
    if (areasSrc) {
      areasSrc.setData(areasGeoJSON);
    }

    const pathsSrc = map.getSource('paths-source') as maplibregl.GeoJSONSource;
    if (pathsSrc) {
      pathsSrc.setData(pathsGeoJSON);
    }

    const connSrc = map.getSource('connection-line-source') as maplibregl.GeoJSONSource;
    if (connSrc) {
      connSrc.setData(connectionLineGeoJSON);
    }

    const whatIfSrc = map.getSource('whatif-radius-source') as maplibregl.GeoJSONSource;
    if (whatIfSrc) {
      whatIfSrc.setData(whatIfRadiusGeoJSON);
    }
  }, [areasGeoJSON, pathsGeoJSON, connectionLineGeoJSON, whatIfRadiusGeoJSON]);

  // Dynamic Theme Switching: Preserves camera position, zoom, and re-adds layers
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const map = mapRef.current;
      if (!map) return;

      const currentDark = document.documentElement.classList.contains('dark');
      const newStyle = getStyleUrl(currentDark);

      // Re-setup layers once new vector style finishes loading
      map.once('style.load', () => {
        setupLayers();
      });

      map.setStyle(newStyle);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [getStyleUrl, setupLayers]);

  // Centres Markers: MapLibre HTML Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    centreMarkersRef.current.forEach((m) => m.remove());
    centreMarkersRef.current = [];

    centres.forEach((centre) => {
      const el = document.createElement('div');
      el.className = 'centre-marker-node';
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Legal Aid Centre: ${centre.name}`);

      el.style.cssText = `
        width: 26px;
        height: 26px;
        background: #1D5CA8;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(29, 92, 168, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        transition: transform 0.15s ease-out;
      `;

      el.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <circle cx="12" cy="12" r="8"/>
        </svg>
      `;

      const popupHtml = `
        <div style="font-family: var(--font-sans); padding: 12px 14px; min-width: 210px; max-width: 260px;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1D5CA8; margin-bottom: 2px;">
            ${centre.type} ${centre.is_sample ? '<span style="background: #FEF3C7; color: #B45309; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-left: 4px;">SAMPLE</span>' : ''}
          </div>
          <div style="font-weight: 700; font-size: 13.5px; color: var(--color-ink-primary); line-height: 1.25; margin-bottom: 6px;">
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
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <a href="${getGoogleMapsUrl(centre.lat, centre.lng)}" target="_blank" rel="noopener noreferrer"
               style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 8px; border-radius: 6px; background: var(--color-surface-1); border: 1px solid var(--color-surface-2); color: var(--color-ink-primary); text-decoration: none; font-weight: 500;">
              Google Maps ↗
            </a>
            ${
              centre.phone
                ? `<a href="${getPhoneUrl(centre.phone)}"
                     style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 8px; border-radius: 6px; background: #1D5CA8; color: white; text-decoration: none; font-weight: 600;">
                    Call
                  </a>`
                : ''
            }
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 14, className: 'nyaya-map-popup' }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([centre.lng, centre.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        onCentreClick(centre);
      });

      centreMarkersRef.current.push(marker);
    });
  }, [centres, lang, onCentreClick]);

  // What-If Simulator Marker Pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (whatIfMarkerRef.current) {
      whatIfMarkerRef.current.remove();
      whatIfMarkerRef.current = null;
    }

    if (whatIfMode && whatIfPos) {
      const el = document.createElement('div');
      el.className = 'whatif-marker-node';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: #D97E3A;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 16px rgba(217, 126, 58, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 15px;
      `;
      el.innerHTML = '★';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([whatIfPos.lng, whatIfPos.lat])
        .addTo(map);

      whatIfMarkerRef.current = marker;
    }
  }, [whatIfMode, whatIfPos]);

  // Camera Fly-to for Selected Area (respecting prefers-reduced-motion)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedArea) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    map.flyTo({
      center: [selectedArea.centroid_lng, selectedArea.centroid_lat],
      zoom: Math.max(map.getZoom(), 8.5),
      duration: prefersReducedMotion ? 0 : 900,
      essential: true,
    });
  }, [selectedArea]);

  // Filtered areas for the fallback list alternative
  const filteredListAreas = useMemo(() => {
    if (!listSearch.trim()) return areas.slice(0, 30);
    const q = listSearch.toLowerCase();
    return areas.filter((a) => a.name.toLowerCase().includes(q) || a.district.toLowerCase().includes(q));
  }, [areas, listSearch]);

  return (
    <div className="relative w-full h-full min-h-[360px] flex flex-col bg-[var(--color-surface-1)]">
      {/* MapLibre WebGL Canvas Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full flex-1 ${mapError ? 'hidden' : 'block'}`}
        aria-label="Interactive Map of Karnataka Legal Aid Coverage"
      />

      {/* Designed Fallback & Accessible List Alternative if MapTiler fails or key is missing */}
      {mapError && (
        <div className="w-full h-full flex-1 p-6 flex flex-col justify-between bg-[var(--color-surface-0)] overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--color-status-warning)]/40 bg-[var(--color-status-warning-bg)] text-xs text-[var(--color-status-warning-text)]">
              <Warning size={18} className="shrink-0" />
              <div className="flex-1">
                <span className="font-semibold block">MapTiler Vector Basemap Notice</span>
                <span>{mapError}</span>
              </div>
              <button
                onClick={() => setRetryNonce((n) => n + 1)}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-[var(--color-surface-1)] border border-[var(--color-surface-2)] text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowsCounterClockwise size={13} />
                <span>Retry</span>
              </button>
            </div>

            {/* List Alternative for Map Data */}
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-secondary)]">
                  Data List Alternative ({areas.length} taluks)
                </h4>
                <div className="relative w-48">
                  <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-tertiary)]" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Search taluk..."
                    className="w-full pl-7 pr-2 py-1 text-xs rounded border border-[var(--color-surface-2)] bg-[var(--color-surface-1)] text-[var(--color-ink-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="border border-[var(--color-surface-2)] rounded-lg overflow-hidden bg-[var(--color-surface-1)] max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-ink-secondary)]">
                    <tr>
                      <th className="p-2">Taluk</th>
                      <th className="p-2">District</th>
                      <th className="p-2 text-right">Distance</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-surface-2)]">
                    {filteredListAreas.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => onAreaClick(a)}
                        className="cursor-pointer hover:bg-[var(--color-surface-2)]/60 transition-colors"
                      >
                        <td className="p-2 font-medium text-[var(--color-ink-primary)]">{a.name}</td>
                        <td className="p-2 text-[var(--color-ink-secondary)]">{a.district}</td>
                        <td className="p-2 text-right font-mono text-[var(--color-status-danger)]">
                          {formatDistance(a.nearest_km)}
                        </td>
                        <td className="p-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                            style={{ background: `${GAP_COLORS[a.gap_score]}25`, color: GAP_COLORS[a.gap_score] }}
                          >
                            Score {a.gap_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-surface-2)] text-[11px] text-[var(--color-ink-tertiary)] flex items-center justify-between">
            <span>Config: Add <code className="font-mono text-[var(--color-accent)]">VITE_MAPTILER_KEY=your_key</code> in <code className="font-mono">.env.local</code></span>
            <span>Centres mapped: {centres.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
