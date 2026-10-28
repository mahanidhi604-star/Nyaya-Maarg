import React, { useEffect, useRef, useState } from 'react';
import type { Centre } from '../types';
import {
  X,
  ArrowSquareOut,
  Phone,
  Warning,
  Eye,
  Flag,
  CheckCircle,
} from '@phosphor-icons/react';

export interface CentreDetailDrawerProps {
  centre: Centre | null;
  onClose: () => void;
  onViewOnMap?: (centre: Centre) => void;
  lang?: 'en' | 'kn';
}

export const CentreDetailDrawer: React.FC<CentreDetailDrawerProps> = ({
  centre,
  onClose,
  onViewOnMap,
  lang = 'en',
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportNote, setReportNote] = useState('');

  // Move focus to close button when opened
  useEffect(() => {
    if (centre) {
      closeBtnRef.current?.focus();
    }
  }, [centre]);

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!centre) return null;

  const gmapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centre.lat},${centre.lng}`;

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setShowReportDialog(false);
      setReportNote('');
    }, 1800);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${centre.name} Details`}
        className="fixed bottom-0 left-0 right-0 max-h-[82dvh] rounded-t-2xl md:fixed md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:max-h-none md:rounded-none overflow-y-auto surface-card z-[70] shadow-2xl animate-in slide-in-from-right duration-200"
        style={{
          background: 'var(--color-surface-0)',
          borderLeft: '1px solid var(--color-surface-2)',
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded status-badge-info">
                  {centre.type}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-tertiary)' }}>
                  {centre.district} District
                </span>
                {centre.is_sample && (
                  <span className="sample-badge text-[10px]">Sample</span>
                )}
              </div>
              <h2 className="font-h2 text-base sm:text-lg font-bold" style={{ color: 'var(--color-ink-primary)' }}>
                {lang === 'kn' ? centre.name_kn : centre.name}
              </h2>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="touch-target-44 p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{ background: 'var(--color-surface-1)' }}
              aria-label="Close details"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sample explanation banner */}
          {centre.is_sample && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg mb-4 text-xs"
              style={{ background: 'var(--color-sample-badge-bg)', border: '1px solid var(--color-sample-badge)' }}
            >
              <Warning size={16} style={{ color: 'var(--color-sample-badge)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: 'var(--color-sample-badge)' }}>
                This record uses illustrative sample data for verification testing and does not reflect a live filed institution.
              </p>
            </div>
          )}

          {/* Action Buttons: View on map, Open in Google Maps, Call, Report */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => onViewOnMap?.(centre)}
              className="touch-target-44 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-medium text-xs text-white transition-opacity hover:opacity-90 shadow-sm"
              style={{ background: 'var(--color-accent)' }}
            >
              <Eye size={15} />
              <span>View on map</span>
            </button>

            <a
              href={gmapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target-44 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-medium text-xs border surface-card hover:bg-[var(--color-surface-2)] transition-colors"
              style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
            >
              <ArrowSquareOut size={15} />
              <span>Google Maps</span>
            </a>

            {centre.phone && (
              <a
                href={`tel:${centre.phone}`}
                className="touch-target-44 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs border surface-card hover:bg-[var(--color-surface-2)] transition-colors"
                style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
              >
                <Phone size={15} />
                <span>Call ({centre.phone})</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowReportDialog(true)}
              className={`touch-target-44 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs border surface-card hover:bg-[var(--color-surface-2)] transition-colors ${
                centre.phone ? '' : 'col-span-2'
              }`}
              style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-secondary)' }}
            >
              <Flag size={14} />
              <span>Report wrong info</span>
            </button>
          </div>

          {/* Details */}
          <div className="space-y-4 text-xs">
            <div>
              <p className="font-label mb-1 uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
                Official Address
              </p>
              <p className="font-body leading-relaxed" style={{ color: 'var(--color-ink-primary)' }}>
                {centre.address}
              </p>
            </div>

            {centre.services && centre.services.length > 0 && (
              <div>
                <p className="font-label mb-1.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
                  Statutory Services Provided
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {centre.services.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded-md text-[11px] font-medium"
                      style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {centre.languages && centre.languages.length > 0 && (
              <div>
                <p className="font-label mb-1.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
                  Languages Supported
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {centre.languages.map((l) => (
                    <span
                      key={l}
                      className="px-2 py-1 rounded-md text-[11px] font-medium"
                      style={{ background: 'var(--color-surface-1)', color: 'var(--color-ink-secondary)' }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t space-y-1.5 text-[11px]" style={{ borderColor: 'var(--color-surface-2)' }}>
              <div>
                <span className="font-label uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
                  Source:
                </span>{' '}
                <a
                  href={centre.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline text-[var(--color-accent)] break-all"
                >
                  {centre.source_url}
                </a>
              </div>
              <p style={{ color: 'var(--color-ink-tertiary)' }}>
                Last verified: <span className="font-mono">{centre.last_verified}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Wrong Information Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm p-5 rounded-2xl border shadow-2xl surface-card space-y-4"
            style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-border-strong)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-ink-primary)' }}>
                Report Incorrect Information
              </h3>
              <button
                type="button"
                onClick={() => setShowReportDialog(false)}
                className="p-1 rounded text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
              >
                ✕
              </button>
            </div>

            {reportSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs">
                <CheckCircle size={18} />
                <span>Thank you. Your correction report has been recorded for editorial review.</span>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                  Please describe what is outdated or incorrect about <strong>{centre.name}</strong>:
                </p>
                <textarea
                  rows={3}
                  required
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="e.g. phone number changed, office moved to new court complex..."
                  className="w-full p-2.5 rounded-lg text-xs border surface-card"
                  style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-primary)' }}
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowReportDialog(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-surface-2)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
