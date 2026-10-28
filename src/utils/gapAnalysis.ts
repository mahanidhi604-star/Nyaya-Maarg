import type { Centre, Area, AreaWithGap, GapSummary } from '../types';

/**
 * Haversine formula to compute straight-line distance between two lat/lng points.
 * Returns distance in kilometers. Always labelled "approximate" in the UI.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find the nearest centre to a given point from the centres list.
 */
export function findNearestCentre(
  lat: number, lng: number, centres: Centre[]
): { centre: Centre; distance: number } | null {
  if (centres.length === 0) return null;

  let nearest = centres[0];
  let minDist = haversineKm(lat, lng, centres[0].lat, centres[0].lng);

  for (let i = 1; i < centres.length; i++) {
    const dist = haversineKm(lat, lng, centres[i].lat, centres[i].lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = centres[i];
    }
  }

  return { centre: nearest, distance: minDist };
}

/**
 * Assign a gap score (0-4) based on distance to nearest centre.
 * 0 = well-served (< 10km)
 * 1 = adequate (10-25km)
 * 2 = underserved (25-50km)
 * 3 = poorly served (50-75km)
 * 4 = critical gap (> 75km)
 */
export function getGapScore(distanceKm: number): 0 | 1 | 2 | 3 | 4 {
  if (distanceKm < 10) return 0;
  if (distanceKm < 25) return 1;
  if (distanceKm < 50) return 2;
  if (distanceKm < 75) return 3;
  return 4;
}

/**
 * Get human-readable gap label.
 */
export function getGapLabel(score: 0 | 1 | 2 | 3 | 4): string {
  const labels = {
    0: 'Well-served',
    1: 'Adequate',
    2: 'Underserved',
    3: 'Poorly served',
    4: 'Critical gap',
  };
  return labels[score];
}

export function getGapLabelKn(score: 0 | 1 | 2 | 3 | 4): string {
  const labels = {
    0: 'ಉತ್ತಮ ಸೇವೆ',
    1: 'ಸಮರ್ಪಕ',
    2: 'ಕಡಿಮೆ ಸೇವೆ',
    3: 'ಕಳಪೆ ಸೇವೆ',
    4: 'ತೀವ್ರ ಕೊರತೆ',
  };
  return labels[score];
}

/**
 * Compute gap analysis for all areas given centres and a threshold.
 */
export function computeGapAnalysis(
  areas: Area[],
  centres: Centre[],
  thresholdKm: number
): { areasWithGap: AreaWithGap[]; summary: GapSummary } {
  // Compute nearest centre for each area
  const areasWithGap: AreaWithGap[] = areas.map((area) => {
    const nearest = findNearestCentre(area.centroid_lat, area.centroid_lng, centres);
    const nearestKm = nearest ? Math.round(nearest.distance * 10) / 10 : 999;
    const gapScore = getGapScore(nearestKm);
    const peopleBeyond = nearestKm > thresholdKm ? area.population : 0;

    return {
      ...area,
      nearest_centre_id: nearest?.centre.id ?? null,
      nearest_centre_name: nearest?.centre.name ?? 'None',
      nearest_km: nearestKm,
      gap_score: gapScore,
      gap_rank: 0, // will be set after sorting
      people_beyond_threshold: peopleBeyond,
    };
  });

  // Sort by distance (descending) to assign rank
  const sorted = [...areasWithGap].sort((a, b) => b.nearest_km - a.nearest_km);
  sorted.forEach((area, index) => {
    area.gap_rank = index + 1;
    // Also set rank on original
    const original = areasWithGap.find((a) => a.id === area.id);
    if (original) original.gap_rank = index + 1;
  });

  // Compute summary
  const areasBeyond = areasWithGap.filter((a) => a.nearest_km > thresholdKm);
  const peopleBeyond = areasBeyond.reduce((sum, a) => sum + a.population, 0);
  const avgDist =
    areasWithGap.reduce((sum, a) => sum + a.nearest_km, 0) / areasWithGap.length;

  const summary: GapSummary = {
    total_areas: areasWithGap.length,
    areas_beyond_threshold: areasBeyond.length,
    people_beyond_threshold: peopleBeyond,
    threshold_km: thresholdKm,
    top_underserved: sorted.slice(0, 10),
    avg_distance_km: Math.round(avgDist * 10) / 10,
  };

  return { areasWithGap, summary };
}

/**
 * Generate Google Maps directions URL (origin omitted — uses user's current location).
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Generate tel: link.
 */
export function getPhoneUrl(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

/**
 * Format a large number with commas (Indian numbering system).
 */
export function formatPopulation(num: number): string {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(1) + ' Cr';
  }
  if (num >= 100000) {
    return (num / 100000).toFixed(1) + ' L';
  }
  return num.toLocaleString('en-IN');
}

/**
 * Format distance.
 */
export function formatDistance(km: number): string {
  return km.toFixed(1) + ' km';
}

/**
 * Get unique districts from areas.
 */
export function getDistricts(areas: Area[]): string[] {
  return [...new Set(areas.map((a) => a.district))].sort();
}

/**
 * Get unique service types from centres.
 */
export function getServiceTypes(centres: Centre[]): string[] {
  const services = new Set<string>();
  centres.forEach((c) => c.services.forEach((s) => services.add(s)));
  return [...services].sort();
}

/**
 * Get unique centre types.
 */
export function getCentreTypes(centres: Centre[]): string[] {
  return [...new Set(centres.map((c) => c.type))].sort();
}

/**
 * Compute what-if analysis: add a hypothetical centre and see how many people are newly within threshold.
 */
export function computeWhatIf(
  areas: AreaWithGap[],
  newLat: number,
  newLng: number,
  thresholdKm: number
): { newlyServed: AreaWithGap[]; peopleBenefit: number } {
  const newlyServed: AreaWithGap[] = [];
  let peopleBenefit = 0;

  areas.forEach((area) => {
    // Only consider areas currently beyond threshold
    if (area.nearest_km > thresholdKm) {
      const distToNew = haversineKm(
        area.centroid_lat, area.centroid_lng,
        newLat, newLng
      );
      if (distToNew <= thresholdKm) {
        newlyServed.push(area);
        peopleBenefit += area.population;
      }
    }
  });

  return { newlyServed, peopleBenefit };
}
