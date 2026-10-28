import React, { useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from '@phosphor-icons/react';

export interface GuidedTourStepData {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
}

export interface GuidedTourBannerProps {
  currentStep: number;
  totalSteps?: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  underservedDistrictName: string;
  underservedTalukName: string;
  maxGapKm: number;
  thresholdKm: number;
  newlyCoveredPeople: number;
  lang?: 'en' | 'kn';
}

export const GuidedTourBanner: React.FC<GuidedTourBannerProps> = ({
  currentStep,
  totalSteps = 6,
  onNext,
  onPrev,
  onSkip,
  underservedDistrictName,
  underservedTalukName,
  maxGapKm,
  thresholdKm,
  newlyCoveredPeople,
  lang: _lang = 'en',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Focus into caption card when step changes
  useEffect(() => {
    cardRef.current?.focus();
  }, [currentStep]);

  // Keyboard navigation: ArrowRight / ArrowLeft / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < totalSteps) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, totalSteps, onNext, onPrev, onSkip]);

  const getStepContent = (): { title: string; body: string } => {
    switch (currentStep) {
      case 1:
        return {
          title: 'The Legal Aid Desert',
          body: `${underservedTalukName} in ${underservedDistrictName} represents Karnataka's most remote civic blindspot, located over ${maxGapKm.toFixed(
            0
          )} km straight-line distance from the nearest District Legal Services Authority.`,
        };
      case 2:
        return {
          title: 'Physical Distance Burden',
          body: `The red dashed path line illustrates the approximate straight-line journey of ${maxGapKm.toFixed(
            0
          )} km that citizens must travel over regional terrain to access statutory free legal counsel.`,
        };
      case 3:
        return {
          title: `Statutory Coverage Reach (${thresholdKm} km)`,
          body: `Translucent green circles illustrate the statutory ${thresholdKm} km reach buffers surrounding all established DLSA and TLSC centres across Karnataka.`,
        };
      case 4:
        return {
          title: 'Closing the Deficit (Simulation)',
          body: `Simulating a new legal aid clinic at ${underservedTalukName} brings over ${newlyCoveredPeople.toLocaleString()} citizens within reach, immediately cutting Karnataka's widest access deficit.`,
        };
      case 5:
        return {
          title: 'Personalized "Near You" Lookup',
          body: `Citizens can search their own area, town, or district to view nearby legal institutions, local gap metrics, and direct Google Maps routing links.`,
        };
      case 6:
      default:
        return {
          title: 'Explore on Your Own',
          body: `You are now equipped to navigate Karnataka's legal landscape, inspect underserved taluks, place hypothetical clinics, and download customized district briefings.`,
        };
    }
  };

  const { title, body } = getStepContent();

  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      role="region"
      aria-label={`Guided Tour Step ${currentStep} of ${totalSteps}`}
      className="absolute top-16 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-96 p-4 rounded-2xl border shadow-2xl surface-card z-[35] backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200 focus-visible:outline-none"
      style={{
        background: 'var(--color-surface-0)',
        borderColor: 'var(--color-accent)',
        boxShadow: '0 20px 30px -10px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded status-badge-info">
            Stage {currentStep} of {totalSteps}
          </span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="p-1 rounded-md text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
          title="Exit Tour (Esc)"
          aria-label="Exit Guided Tour"
        >
          <X size={16} />
        </button>
      </div>

      <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--color-ink-primary)' }}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
        {body}
      </p>

      {/* Tour Stepper Controls */}
      <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={currentStep === 1}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border surface-card hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
          style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-secondary)' }}
          aria-label="Previous step"
        >
          <ArrowLeft size={13} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] px-2 py-1"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onNext}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-all active:scale-95"
            style={{ background: 'var(--color-accent)' }}
            aria-label={currentStep === totalSteps ? 'Finish tour' : 'Next step'}
          >
            <span>{currentStep === totalSteps ? 'Done' : 'Next'}</span>
            {currentStep === totalSteps ? <Check size={14} weight="bold" /> : <ArrowRight size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};
