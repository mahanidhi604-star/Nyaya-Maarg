import type { AreaWithGap, Centre, Area } from '../types';

export interface CoveragePoint {
  distance: number;
  coverage: number;
}

export interface DistanceBin {
  bin: string;
  minKm: number;
  maxKm: number;
  population: number;
  areaCount: number;
  percentPop: number;
}

export interface DistrictGapMetric {
  district: string;
  peopleBeyond: number;
  totalPopulation: number;
  unservedPercent: number;
  gappedTaluks: number;
  totalTaluks: number;
}

export interface DistrictCentreDensity {
  district: string;
  centresCount: number;
  population: number;
  centresPerLakh: number;
}

export interface ServiceCount {
  service: string;
  count: number;
}

export interface DataQualityReport {
  totalCentres: number;
  verifiedCentres: number;
  sampleCentres: number;
  verifiedPercent: number;
  oldestVerifiedDate: string;
  totalAreas: number;
  sampleAreas: number;
  verifiedAreas: number;
}

export interface InsightsKPIs {
  totalAreas: number;
  totalCentres: number;
  totalPopulation: number;
  peopleBeyond: number;
  peopleCovered: number;
  coveragePercent: number;
  medianDistance: number;
}

export function computeInsightsKPIs(
  areasWithGap: AreaWithGap[],
  centres: Centre[],
  threshold: number
): InsightsKPIs {
  const totalAreas = areasWithGap.length;
  const totalCentres = centres.length;
  const totalPopulation = areasWithGap.reduce((acc, a) => acc + (a.population || 0), 0);

  const peopleBeyond = areasWithGap
    .filter((a) => a.nearest_km > threshold)
    .reduce((acc, a) => acc + (a.population || 0), 0);

  const peopleCovered = Math.max(totalPopulation - peopleBeyond, 0);
  const coveragePercent = totalPopulation > 0
    ? Math.round((peopleCovered / totalPopulation) * 1000) / 10
    : 0;

  // Median distance computation
  const distances = areasWithGap.map((a) => a.nearest_km).sort((a, b) => a - b);
  let medianDistance = 0;
  if (distances.length > 0) {
    const mid = Math.floor(distances.length / 2);
    medianDistance = distances.length % 2 !== 0
      ? distances[mid]
      : Math.round(((distances[mid - 1] + distances[mid]) / 2) * 10) / 10;
  }

  return {
    totalAreas,
    totalCentres,
    totalPopulation,
    peopleBeyond,
    peopleCovered,
    coveragePercent,
    medianDistance,
  };
}

export function computeCoverageCurve(
  areasWithGap: AreaWithGap[]
): CoveragePoint[] {
  const totalPopulation = areasWithGap.reduce((acc, a) => acc + (a.population || 0), 0);
  if (totalPopulation === 0) return [];

  const checkpoints = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 90, 100];

  return checkpoints.map((dist) => {
    const coveredPop = areasWithGap
      .filter((a) => a.nearest_km <= dist)
      .reduce((acc, a) => acc + (a.population || 0), 0);
    const pct = Math.round((coveredPop / totalPopulation) * 1000) / 10;
    return {
      distance: dist,
      coverage: pct,
    };
  });
}

export function computeDistanceHistogram(
  areasWithGap: AreaWithGap[]
): DistanceBin[] {
  const totalPop = areasWithGap.reduce((acc, a) => acc + (a.population || 0), 0);

  const binsConfig = [
    { bin: '0–10 km', minKm: 0, maxKm: 10 },
    { bin: '10–25 km', minKm: 10, maxKm: 25 },
    { bin: '25–50 km', minKm: 25, maxKm: 50 },
    { bin: '50–75 km', minKm: 50, maxKm: 75 },
    { bin: '75+ km', minKm: 75, maxKm: 9999 },
  ];

  return binsConfig.map((cfg) => {
    const matched = areasWithGap.filter(
      (a) => a.nearest_km > cfg.minKm && a.nearest_km <= cfg.maxKm
    );
    const pop = matched.reduce((acc, a) => acc + (a.population || 0), 0);
    return {
      bin: cfg.bin,
      minKm: cfg.minKm,
      maxKm: cfg.maxKm,
      population: pop,
      areaCount: matched.length,
      percentPop: totalPop > 0 ? Math.round((pop / totalPop) * 1000) / 10 : 0,
    };
  });
}

export function computeDistrictGaps(
  areasWithGap: AreaWithGap[],
  threshold: number
): DistrictGapMetric[] {
  const districtMap = new Map<
    string,
    { peopleBeyond: number; totalPop: number; gappedTaluks: number; totalTaluks: number }
  >();

  areasWithGap.forEach((a) => {
    const d = a.district || 'Other';
    const curr = districtMap.get(d) || {
      peopleBeyond: 0,
      totalPop: 0,
      gappedTaluks: 0,
      totalTaluks: 0,
    };

    curr.totalPop += a.population || 0;
    curr.totalTaluks += 1;
    if (a.nearest_km > threshold) {
      curr.peopleBeyond += a.population || 0;
      curr.gappedTaluks += 1;
    }
    districtMap.set(d, curr);
  });

  return Array.from(districtMap.entries())
    .map(([district, stats]) => ({
      district,
      peopleBeyond: stats.peopleBeyond,
      totalPopulation: stats.totalPop,
      unservedPercent:
        stats.totalPop > 0 ? Math.round((stats.peopleBeyond / stats.totalPop) * 1000) / 10 : 0,
      gappedTaluks: stats.gappedTaluks,
      totalTaluks: stats.totalTaluks,
    }))
    .sort((a, b) => b.peopleBeyond - a.peopleBeyond);
}

export function computeCentresPerLakh(
  areas: Area[],
  centres: Centre[]
): DistrictCentreDensity[] {
  // Compute district population
  const popMap = new Map<string, number>();
  areas.forEach((a) => {
    popMap.set(a.district, (popMap.get(a.district) || 0) + (a.population || 0));
  });

  // Count centres per district
  const countMap = new Map<string, number>();
  centres.forEach((c) => {
    countMap.set(c.district, (countMap.get(c.district) || 0) + 1);
  });

  const results: DistrictCentreDensity[] = [];
  popMap.forEach((pop, district) => {
    const count = countMap.get(district) || 0;
    const perLakh = pop > 0 ? Math.round((count / (pop / 100000)) * 100) / 100 : 0;
    results.push({
      district,
      centresCount: count,
      population: pop,
      centresPerLakh: perLakh,
    });
  });

  return results.sort((a, b) => b.centresPerLakh - a.centresPerLakh);
}

export function computeServiceBreakdown(centres: Centre[]): ServiceCount[] {
  const serviceMap = new Map<string, number>();
  centres.forEach((c) => {
    c.services.forEach((s) => {
      serviceMap.set(s, (serviceMap.get(s) || 0) + 1);
    });
  });

  return Array.from(serviceMap.entries())
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeDataQuality(
  centres: Centre[],
  areas: Area[]
): DataQualityReport {
  const totalCentres = centres.length;
  const verifiedCentres = centres.filter((c) => !c.is_sample).length;
  const sampleCentres = totalCentres - verifiedCentres;
  const verifiedPercent = totalCentres > 0
    ? Math.round((verifiedCentres / totalCentres) * 1000) / 10
    : 0;

  // Find oldest verification date among verified centres
  const dates = centres
    .map((c) => c.last_verified)
    .filter(Boolean)
    .sort();
  const oldestVerifiedDate = dates.length > 0 ? dates[0] : 'N/A';

  const totalAreas = areas.length;
  const sampleAreas = areas.filter((a) => a.is_sample).length;
  const verifiedAreas = totalAreas - sampleAreas;

  return {
    totalCentres,
    verifiedCentres,
    sampleCentres,
    verifiedPercent,
    oldestVerifiedDate,
    totalAreas,
    sampleAreas,
    verifiedAreas,
  };
}

export function downloadAreasCSV(areasWithGap: AreaWithGap[], filename = 'karnataka_legal_gaps.csv') {
  const headers = [
    'Taluk ID',
    'Taluk Name',
    'Taluk Name (Kannada)',
    'District',
    'Population',
    'Centroid Latitude',
    'Centroid Longitude',
    'Nearest Centre',
    'Nearest Centre ID',
    'Approx Distance (km)',
    'Gap Score (0-4)',
    'Is Sample Data',
  ];

  const rows = areasWithGap.map((a) => [
    `"${a.id}"`,
    `"${a.name.replace(/"/g, '""')}"`,
    `"${a.name_kn.replace(/"/g, '""')}"`,
    `"${a.district.replace(/"/g, '""')}"`,
    a.population,
    a.centroid_lat,
    a.centroid_lng,
    `"${(a.nearest_centre_name || '').replace(/"/g, '""')}"`,
    `"${a.nearest_centre_id || ''}"`,
    a.nearest_km,
    a.gap_score,
    a.is_sample ? 'YES' : 'NO',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
