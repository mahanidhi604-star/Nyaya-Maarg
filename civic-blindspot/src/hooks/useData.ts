import { useState, useEffect } from 'react';
import type { Centre, Area } from '../types';

export function useData() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/centres.json').then((r) => {
        if (!r.ok) throw new Error('Failed to load centres');
        return r.json();
      }),
      fetch('/data/areas.json').then((r) => {
        if (!r.ok) throw new Error('Failed to load areas');
        return r.json();
      }),
    ])
      .then(([centresData, areasData]) => {
        setCentres(centresData);
        setAreas(areasData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { centres, areas, loading, error };
}
