import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Centre, AreaWithGap } from '../types';
import { CameraController } from '../utils/cameraController';
import {
  MagnifyingGlass,
  SlidersHorizontal,
  ArrowsOutCardinal,
  Compass,
  Plus,
  Minus,
  Warning,
  Eye,
  Info,
} from '@phosphor-icons/react';

export interface GapMapProps {
  centres: Centre[];
  areas?: AreaWithGap[];
  areasWithGap?: AreaWithGap[];
  selectedCentre?: Centre | null;
  selectedCentreId?: string | null;
  onSelectCentre?: (centre: Centre | null) => void;
  onCentreClick?: (centre: Centre | null) => void;
  hoveredArea?: string | null;
  onHoverArea?: (areaId: string | null) => void;
  onAreaHover?: (areaId: string | null) => void;
  selectedArea?: AreaWithGap | null;
  onSelectArea?: (area: AreaWithGap | null) => void;
  onAreaClick?: (area: AreaWithGap | null) => void;
  selectedDistrict?: string | null;
  onSelectDistrict?: (district: string | null) => void;
  whatIfMode?: boolean;
  whatIfPos?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  lang?: 'en' | 'kn';
  threshold?: number;
  dark?: boolean;
  showPaths?: boolean;
  isDrawerOpen?: boolean;
  isBottomSheetOpen?: boolean;
  hideInnerDrawer?: boolean;
  tourStep?: number | null;
  userLocation?: { lat: number; lng: number; label: string } | null;
  onUserLocationClear?: () => void;
}

// Karnataka geographical bounds with protective padding
const KARNATAKA_BOUNDS: L.LatLngBoundsLiteral = [
  [11.59, 74.05], // Southwest (Dakshina Kannada / Kerala border)
  [18.45, 77.58], // Northeast (Bidar / Telangana border)
];
const KARNATAKA_CENTER: L.LatLngTuple = [15.02, 75.82];

// 5-class ColorBrewer single-hue sequential amber ramp
const GAP_RAMP_LIGHT = ['#FEF3C7', '#FDE68A', '#F59E0B', '#D97706', '#92400E'];
const GAP_RAMP_DARK = ['#451A03', '#78350F', '#B45309', '#D97706', '#FBBF24'];

// Normalization alias dictionary to bridge 1990s GeoJSON colonial names with modern Census Kannada names
const DISTRICT_ALIASES: Record<string, string> = {
  'bangalore rural': 'bengaluru rural',
  'bangalore': 'bengaluru urban',
  'bangalore urban': 'bengaluru urban',
  'belgaum': 'belagavi',
  'bellary': 'ballari',
  'bijapur': 'vijayapura',
  'chikmagalur': 'chikkamagaluru',
  'chamarajanagar': 'chamarajanagara',
  'gulbarga': 'kalaburagi',
  'mysore': 'mysuru',
  'shimoga': 'shivamogga',
  'tumkur': 'tumakuru',
  'north kanara': 'uttara kannada',
  'uttar kannad': 'uttara kannada',
  'south kanara': 'dakshina kannada',
  'dakshin kannad': 'dakshina kannada',
  'yadgir': 'yadgir',
};

function normalizeDistrict(name: string): string {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  return DISTRICT_ALIASES[clean] || clean;
}

export const GapMap: React.FC<GapMapProps> = ({
  centres,
  areas,
  areasWithGap: propsAreasWithGap,
  selectedCentre = null,
  selectedCentreId,
  onSelectCentre,
  onCentreClick,
  hoveredArea: _hoveredArea = null,
  onHoverArea,
  onAreaHover,
  selectedArea: _selectedArea = null,
  onSelectArea,
  onAreaClick,
  selectedDistrict = null,
  onSelectDistrict,
  whatIfMode = false,
  whatIfPos = null,
  onMapClick,
  lang = 'en',
  threshold = 25,
  dark = false,
  isDrawerOpen = false,
  isBottomSheetOpen = false,
  tourStep = null,
  userLocation = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const cameraControllerRef = useRef<CameraController>(new CameraController());

  // Leaflet Layer References
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const districtLabelsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pathsLayerRef = useRef<L.LayerGroup | null>(null);
  const coverageLayerRef = useRef<L.LayerGroup | null>(null);
  const whatIfLayerRef = useRef<L.LayerGroup | null>(null);
  const tourLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);

  // Volatile callbacks kept in ref to prevent event listener churn
  const callbacksRef = useRef({
    onSelectCentre,
    onCentreClick,
    onSelectArea,
    onAreaClick,
    onSelectDistrict,
    onHoverArea,
    onAreaHover,
    onMapClick,
  });
  callbacksRef.current = {
    onSelectCentre,
    onCentreClick,
    onSelectArea,
    onAreaClick,
    onSelectDistrict,
    onHoverArea,
    onAreaHover,
    onMapClick,
  };

  const [districtsGeoJson, setDistrictsGeoJson] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showListView, setShowListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [spiderfiedClusterId, setSpiderfiedClusterId] = useState<string | null>(null);

  // Layer Toggles
  const [layers, setLayers] = useState({
    gapShading: true,
    offices: true,
    pathLines: true,
    labels: true,
    reach: false,
    topGaps: true,
  });

  const effectiveAreas = useMemo(() => areas || propsAreasWithGap || [], [areas, propsAreasWithGap]);

  // Active centre from prop or selectedCentreId
  const effectiveSelectedCentre = useMemo(() => {
    if (selectedCentre) return selectedCentre;
    if (selectedCentreId) {
      return centres.find((c) => c.id === selectedCentreId) || null;
    }
    return null;
  }, [selectedCentre, selectedCentreId, centres]);

  // Top 5 underserved taluk areas
  const top5Underserved = useMemo(() => {
    return [...effectiveAreas]
      .sort((a, b) => (b.nearest_km ?? 0) - (a.nearest_km ?? 0))
      .slice(0, 5);
  }, [effectiveAreas]);

  // District Gap Map: aggregated by normalized district
  const districtGapMap = useMemo(() => {
    const map = new Map<string, { gapScore: number; maxDist: number; peopleBeyond: number }>();
    effectiveAreas.forEach((a) => {
      const norm = normalizeDistrict(a.district);
      const curr = map.get(norm) || { gapScore: 0, maxDist: 0, peopleBeyond: 0 };
      const dist = a.nearest_km ?? 0;
      if (dist > curr.maxDist) curr.maxDist = dist;
      if (dist > threshold) curr.peopleBeyond += a.population;
      map.set(norm, curr);
    });

    map.forEach((val, key) => {
      let score = 0;
      if (val.maxDist >= 75) score = 4;
      else if (val.maxDist >= 50) score = 3;
      else if (val.maxDist >= 25) score = 2;
      else if (val.maxDist >= 10) score = 1;
      map.set(key, { ...val, gapScore: score });
    });

    return map;
  }, [effectiveAreas, threshold]);

  // 1. Fetch Karnataka Districts GeoJSON (cached once)
  useEffect(() => {
    let active = true;
    const loadGeoJson = async () => {
      try {
        const res = await fetch('/data/karnataka_districts.geojson');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) setDistrictsGeoJson(data);
      } catch (err: any) {
        console.error('[GapMap] Failed to load GeoJSON boundaries:', err);
        if (active) {
          setLoadError('District boundaries could not be loaded. Switched to fallback list view.');
          setShowListView(true);
        }
      }
    };
    loadGeoJson();
    return () => {
      active = false;
    };
  }, []);

  // 2. Map Singleton Initialization: Created exactly ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      preferCanvas: false,
      minZoom: 6,
      maxZoom: 14,
      maxBounds: [
        [10.5, 73.0],
        [19.5, 79.5],
      ],
      maxBoundsViscosity: 0.8,
    });

    cameraControllerRef.current.attach(map);

    // Initial fit to Karnataka with padding so no edge is clipped
    cameraControllerRef.current.fitBounds(KARNATAKA_BOUNDS, {
      padding: [24, 24],
      maxZoom: 8,
    }, 'initial-fit');

    // Add SVG pattern definition for "No data" hatching in Leaflet renderer
    const svgRenderer = map.getRenderer(new L.Polyline([KARNATAKA_CENTER, KARNATAKA_CENTER]));
    if (svgRenderer) {
      const container = (svgRenderer as any)._container as SVGSVGElement | null;
      if (container) {
        let defs = container.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          container.insertBefore(defs, container.firstChild);
        }
        if (!defs.querySelector('#hatch-pattern')) {
          const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
          pattern.setAttribute('id', 'hatch-pattern');
          pattern.setAttribute('width', '8');
          pattern.setAttribute('height', '8');
          pattern.setAttribute('patternUnits', 'userSpaceOnUse');
          pattern.setAttribute('patternTransform', 'rotate(45)');
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '0');
          line.setAttribute('x2', '0');
          line.setAttribute('y2', '8');
          line.setAttribute('stroke', '#94A3B8');
          line.setAttribute('stroke-width', '2');
          pattern.appendChild(line);
          defs.appendChild(pattern);
        }
      }
    }

    // Initialize layer groups in order of stacking
    districtLabelsLayerRef.current = L.layerGroup().addTo(map);
    coverageLayerRef.current = L.layerGroup().addTo(map);
    pathsLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    userLocationLayerRef.current = L.layerGroup().addTo(map);
    whatIfLayerRef.current = L.layerGroup().addTo(map);
    tourLayerRef.current = L.layerGroup().addTo(map);

    // Global map click listener
    map.on('click', (e) => {
      setSpiderfiedClusterId(null);
      if (callbacksRef.current.onMapClick) {
        callbacksRef.current.onMapClick(e.latlng.lat, e.latlng.lng);
      }
      if (callbacksRef.current.onSelectCentre) {
        callbacksRef.current.onSelectCentre(null);
      }
    });

    // Keyboard navigation: Home key resets view
    map.getContainer().addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        cameraControllerRef.current.resetView(KARNATAKA_BOUNDS, { padding: [24, 24], maxZoom: 8 }, 'reset-view');
      }
    });

    mapRef.current = map;

    return () => {
      cameraControllerRef.current.detach();
      map.remove();
      mapRef.current = null;
    };
  }, []); // Strictly empty: map instance is never torn down on re-render

  // 3. ResizeObserver: Keep map canvas sized without resetting camera
  useEffect(() => {
    const container = mapContainerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, []);

  // 4. District Boundaries GeoJSON Layer (Updated in place, cheap hover styling)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !districtsGeoJson) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    const ramp = dark ? GAP_RAMP_DARK : GAP_RAMP_LIGHT;

    const getDistrictStyle = (normName: string, isSelected: boolean) => {
      const gapInfo = districtGapMap.get(normName);
      let fillColor = ramp[0];
      const fillOpacity = layers.gapShading ? (dark ? 0.65 : 0.78) : (dark ? 0.15 : 0.08);

      if (gapInfo) {
        fillColor = ramp[gapInfo.gapScore];
      } else {
        fillColor = 'url(#hatch-pattern)';
      }

      const borderColor = isSelected
        ? (dark ? '#60A5FA' : '#1D5CA8')
        : (dark ? '#475569' : '#CBD5E1');

      return {
        color: borderColor,
        weight: isSelected ? 2.8 : 1.1,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
      };
    };

    const geoLayer = L.geoJSON(districtsGeoJson, {
      style: (feature) => {
        const rawName = feature?.properties?.NAME_2 || feature?.properties?.district || '';
        const normName = normalizeDistrict(rawName);
        const isSelected = !!selectedDistrict && normalizeDistrict(selectedDistrict) === normName;
        return getDistrictStyle(normName, isSelected);
      },
      onEachFeature: (feature, layer) => {
        const rawName = feature?.properties?.NAME_2 || feature?.properties?.district || '';
        const normName = normalizeDistrict(rawName);
        const gapInfo = districtGapMap.get(normName);

        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              weight: 2.4,
              color: dark ? '#93C5FD' : '#174E91',
              fillOpacity: dark ? 0.85 : 0.92,
            });
            if (target.bringToFront) {
              target.bringToFront();
            }
            if (callbacksRef.current.onHoverArea) {
              callbacksRef.current.onHoverArea(rawName);
            }
          },
          mouseout: (e) => {
            const isSelected = !!selectedDistrict && normalizeDistrict(selectedDistrict) === normName;
            e.target.setStyle(getDistrictStyle(normName, isSelected));
            if (callbacksRef.current.onHoverArea) {
              callbacksRef.current.onHoverArea(null);
            }
          },
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            if (callbacksRef.current.onSelectDistrict) {
              callbacksRef.current.onSelectDistrict(rawName);
            }
          },
        });

        // Fast native Leaflet tooltip
        const labelText = `${rawName} District${gapInfo ? ` • ${gapInfo.maxDist.toFixed(0)} km max gap` : ''}`;
        layer.bindTooltip(labelText, {
          sticky: true,
          direction: 'auto',
          className: 'district-tooltip',
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoLayer;
  }, [districtsGeoJson, districtGapMap, selectedDistrict, dark, layers.gapShading]);

  // 5. District Labels with Zoom and Collision Avoidance
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !districtLabelsLayerRef.current || !districtsGeoJson) return;

    districtLabelsLayerRef.current.clearLayers();
    if (!layers.labels || map.getZoom() < 8) return;

    const pinPoints = centres.map((c) => map.latLngToContainerPoint([c.lat, c.lng]));

    districtsGeoJson.features?.forEach((feature: any) => {
      const rawName = feature.properties?.NAME_2 || feature.properties?.district || '';
      if (!rawName) return;

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
      const centerPoint = map.latLngToContainerPoint([centerLat, centerLng]);

      const nearPin = pinPoints.some((p) => p.distanceTo(centerPoint) < 28);
      if (nearPin) return;

      const labelIcon = L.divIcon({
        className: 'district-map-label',
        html: `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide select-none ${
          dark ? 'bg-slate-900/80 text-slate-200 border border-slate-700' : 'bg-white/85 text-slate-800 border border-slate-200'
        } shadow-sm">${rawName}</span>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10],
      });

      L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(districtLabelsLayerRef.current!);
    });
  }, [districtsGeoJson, centres, dark, layers.labels]);

  // 6. Coverage Reach Buffers (Translucent circle around every legal aid office)
  useEffect(() => {
    if (!coverageLayerRef.current) return;
    coverageLayerRef.current.clearLayers();
    if (!layers.reach) return;

    centres.forEach((centre) => {
      L.circle([centre.lat, centre.lng], {
        radius: threshold * 1000,
        color: '#10B981',
        weight: 1.2,
        dashArray: '3, 4',
        fillColor: '#10B981',
        fillOpacity: dark ? 0.08 : 0.06,
        interactive: false,
      }).addTo(coverageLayerRef.current!);
    });
  }, [centres, threshold, dark, layers.reach]);

  // 7. Path Lines: State-driven, showing Top 5 or Selected/Hovered Gaps Only
  useEffect(() => {
    if (!pathsLayerRef.current) return;
    pathsLayerRef.current.clearLayers();
    if (!layers.pathLines) return;

    const pathsToRender: { from: [number, number]; to: [number, number]; dist: number; label: string; isTop: boolean }[] = [];

    // Selected district gap vectors
    if (selectedDistrict) {
      const normSel = normalizeDistrict(selectedDistrict);
      const districtAreas = effectiveAreas.filter((a) => normalizeDistrict(a.district) === normSel);
      districtAreas.forEach((a) => {
        if (!a.nearest_centre_id) return;
        const c = centres.find((cnt) => cnt.id === a.nearest_centre_id);
        if (c) {
          pathsToRender.push({
            from: [a.centroid_lat, a.centroid_lng],
            to: [c.lat, c.lng],
            dist: a.nearest_km ?? 0,
            label: `${a.name} to ${c.name}`,
            isTop: false,
          });
        }
      });
    }

    // Top 5 underserved gap lines
    if (layers.topGaps && !selectedDistrict) {
      top5Underserved.forEach((a) => {
        if (!a.nearest_centre_id) return;
        const c = centres.find((cnt) => cnt.id === a.nearest_centre_id);
        if (c) {
          pathsToRender.push({
            from: [a.centroid_lat, a.centroid_lng],
            to: [c.lat, c.lng],
            dist: a.nearest_km ?? 0,
            label: `${a.name} (${(a.nearest_km ?? 0).toFixed(0)} km)`,
            isTop: true,
          });
        }
      });
    }

    pathsToRender.forEach((p) => {
      const lineColor = p.isTop ? (dark ? '#F87171' : '#DC2626') : (dark ? '#93C5FD' : '#2563EB');
      L.polyline([p.from, p.to], {
        color: lineColor,
        weight: p.isTop ? 2.5 : 1.8,
        dashArray: '6, 6',
        opacity: 0.85,
        interactive: false,
      }).addTo(pathsLayerRef.current!);

      // Midpoint distance badge
      const midLat = (p.from[0] + p.to[0]) / 2;
      const midLng = (p.from[1] + p.to[1]) / 2;
      const badgeIcon = L.divIcon({
        className: 'distance-badge-icon',
        html: `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-md select-none ${
          dark ? 'bg-slate-900 text-amber-300 border border-amber-600' : 'bg-white text-slate-800 border border-slate-300'
        }">approx ${p.dist.toFixed(0)} km</span>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10],
      });
      L.marker([midLat, midLng], { icon: badgeIcon, interactive: false }).addTo(pathsLayerRef.current!);
    });
  }, [effectiveAreas, centres, selectedDistrict, top5Underserved, dark, layers.pathLines, layers.topGaps]);

  // 8. Office Markers: Shape-encoding, Clustering & Radial Spiderfy
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    if (!layers.offices) return;

    // Cluster detection: group offices within ~3.5km (< 0.035 deg)
    interface Cluster {
      id: string;
      lat: number;
      lng: number;
      centres: Centre[];
    }
    const clusters: Cluster[] = [];
    const CLUSTER_THRESHOLD = 0.035;

    centres.forEach((centre) => {
      let matchedCluster = clusters.find(
        (cl) => Math.abs(cl.lat - centre.lat) < CLUSTER_THRESHOLD && Math.abs(cl.lng - centre.lng) < CLUSTER_THRESHOLD
      );
      if (matchedCluster) {
        matchedCluster.centres.push(centre);
      } else {
        clusters.push({
          id: `cluster-${centre.id}`,
          lat: centre.lat,
          lng: centre.lng,
          centres: [centre],
        });
      }
    });

    clusters.forEach((cl) => {
      const isMulti = cl.centres.length > 1;
      const containsSelected = effectiveSelectedCentre && cl.centres.some((c) => c.id === effectiveSelectedCentre.id);
      const isSpiderfied = spiderfiedClusterId === cl.id || containsSelected;

      // Unexpanded cluster pill
      if (isMulti && !isSpiderfied) {
        const clusterHtml = `
          <div class="cluster-pill flex items-center justify-center rounded-full shadow-lg font-mono font-bold text-xs cursor-pointer border-2 transition-transform hover:scale-110 active:scale-95"
               style="width: 32px; height: 32px; background: ${dark ? '#1E293B' : '#FFFFFF'}; color: ${dark ? '#60A5FA' : '#1D5CA8'}; border-color: ${dark ? '#60A5FA' : '#1D5CA8'};">
            ${cl.centres.length}
          </div>
        `;
        const clusterIcon = L.divIcon({
          className: 'cluster-marker-icon',
          html: clusterHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const m = L.marker([cl.lat, cl.lng], { icon: clusterIcon }).addTo(markersLayerRef.current!);
        m.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSpiderfiedClusterId(cl.id);
        });
        return;
      }

      // Render individual markers (fanned out if cluster is spiderfied)
      cl.centres.forEach((centre, idx) => {
        const isSelected = effectiveSelectedCentre?.id === centre.id;
        let posLat = centre.lat;
        let posLng = centre.lng;

        if (isMulti && isSpiderfied) {
          const angle = (2 * Math.PI * idx) / cl.centres.length;
          const radius = 0.025;
          posLat = cl.lat + radius * Math.cos(angle);
          posLng = cl.lng + radius * Math.sin(angle);

          // Connecting spider stem
          L.polyline([[cl.lat, cl.lng], [posLat, posLng]], {
            color: dark ? '#64748B' : '#94A3B8',
            weight: 1.5,
            dashArray: '2, 3',
            interactive: false,
          }).addTo(markersLayerRef.current!);
        }

        // Shape Encoding: DLSA (Square), TLSC (Circle), SLSA/HCLSC (Diamond), NGO (Rounded)
        let shapeSvg = '';
        const normType = centre.type.toUpperCase();
        const pinSize = isSelected ? 26 : 18;
        const strokeColor = '#FFFFFF';
        const strokeWidth = isSelected ? 3 : 1.5;
        const fillColor = isSelected
          ? '#2563EB'
          : (normType.includes('DLSA') ? '#1D4ED8' : normType.includes('TLSC') ? '#0D9488' : '#7C3AED');

        if (normType.includes('DLSA')) {
          shapeSvg = `<rect x="${strokeWidth}" y="${strokeWidth}" width="${pinSize - 2 * strokeWidth}" height="${pinSize - 2 * strokeWidth}" rx="3" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
        } else if (normType.includes('TLSC')) {
          shapeSvg = `<circle cx="${pinSize / 2}" cy="${pinSize / 2}" r="${pinSize / 2 - strokeWidth}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
        } else if (normType.includes('SLSA') || normType.includes('HCLSC')) {
          shapeSvg = `<polygon points="${pinSize / 2},${strokeWidth} ${pinSize - strokeWidth},${pinSize / 2} ${pinSize / 2},${pinSize - strokeWidth} ${strokeWidth},${pinSize / 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
        } else {
          shapeSvg = `<rect x="${strokeWidth}" y="${strokeWidth}" width="${pinSize - 2 * strokeWidth}" height="${pinSize - 2 * strokeWidth}" rx="7" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
        }

        const markerHtml = `
          <div class="relative flex items-center justify-center ${isSelected ? 'office-pin-selected' : ''}"
               role="button"
               tabindex="0"
               aria-label="${centre.name}, ${centre.type} in ${centre.district}"
               ${isSelected ? 'aria-current="location"' : ''}>
            ${isSelected ? `<div class="absolute -inset-2 rounded-full border-2 border-blue-400 animate-ping opacity-75 pointer-events-none"></div>` : ''}
            <svg width="${pinSize}" height="${pinSize}" viewBox="0 0 ${pinSize} ${pinSize}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              ${shapeSvg}
            </svg>
            ${isSelected ? `
              <div class="absolute -top-7 whitespace-nowrap bg-blue-900 text-white font-bold text-[11px] px-2 py-0.5 rounded shadow-lg pointer-events-none border border-blue-400 z-50">
                ${centre.name}
              </div>
            ` : ''}
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'legal-office-icon',
          html: markerHtml,
          iconSize: [pinSize, pinSize],
          iconAnchor: [pinSize / 2, pinSize / 2],
        });

        const marker = L.marker([posLat, posLng], {
          icon: markerIcon,
          zIndexOffset: isSelected ? 1000 : 10,
        }).addTo(markersLayerRef.current!);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (callbacksRef.current.onSelectCentre) {
            callbacksRef.current.onSelectCentre(centre);
          }
        });
      });
    });
  }, [centres, effectiveSelectedCentre, spiderfiedClusterId, dark, layers.offices]);

  // 9. Camera Controller: Office Selection Move (reason: 'select-office')
  useEffect(() => {
    if (!effectiveSelectedCentre) return;

    const isDesktop = window.innerWidth >= 768;
    const targetZoom = Math.max(mapRef.current?.getZoom() ?? 8, 9);
    const targetLatLng = L.latLng(effectiveSelectedCentre.lat, effectiveSelectedCentre.lng);

    if (isDesktop && isDrawerOpen) {
      // Desktop: Drawer occupies right ~400px. Offset center rightwards by drawerWidth / 2
      const drawerWidth = 400;
      const targetPoint = mapRef.current?.project(targetLatLng, targetZoom);
      if (targetPoint) {
        const offsetPoint = L.point(targetPoint.x + drawerWidth / 2, targetPoint.y);
        const offsetLatLng = mapRef.current?.unproject(offsetPoint, targetZoom);
        if (offsetLatLng) {
          cameraControllerRef.current.flyTo(offsetLatLng, targetZoom, {}, 'select-office');
          return;
        }
      }
    } else if (!isDesktop && isBottomSheetOpen) {
      // Mobile: Bottom sheet occupies bottom ~45vh. Offset center downwards by sheetHeight / 2
      const sheetHeight = Math.min(window.innerHeight * 0.45, 260);
      const targetPoint = mapRef.current?.project(targetLatLng, targetZoom);
      if (targetPoint) {
        const offsetPoint = L.point(targetPoint.x, targetPoint.y + sheetHeight / 2);
        const offsetLatLng = mapRef.current?.unproject(offsetPoint, targetZoom);
        if (offsetLatLng) {
          cameraControllerRef.current.flyTo(offsetLatLng, targetZoom, {}, 'select-office');
          return;
        }
      }
    }

    cameraControllerRef.current.flyTo(targetLatLng, targetZoom, {}, 'select-office');
  }, [effectiveSelectedCentre, isDrawerOpen, isBottomSheetOpen]);

  // 10. Camera Controller: District Selection Move (reason: 'select-district')
  useEffect(() => {
    if (!selectedDistrict || !districtsGeoJson) return;

    const normSel = normalizeDistrict(selectedDistrict);
    const matchedFeature = districtsGeoJson.features?.find((f: any) => {
      const raw = f.properties?.NAME_2 || f.properties?.district || '';
      return normalizeDistrict(raw) === normSel;
    });

    if (matchedFeature) {
      const tempLayer = L.geoJSON(matchedFeature);
      const bounds = tempLayer.getBounds();
      if (bounds.isValid()) {
        cameraControllerRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 }, 'select-district');
      }
    }
  }, [selectedDistrict, districtsGeoJson]);

  // 11. User Location Pin & Camera Move (reason: 'location')
  useEffect(() => {
    if (!userLocationLayerRef.current) return;
    userLocationLayerRef.current.clearLayers();

    if (!userLocation) return;

    const userPinHtml = `
      <div class="user-location-pin relative flex items-center justify-center" style="width: 36px; height: 36px;">
        <div class="absolute -inset-1 rounded-full bg-purple-400 opacity-60 animate-ping pointer-events-none"></div>
        <div class="relative w-6 h-6 rounded-full bg-purple-600 border-2 border-white shadow-xl flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
        <div class="absolute -top-7 whitespace-nowrap bg-purple-950 text-purple-100 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-purple-400 pointer-events-none">
          📍 ${userLocation.label}
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'user-loc-icon',
      html: userPinHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      zIndexOffset: 1200,
    }).addTo(userLocationLayerRef.current);

    cameraControllerRef.current.flyTo([userLocation.lat, userLocation.lng], 10, {}, 'location');
  }, [userLocation]);

  // 12. Guided Tour Visualization (reason: 'tour')
  useEffect(() => {
    if (!tourLayerRef.current) return;
    tourLayerRef.current.clearLayers();
    if (tourStep === null || tourStep === undefined) return;

    const map = mapRef.current;
    if (!map) return;

    if (tourStep === 1) {
      const worstArea = top5Underserved[0];
      if (worstArea) {
        cameraControllerRef.current.setView([worstArea.centroid_lat, worstArea.centroid_lng], 9, {}, 'tour');
        L.circleMarker([worstArea.centroid_lat, worstArea.centroid_lng], {
          radius: 20,
          color: '#DC2626',
          weight: 3,
          fillColor: '#DC2626',
          fillOpacity: 0.2,
        }).addTo(tourLayerRef.current);
      }
    } else if (tourStep === 2) {
      const worstArea = top5Underserved[0];
      if (worstArea && worstArea.nearest_centre_id) {
        const nearest = centres.find((c) => c.id === worstArea.nearest_centre_id);
        if (nearest) {
          cameraControllerRef.current.fitBounds(
            [[worstArea.centroid_lat, worstArea.centroid_lng], [nearest.lat, nearest.lng]],
            { padding: [60, 60] },
            'tour'
          );
          L.polyline([[worstArea.centroid_lat, worstArea.centroid_lng], [nearest.lat, nearest.lng]], {
            color: '#DC2626',
            weight: 3.5,
            dashArray: '5, 5',
          }).addTo(tourLayerRef.current);
        }
      }
    }
  }, [tourStep, top5Underserved, centres]);

  // 13. What-If Facility Placement Marker
  useEffect(() => {
    if (!whatIfLayerRef.current) return;
    whatIfLayerRef.current.clearLayers();
    if (!whatIfMode || !whatIfPos) return;

    L.circleMarker([whatIfPos.lat, whatIfPos.lng], {
      radius: 9,
      color: '#FFFFFF',
      weight: 2.5,
      fillColor: '#F59E0B',
      fillOpacity: 1,
    }).addTo(whatIfLayerRef.current);

    L.circle([whatIfPos.lat, whatIfPos.lng], {
      radius: threshold * 1000,
      color: '#F59E0B',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#F59E0B',
      fillOpacity: 0.14,
    }).addTo(whatIfLayerRef.current);
  }, [whatIfMode, whatIfPos, threshold]);

  // Reset view to default Karnataka bounds via CameraController
  const handleResetView = () => {
    cameraControllerRef.current.resetView(KARNATAKA_BOUNDS, { padding: [24, 24], maxZoom: 8 }, 'reset-view');
  };

  const filteredCentres = useMemo(() => {
    if (!searchQuery.trim()) return centres;
    const q = searchQuery.toLowerCase();
    return centres.filter(
      (c) => c.name.toLowerCase().includes(q) || c.district.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
    );
  }, [centres, searchQuery]);

  return (
    <div
      className="relative w-full h-full min-w-0 min-h-0 overflow-hidden select-none bg-[var(--color-surface-1)]"
      style={{
        position: 'relative',
        isolation: 'isolate',
        contain: 'layout style paint',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* Visually Hidden Live Announcement */}
      <div className="sr-only" aria-live="polite">
        {effectiveSelectedCentre
          ? `Selected ${effectiveSelectedCentre.name}, ${effectiveSelectedCentre.type} in ${effectiveSelectedCentre.district}`
          : 'Selection cleared'}
      </div>

      {/* Top-Left Layer Control Panel Toggle */}
      <div
        className="absolute top-3 left-3 z-[25] transition-all duration-300"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          className="touch-target-44 px-3 py-2 rounded-xl text-xs font-semibold shadow-md border transition-all surface-card hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] flex items-center gap-1.5"
          style={{
            background: isLayerPanelOpen ? 'var(--color-accent-subtle)' : 'var(--color-surface-0)',
            borderColor: isLayerPanelOpen ? 'var(--color-accent)' : 'var(--color-border-subtle)',
            color: isLayerPanelOpen ? 'var(--color-accent)' : 'var(--color-ink-primary)',
          }}
          aria-expanded={isLayerPanelOpen}
          aria-label="Toggle map layer visibility panel"
        >
          <SlidersHorizontal size={16} />
          <span>Layers</span>
        </button>

        {isLayerPanelOpen && (
          <div
            className="mt-2 w-64 p-3.5 rounded-xl shadow-2xl border surface-card space-y-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            style={{
              background: 'var(--color-surface-0)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-secondary)' }}>
                Map Layers
              </span>
              <button
                onClick={() => setIsLayerPanelOpen(false)}
                className="text-xs text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] p-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { key: 'gapShading', label: '5-Class Gap Shading' },
                { key: 'offices', label: 'Legal Aid Offices' },
                { key: 'pathLines', label: 'Straight-Line Gap Paths' },
                { key: 'labels', label: 'District Names (Zoom ≥ 8)' },
                { key: 'reach', label: `Coverage Reach (${threshold} km)` },
                { key: 'topGaps', label: 'Top 5 Underserved Gaps' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[var(--color-surface-1)] cursor-pointer select-none"
                >
                  <span style={{ color: 'var(--color-ink-primary)' }}>{label}</span>
                  <input
                    type="checkbox"
                    checked={(layers as any)[key]}
                    onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                    className="rounded accent-[var(--color-accent)] w-4 h-4 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top-Right Map Controls Toolbar */}
      <div
        className="map-control-toolbar absolute top-3 transition-all duration-300 flex items-center gap-2"
        style={{
          right: isDrawerOpen ? 'calc(min(100vw, 416px) + 12px)' : '12px',
          zIndex: 'var(--z-map-controls, 20)',
          pointerEvents: 'auto',
        }}
      >
        <div className="flex items-center rounded-xl shadow-sm border overflow-hidden surface-card" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <button
            onClick={() => cameraControllerRef.current.zoomIn('user-gesture')}
            className="touch-target-44 w-10 h-10 flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <Plus size={18} />
          </button>
          <div className="w-[1px] h-6 bg-[var(--color-surface-2)]" />
          <button
            onClick={() => cameraControllerRef.current.zoomOut('user-gesture')}
            className="touch-target-44 w-10 h-10 flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Reset View Button */}
        <button
          onClick={handleResetView}
          className="touch-target-44 px-3 rounded-xl text-xs font-semibold shadow-sm border transition-colors surface-card hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] flex items-center gap-1.5"
          style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-0)' }}
          title="Reset map view to Karnataka default bounds (Home key)"
          aria-label="Reset map view"
        >
          <ArrowsOutCardinal size={16} />
          <span className="hidden sm:inline">Reset view</span>
        </button>

        {/* North Compass Indicator */}
        <div
          className="w-10 h-10 rounded-xl shadow-sm border flex items-center justify-center surface-card"
          style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-0)' }}
          title="North Indicator"
          aria-hidden="true"
        >
          <Compass size={20} className="text-[var(--color-accent)] animate-pulse" />
        </div>
      </div>

      {/* Bottom-Right Collapsible Legend */}
      <div
        className="absolute right-3 transition-all duration-300"
        style={{
          bottom: isBottomSheetOpen ? 'calc(min(65dvh, 320px) + 24px)' : '14px',
          zIndex: 'var(--z-map-controls, 20)',
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="touch-target-44 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md border transition-all surface-card flex items-center gap-1.5 hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          style={{
            background: 'var(--color-surface-0)',
            borderColor: isLegendOpen ? 'var(--color-accent)' : 'var(--color-border-subtle)',
            color: 'var(--color-ink-primary)',
          }}
          aria-expanded={isLegendOpen}
          aria-label="Toggle map legend"
        >
          <Info size={16} />
          <span>Legend</span>
        </button>

        {isLegendOpen && (
          <div
            className="mt-2 w-72 p-3.5 rounded-xl shadow-2xl border surface-card space-y-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{
              background: 'var(--color-surface-0)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-secondary)' }}>
                Map Legend
              </span>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="text-xs text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] p-0.5 rounded"
              >
                ✕
              </button>
            </div>

            {/* Shape Encoding Legend */}
            <div>
              <span className="text-[11px] font-semibold block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                Office Types:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-blue-700 flex-shrink-0" />
                  <span>DLSA (Square)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-teal-600 flex-shrink-0" />
                  <span>TLSC (Circle)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rotate-45 bg-purple-700 flex-shrink-0" />
                  <span>SLSA (Diamond)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-indigo-600 flex-shrink-0" />
                  <span>NGO Clinic</span>
                </div>
              </div>
            </div>

            {/* 5-Class Gap Ramp */}
            <div>
              <span className="text-[11px] font-semibold block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                Distance Gap (Sequential Amber):
              </span>
              <div className="flex items-center gap-1 h-3 rounded overflow-hidden">
                {(dark ? GAP_RAMP_DARK : GAP_RAMP_LIGHT).map((color, i) => (
                  <div key={i} className="flex-1 h-full" style={{ background: color }} title={`Class ${i + 1}`} />
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                <span>&lt; 10 km</span>
                <span>25 km</span>
                <span>50 km</span>
                <span>&gt; 75 km</span>
              </div>
            </div>

            {/* Hatching & Path vectors */}
            <div className="pt-2 border-t space-y-1.5 text-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded border border-slate-400" style={{ background: 'repeating-linear-gradient(45deg, #CBD5E1, #CBD5E1 2px, transparent 2px, transparent 6px)' }} />
                <span>No Census Data (Hatched)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
                <span>Top Gap Vector (approx km)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaflet Map DOM Node */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-w-0 min-h-0"
        style={{
          width: '100%',
          height: '100%',
          background: dark ? '#0B0F19' : '#F8FAFC',
        }}
        tabIndex={0}
        aria-label="Karnataka Legal Aid Map Explorer"
      />

      {/* Fallback List View when GeoJSON boundaries fail */}
      {showListView && (
        <div
          className="absolute inset-0 p-6 overflow-y-auto surface-card z-[50]"
          style={{ background: 'var(--color-surface-0)' }}
          role="region"
          aria-label="Legal Aid Centres List View"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {loadError && (
              <div className="p-4 rounded-xl border flex items-center justify-between gap-3 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <Warning size={20} />
                  <span className="text-sm font-medium">{loadError}</span>
                </div>
                <button
                  onClick={() => setShowListView(false)}
                  className="px-3 py-1 rounded text-xs font-semibold border border-current hover:opacity-80"
                >
                  Return to Map
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-ink-primary)' }}>
                  Karnataka Legal Aid Facilities
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-secondary)' }}>
                  Showing {filteredCentres.length} verified state institutions and legal services authorities.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter legal centres..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border surface-card"
                  style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCentres.map((c) => {
                const isSelected = effectiveSelectedCentre?.id === c.id;
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border transition-all surface-card"
                    style={{
                      borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                      background: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface-1)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-[var(--color-accent)]">{c.type}</span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink-tertiary)' }}>
                        {c.district}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm mt-1" style={{ color: 'var(--color-ink-primary)' }}>
                      {lang === 'kn' ? c.name_kn : c.name}
                    </h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-ink-secondary)' }}>
                      {c.address}
                    </p>
                    <div className="mt-3 pt-2.5 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <button
                        onClick={() => {
                          if (callbacksRef.current.onSelectCentre) {
                            callbacksRef.current.onSelectCentre(c);
                          }
                          setShowListView(false);
                        }}
                        className="text-xs font-semibold text-[var(--color-accent-text)] hover:underline flex items-center gap-1"
                      >
                        <Eye size={14} />
                        <span>View on map</span>
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
                      >
                        Directions ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GapMap;

