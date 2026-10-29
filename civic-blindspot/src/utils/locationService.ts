import type { Area, Centre } from '../types';

export interface LocationMatch {
  label: string;
  district: string;
  lat: number;
  lng: number;
  type: 'district' | 'taluk' | 'pincode' | 'online';
}

/**
 * Offline matching against bundled Karnataka districts, taluks, and pincodes.
 * Fast, synchronous, privacy-preserving, zero network requests.
 */
export function searchLocationsOffline(
  query: string,
  districts: string[],
  areas: Area[],
  centres: Centre[]
): LocationMatch[] {
  const cleanQ = query.trim().toLowerCase();
  if (cleanQ.length < 2) return [];

  const results: LocationMatch[] = [];
  const seenDistricts = new Set<string>();

  // 1. Pincode match (6-digit check)
  const isPincode = /^\d{3,6}$/.test(cleanQ);
  if (isPincode) {
    for (const c of centres) {
      if (c.address && c.address.includes(cleanQ)) {
        results.push({
          label: `${cleanQ} (${c.district})`,
          district: c.district,
          lat: c.lat,
          lng: c.lng,
          type: 'pincode',
        });
        break;
      }
    }
  }

  // 2. District matches
  for (const d of districts) {
    if (d.toLowerCase().includes(cleanQ)) {
      seenDistricts.add(d.toLowerCase());
      // Find average centroid from areas in this district
      const districtAreas = areas.filter((a) => a.district.toLowerCase() === d.toLowerCase());
      const avgLat = districtAreas.length > 0
        ? districtAreas.reduce((sum, a) => sum + a.centroid_lat, 0) / districtAreas.length
        : 14.5;
      const avgLng = districtAreas.length > 0
        ? districtAreas.reduce((sum, a) => sum + a.centroid_lng, 0) / districtAreas.length
        : 75.8;

      results.push({
        label: `${d} District`,
        district: d,
        lat: avgLat,
        lng: avgLng,
        type: 'district',
      });
    }
  }

  // 3. Taluk matches
  for (const a of areas) {
    if (a.name.toLowerCase().includes(cleanQ) || (a.name_kn && a.name_kn.includes(cleanQ))) {
      results.push({
        label: `${a.name} (Taluk, ${a.district})`,
        district: a.district,
        lat: a.centroid_lat,
        lng: a.centroid_lng,
        type: 'taluk',
      });
      if (results.length >= 8) break;
    }
  }

  return results.slice(0, 8);
}

/**
 * Online Geocoding via Nominatim/OSM.
 * Strictly run ONLY on explicit user submit (Enter key or Submit button).
 * Never triggered per keystroke.
 * Timeout: 4000ms.
 */
export async function geocodeLocationOnline(
  query: string,
  districts: string[]
): Promise<LocationMatch[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&state=Karnataka&q=${encodeURIComponent(cleanQ)}&limit=4`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Geocoding HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const displayName = item.display_name || cleanQ;

      // Detect district name from display string or match against known Karnataka districts
      let matchedDistrict = '';
      const lowerDisplay = displayName.toLowerCase();
      for (const d of districts) {
        if (lowerDisplay.includes(d.toLowerCase())) {
          matchedDistrict = d;
          break;
        }
      }

      if (!matchedDistrict) {
        matchedDistrict = 'Karnataka';
      }

      const shortLabel = displayName.split(',').slice(0, 3).join(', ');

      return {
        label: shortLabel,
        district: matchedDistrict,
        lat,
        lng,
        type: 'online' as const,
      };
    });
  } catch (err: any) {
    clearTimeout(timer);
    console.warn('[LocationService] Geocoding request failed or timed out:', err.message);
    throw err;
  }
}

/**
 * Determine district for a lat/lng using ray-casting point-in-polygon against GeoJSON features.
 */
export function findDistrictForLatLng(
  lat: number,
  lng: number,
  districtsGeoJson: any,
  fallbackDistricts: string[]
): string {
  if (districtsGeoJson?.features) {
    for (const feature of districtsGeoJson.features) {
      const geom = feature.geometry;
      const districtName = feature.properties?.NAME_2 || feature.properties?.district;
      if (!districtName || !geom) continue;

      if (geom.type === 'Polygon') {
        if (pointInPolygon([lng, lat], geom.coordinates[0])) {
          return districtName;
        }
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (pointInPolygon([lng, lat], poly[0])) {
            return districtName;
          }
        }
      }
    }
  }

  return fallbackDistricts[0] || 'Karnataka';
}

function pointInPolygon(point: [number, number], vs: number[][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

