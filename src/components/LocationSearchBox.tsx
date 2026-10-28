import React, { useState, useEffect, useRef } from 'react';
import {
  MagnifyingGlass,
  NavigationArrow,
  X,
  Spinner,
  MapPin,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Area, Centre } from '../types';
import {
  searchLocationsOffline,
  geocodeLocationOnline,
  findDistrictForLatLng,
} from '../utils/locationService';
import type { LocationMatch } from '../utils/locationService';

export interface LocationSearchBoxProps {
  districts: string[];
  areas: Area[];
  centres: Centre[];
  districtsGeoJson: any;
  userLocation: { lat: number; lng: number; label: string; district: string } | null;
  onLocationSelect: (loc: { lat: number; lng: number; label: string; district: string }) => void;
  onLocationClear: () => void;
  lang?: 'en' | 'kn';
}

export const LocationSearchBox: React.FC<LocationSearchBoxProps> = ({
  districts,
  areas,
  centres,
  districtsGeoJson,
  userLocation,
  onLocationSelect,
  onLocationClear,
  lang = 'en',
}) => {
  const [query, setQuery] = useState('');
  const [offlineSuggestions, setOfflineSuggestions] = useState<LocationMatch[]>([]);
  const [onlineMatches, setOnlineMatches] = useState<LocationMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync input text with userLocation if set
  useEffect(() => {
    if (userLocation) {
      setQuery(userLocation.label);
    }
  }, [userLocation]);

  // Offline suggestions update as user types
  useEffect(() => {
    if (query.trim().length >= 2 && !userLocation) {
      const matches = searchLocationsOffline(query, districts, areas, centres);
      setOfflineSuggestions(matches);
    } else {
      setOfflineSuggestions([]);
    }
  }, [query, districts, areas, centres, userLocation]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOfflineSuggestions([]);
        setOnlineMatches([]);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectLocation = (match: LocationMatch) => {
    let resolvedDistrict = match.district;
    if (!resolvedDistrict || resolvedDistrict === 'Karnataka') {
      resolvedDistrict = findDistrictForLatLng(match.lat, match.lng, districtsGeoJson, districts);
    }
    onLocationSelect({
      lat: match.lat,
      lng: match.lng,
      label: match.label,
      district: resolvedDistrict,
    });
    setQuery(match.label);
    setOfflineSuggestions([]);
    setOnlineMatches([]);
    setStatusMessage(null);
  };

  const handleOnlineSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQ = query.trim();
    if (!cleanQ) return;

    // Check if top offline match is exact
    const topOffline = offlineSuggestions[0];
    if (topOffline && topOffline.label.toLowerCase().includes(cleanQ.toLowerCase())) {
      handleSelectLocation(topOffline);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const results = await geocodeLocationOnline(cleanQ, districts);
      if (results.length === 1) {
        handleSelectLocation(results[0]);
      } else if (results.length > 1) {
        setOnlineMatches(results);
      } else {
        setStatusMessage(
          lang === 'kn'
            ? 'ಯಾವುದೇ ಸ್ಥಳ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಕರ್ನಾಟಕದ ತಾಲೂಕು ಅಥವಾ ಜಿಲ್ಲೆಯನ್ನು ನಮೂದಿಸಿ.'
            : 'No location found. Please try entering a taluk or district in Karnataka.'
        );
      }
    } catch {
      setStatusMessage(
        lang === 'kn'
          ? 'ಸ್ಥಳ ಶೋಧನೆ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಪಟ್ಟಿಯಿಂದ ಆರಿಸಿ.'
          : 'Online search timed out. Please select from offline suggestions.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowserLocationRequest = () => {
    setShowLocationDialog(false);
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Accessing browser location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const dist = findDistrictForLatLng(lat, lng, districtsGeoJson, districts);

        onLocationSelect({
          lat,
          lng,
          label: 'Current Location',
          district: dist,
        });
        setQuery('Current Location');
        setIsLoading(false);
        setStatusMessage(null);
      },
      (err) => {
        setIsLoading(false);
        let msg = 'Could not access device location. Please type your location above.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can still type your area or district above.';
        }
        setStatusMessage(msg);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleClear = () => {
    setQuery('');
    setOfflineSuggestions([]);
    setOnlineMatches([]);
    setStatusMessage(null);
    onLocationClear();
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label htmlFor="user-location-input" className="font-label text-xs font-semibold" style={{ color: 'var(--color-ink-primary)' }}>
          {lang === 'kn' ? 'ನಿಮ್ಮ ಸ್ಥಳ' : 'Your location'}
        </label>
        {userLocation && (
          <span className="text-[11px] font-mono text-[var(--color-accent)] font-semibold">
            {userLocation.district} District
          </span>
        )}
      </div>

      <form onSubmit={handleOnlineSubmit} className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-tertiary)] pointer-events-none" />
          <input
            id="user-location-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Area, town, district or pincode"
            className="w-full pl-9 pr-8 py-2 rounded-lg text-xs surface-card border focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-all"
            style={{
              borderColor: userLocation ? 'var(--color-accent)' : 'var(--color-border-subtle)',
              color: 'var(--color-ink-primary)',
              fontFamily: 'var(--font-sans)',
            }}
            aria-label="Enter your area, town, district or pincode"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
              aria-label="Clear location input"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="touch-target-44 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1"
          style={{ background: 'var(--color-accent)', color: '#FFFFFF' }}
          title="Search location"
          aria-label="Search location"
        >
          {isLoading ? <Spinner size={14} className="animate-spin" /> : <MagnifyingGlass size={14} />}
          <span className="hidden sm:inline">Find</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLocationDialog(true)}
          className="touch-target-44 p-2 rounded-lg text-xs font-semibold border surface-card hover:bg-[var(--color-surface-2)] transition-all flex items-center justify-center"
          style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-secondary)' }}
          title="Use my current location (GPS)"
          aria-label="Use my device location"
        >
          <NavigationArrow size={16} className="text-[var(--color-accent)]" />
        </button>
      </form>

      {/* Autocomplete Dropdown: Offline Suggestions */}
      {offlineSuggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden text-xs surface-card animate-in fade-in zoom-in-95 duration-100"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-surface-0)' }}
        >
          <div className="px-3 py-1.5 border-b text-[10px] uppercase font-bold text-[var(--color-ink-tertiary)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
            Matching Places in Karnataka
          </div>
          {offlineSuggestions.map((m, i) => (
            <button
              key={`${m.label}-${i}`}
              type="button"
              data-testid="location-suggestion-item"
              onClick={() => handleSelectLocation(m)}
              className="w-full text-left px-3.5 py-2.5 border-b last:border-b-0 hover:bg-[var(--color-surface-2)] transition-colors flex items-center justify-between"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[var(--color-accent)] flex-shrink-0" />
                <span className="font-semibold" style={{ color: 'var(--color-ink-primary)' }}>{m.label}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded status-badge-info uppercase">
                {m.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Disambiguation List for Online Geocode Matches */}
      {onlineMatches.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden text-xs surface-card animate-in fade-in zoom-in-95 duration-100"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-surface-0)' }}
        >
          <div className="px-3 py-1.5 border-b text-[10px] uppercase font-bold text-[var(--color-ink-tertiary)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
            Select your specific location
          </div>
          {onlineMatches.map((m, i) => (
            <button
              key={`${m.label}-${i}`}
              type="button"
              onClick={() => handleSelectLocation(m)}
              className="w-full text-left px-3.5 py-2.5 border-b last:border-b-0 hover:bg-[var(--color-surface-2)] transition-colors"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--color-ink-primary)' }}>{m.label}</p>
              <p className="text-[10px] text-[var(--color-ink-tertiary)]">District: {m.district}</p>
            </button>
          ))}
        </div>
      )}

      {/* Status or Error Message */}
      {statusMessage && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <WarningCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Privacy Explanation Confirmation Modal for GPS */}
      {showLocationDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm p-5 rounded-2xl border shadow-2xl surface-card space-y-4"
            style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-border-strong)' }}
          >
            <div className="flex items-center gap-2 text-[var(--color-accent)] font-bold text-sm">
              <NavigationArrow size={18} />
              <span>Use Device Location</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
              Nyaya-Maarg will access your device GPS coordinates strictly to pin your location on the Karnataka map and open the Near You legal aid panel for your district.
              <br /><br />
              <strong>Privacy guarantee:</strong> Your coordinates are never stored, logged, or transmitted to any remote server or AI assistant.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLocationDialog(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-surface-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBrowserLocationRequest}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                Allow & Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
