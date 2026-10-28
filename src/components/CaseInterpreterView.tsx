import React, { useState } from 'react';
import {
  UploadSimple, ShieldCheck,
  Warning, Calendar, CheckCircle, Plus, ArrowRight,
  BookOpen, Question, LockKey, Sparkle, Buildings
} from '@phosphor-icons/react';
import type { InterpreterResult, ExtractedDate, UserCase, Language } from '../types';
import { PII_REGEX, addCaseTimelineEvent, fetchUserCases, saveUserCase } from '../lib/caseService';

interface CaseInterpreterViewProps {
  userId: string;
  lang: Language;
  onNavigateToWorkflow: (workflowId: string) => void;
  onNavigateToCases: () => void;
}

const SAMPLE_NOTICES = [
  {
    title: 'Bengaluru Tenancy Dispute & Deposit Deduction Notice',
    text: `LEGAL NOTICE UNDER SECTION 106 OF THE TRANSFER OF PROPERTY ACT, 1882
Date: 14th October 2026
To: Sri Raghavendra Rao, Tenant of Flat 302, 12th Main, Indiranagar, Bengaluru.
From: Adv. S. Murthy, on behalf of Landlord Sri K. Venkat.

SUBJECT: Demand for vacating premises and statement of accounts for security deposit.

Sir,
Under instructions from our client, Sri K. Venkat, you are hereby served this formal notice. You entered into a registered lease agreement on 1st November 2024 for a period of 11 months with a refundable security deposit of Rs. 1,50,000/-.

Take notice that our client has deducted Rs. 65,000 towards comprehensive deep painting and marble polishing. The remaining balance of Rs. 85,000 shall be disbursed subject to physical vacant handover.

You are hereby called upon to hand over physical vacant possession within 15 (fifteen) days from receipt of this notice, failing which our client shall initiate eviction proceedings before the competent Court of Small Causes, Bengaluru, holding you liable for all legal costs.

Advocate for Landlord`,
  },
  {
    title: 'Consumer Redressal Pre-Litigation Notice (Defective Laptop)',
    text: `FORMAL NOTICE OF DEFICIENCY OF SERVICE & UNFAIR TRADE PRACTICE
Under Consumer Protection Act, 2019
Date: 20-10-2026
To: M/s Apex Tech Retailers Pvt Ltd, Brigade Road, Bengaluru - 560001
Complainant: Smt. Ananya Hegde, Resident of Malleshwaram, Bengaluru.

Ref: Order No. BLR-99214 dated 12th August 2026.

Sir/Madam,
The complainant purchased an UltraBook 15 laptop against Invoice #99214 for Rs. 72,000. Within 18 days of delivery, the motherboard suffered catastrophic failure. Three service requests (SR-8821, SR-8890, SR-9012) remain unfulfilled.

You are hereby called upon to either replace the defective unit with a brand new sealed piece or refund the full consideration of Rs. 72,000 within thirty (30) days from service of this notice, failing which a formal complaint shall be instituted before the District Consumer Disputes Redressal Commission (DCDRC), Bangalore Urban, claiming damages and litigation expenses.

Smt. Ananya Hegde (Complainant)`,
  },
  {
    title: 'RTI First Appeal Notice (Public Information Officer)',
    text: `FIRST APPEAL UNDER SECTION 19(1) OF THE RTI ACT, 2005
Date: 22nd October 2026
Before: The First Appellate Authority & Joint Commissioner, Bruhat Bengaluru Mahanagara Palike (BBMP).
Appellant: Ramesh G., RTI Citizen Activist, Rajajinagar, Bengaluru.
Respondent: Public Information Officer (PIO), Town Planning Department, BBMP West Zone.

SUBJECT: First Appeal against deemed refusal and non-furnishing of road repair expenditure records.

1. The appellant filed RTI application dated 10th September 2026 seeking sanction letters and contractor measurement books for 8th Cross Ward 98 road asphalt work.
2. The mandatory 30-day statutory period expired on 10th October 2026 with zero communication from the respondent PIO.
3. The appellant prays that the Appellate Authority direct the PIO to furnish certified records free of cost and initiate penal action under Section 20(1) of the Act.
Hearing is requested at the earliest convenience.`,
  },
];

export const CaseInterpreterView: React.FC<CaseInterpreterViewProps> = ({
  userId,
  lang,
  onNavigateToWorkflow,
  onNavigateToCases,
}) => {
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [enableRedaction, setEnableRedaction] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InterpreterResult | null>(null);

  // Editable review list for Human-in-the-Loop date confirmation
  const [confirmedDates, setConfirmedDates] = useState<ExtractedDate[]>([]);
  const [userCases, setUserCases] = useState<UserCase[]>([]);
  const [targetCaseId, setTargetCaseId] = useState<string>('new');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load user cases for timeline saving
  const loadUserCases = React.useCallback(async () => {
    try {
      const data = await fetchUserCases(userId);
      setUserCases(data);
    } catch {
      // Ignore
    }
  }, [userId]);

  React.useEffect(() => {
    loadUserCases();
  }, [loadUserCases]);

  // Compute client-side redacted preview
  const redactedPreview = React.useMemo(() => {
    if (!inputText) return '';
    return inputText.replace(PII_REGEX, '[REDACTED_IDENTIFIER]');
  }, [inputText]);

  // Handle file upload (Image / Text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError('File size exceeds 4MB limit. Please provide a smaller image or copy text.');
      return;
    }

    setImageFileName(file.name);
    setError(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => {
        setInputText(reader.result as string);
        setImageBase64(null);
      };
      reader.readAsText(file);
    } else {
      setError('Please upload a JPEG, PNG image or a plain text file.');
    }
  };

  // Run interpreter API
  const handleInterpret = async () => {
    if (!inputText.trim() && !imageBase64) {
      setError('Please paste document text or upload a document photo.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaveSuccessMsg(null);

    const payloadText = enableRedaction ? redactedPreview : inputText;

    try {
      let token: string | null = null;
      try {
        const { supabase } = await import('../lib/supabase');
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token || null;
        }
      } catch {
        // Fallback to guest header
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-nyaya-guest'] = 'true';
      }

      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: payloadText,
          imageBase64: imageBase64 || undefined,
          lang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: InterpreterResult = await res.json();
      setResult(data);
      setConfirmedDates(data.key_dates || []);
    } catch (err: any) {
      console.error('Interpretation request failed:', err);
      setError('Could not interpret document. Please ensure valid document text is provided.');
    } finally {
      setLoading(false);
    }
  };

  // Human in the Loop: Save confirmed dates to Case Timeline
  const handleSaveToCase = async () => {
    if (confirmedDates.length === 0) return;

    try {
      let activeCaseId = targetCaseId;

      if (activeCaseId === 'new') {
        const created = await saveUserCase(
          {
            title: result?.document_type ? `${result.document_type} Case File` : 'Interpreted Notice',
            workflow_type: result?.document_type || 'Civil Matter',
            authority_forum: result?.parties_and_forum.forum_or_authority || 'DLSA Front Office',
            stage: 'Preparing',
            key_dates: confirmedDates[0]?.date_iso ? { next_deadline: confirmedDates[0].date_iso } : {},
            notes: result?.summary_plain || '',
          },
          userId
        );
        activeCaseId = created.id;
      }

      // Add each confirmed date as an event
      for (const cd of confirmedDates) {
        await addCaseTimelineEvent(
          activeCaseId,
          {
            type: cd.is_overdue ? 'note' : 'reply_due',
            title: cd.label,
            date: cd.date_iso || new Date().toISOString().split('T')[0],
            notes: `Source Quote: ${cd.source_snippet}`,
            is_completed: false,
          },
          userId
        );
      }

      setSaveSuccessMsg(
        lang === 'kn'
          ? 'ದೃಢೀಕರಿಸಿದ ದಿನಾಂಕಗಳನ್ನು ನಿಮ್ಮ ಪ್ರಕರಣದ ಕಾಲಗತಿಗೆ ಯಶಸ್ವಿಯಾಗಿ ಸೇರಿಸಲಾಗಿದೆ!'
          : 'Confirmed dates and deadline events successfully added to your case timeline!'
      );
      loadUserCases();
    } catch (err) {
      console.error('Failed to save to case:', err);
      setError('Failed to append events to case file.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="status-badge-info text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block">
          {lang === 'kn' ? 'ದಾಖಲೆ ವಿಶ್ಲೇಷಕ' : 'Plain-Language Document Interpreter'}
        </span>
        <h1 className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em', color: 'var(--color-ink-primary)' }}>
          {lang === 'kn' ? 'ಕಾನೂನು ನೋಟಿಸ್ ಅಥವಾ ಪತ್ರದ ಸರಳ ವಿವರಣೆ' : 'Understand Legal Notices & Court Orders'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
          {lang === 'kn'
            ? 'ನೋಟಿಸ್ ಅಥವಾ ಪತ್ರದಲ್ಲಿ ಏನಿದೆ ಎಂದು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ತಿಳಿಯಿರಿ. ಯಾವುದೇ ಕಾನೂನು ಸಲಹೆಯನ್ನಾಗಲಿ ಅಥವಾ ಫಲಿತಾಂಶದ ಮುನ್ಸೂಚನೆಯನ್ನಾಗಲಿ ನೀಡುವುದಿಲ್ಲ.'
            : 'Explains what your document says in simple words. Identifies deadlines, parties, and obligations with exact quotes. No outcome prediction.'}
        </p>
      </div>

      {/* Input Section */}
      <div
        className="p-6 rounded-2xl border mb-8 shadow-xs surface-card"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        {/* Sample Notices Picker */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>Quick Samples:</span>
          {SAMPLE_NOTICES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(sample.text);
                setImageBase64(null);
                setImageFileName(null);
                setError(null);
              }}
              className="text-xs px-2.5 py-1 rounded-md border transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-ink-primary)' }}
            >
              {sample.title.split(' ')[0]} {sample.title.split(' ')[1]}...
            </button>
          ))}
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-xs font-mono font-semibold uppercase mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
            Paste Notice / Agreement Text:
          </label>
          <textarea
            rows={7}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text of legal notice, summons, RTI reply, or tenancy letter here..."
            className="input-control w-full p-4 text-sm font-mono"
          />
        </div>

        {/* Image / File Upload + Redaction Toggle */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--color-surface-2)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]" style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-surface-1)', color: 'var(--color-ink-primary)' }}>
              <UploadSimple size={16} />
              {imageFileName ? `Photo: ${imageFileName.slice(0, 15)}...` : 'Upload Notice Photo (JPEG/PNG)'}
              <input type="file" accept="image/*,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {imageFileName && (
              <button
                onClick={() => {
                  setImageBase64(null);
                  setImageFileName(null);
                }}
                className="text-xs font-semibold hover:underline"
                style={{ color: 'var(--color-status-danger)' }}
              >
                Clear Photo
              </button>
            )}
          </div>

          {/* Privacy Redaction Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEnableRedaction(!enableRedaction)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                enableRedaction
                  ? 'status-badge-info'
                  : 'hover:bg-[var(--color-surface-2)]'
              }`}
              style={{
                borderColor: enableRedaction ? undefined : 'var(--color-border-strong)',
                background: enableRedaction ? undefined : 'var(--color-surface-1)',
                color: enableRedaction ? undefined : 'var(--color-ink-secondary)',
              }}
            >
              <ShieldCheck size={16} />
              {enableRedaction ? 'Auto-Redaction Active' : 'Redaction Off'}
            </button>
          </div>
        </div>

        {/* Pre-Send Privacy Notice */}
        <div className="mt-4 p-3 rounded-xl border text-xs flex items-start gap-2" style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-secondary)' }}>
          <LockKey size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <span>
            <strong style={{ color: 'var(--color-ink-primary)' }}>Pre-Send Notice:</strong> Document text is processed in memory via our stateless server proxy solely for plain-language interpretation. No uploaded documents or outputs are saved unless you explicitly save confirmed dates to your case file.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-xl border status-badge-danger text-xs flex items-center gap-2">
            <Warning size={16} />
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            disabled={loading}
            onClick={handleInterpret}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Interpreting Document...
              </>
            ) : (
              <>
                <Sparkle size={16} weight="fill" />
                Breakdown This Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= STRUCTURED CARD RESULTS ================= */}
      {result && (
        <div className="space-y-6">
          {/* Emergency Alert (if triggered) */}
          {result.is_emergency && (
            <div className="p-5 rounded-2xl border-2 status-badge-danger">
              <div className="flex items-start gap-3">
                <Warning size={28} weight="fill" className="shrink-0" />
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wide">
                    Urgent / Emergency Safety Warning
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed">
                    {result.emergency_note ||
                      'If you face imminent threat of physical violence, unlawful police custody, or forceful eviction, contact Emergency Police at 112 / 100 or Women Helpline at 181 immediately.'}
                  </p>
                  <p className="mt-2 text-xs font-semibold">
                    Free 24×7 Legal Aid Emergency Helpline: <strong>15100 (NALSA / KSLSA)</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Document Breakdown Card */}
          <div
            className="p-8 rounded-2xl border shadow-sm surface-card"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            {/* Header / Type */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div>
                <span className="text-xs font-mono font-bold uppercase" style={{ color: 'var(--color-accent-text)' }}>
                  Document Classification
                </span>
                <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                  {result.document_type}
                </h2>
              </div>
              <span className="status-badge-info px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase">
                Confidence: {result.confidence}
              </span>
            </div>

            {/* Plain-Language Explanation */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-ink-secondary)' }}>
                What this document says in simple words:
              </h4>
              <p className="text-base leading-relaxed" style={{ color: 'var(--color-ink-primary)', fontFamily: 'var(--font-serif)' }}>
                {result.summary_plain}
              </p>
            </div>

            {/* What you are being asked or told to do */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-secondary)' }}>
                Required Actions / What is demanded of you:
              </h4>
              <ul className="space-y-2">
                {(result.required_actions || result.simple_actions_required || []).map((act, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--color-ink-primary)' }}>
                    <span className="font-bold shrink-0" style={{ color: 'var(--color-accent)' }}>•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Dates & Deadlines with exact source snippets */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-ink-secondary)' }}>
                  <Calendar size={16} />
                  Extracted Dates & Statutory Deadlines:
                </h4>
                <span className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>Exact source quotes preserved</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.key_dates.map((kd, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border surface-card"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold" style={{ color: 'var(--color-ink-primary)' }}>{kd.label}</span>
                      <span className="status-badge-info font-mono text-xs font-semibold px-2 py-0.5 rounded">
                        {kd.date_iso}
                      </span>
                    </div>
                    <p className="text-xs font-mono italic p-2 rounded border" style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink-secondary)' }}>
                      {kd.source_snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Parties and Forum */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-ink-secondary)' }}>
                <Buildings size={16} />
                Parties and Forum Named in Document:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border surface-card" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <span className="font-semibold block mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Forum / Authority:</span>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-ink-primary)' }}>{result.parties_and_forum.forum_or_authority || 'Not explicitly named'}</p>
                </div>
                <div className="p-3 rounded-lg border surface-card" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <span className="font-semibold block mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Parties Identified:</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink-primary)' }}>
                    {result.parties_and_forum.parties?.join(' vs. ') || 'Unspecified opposite parties'}
                  </p>
                </div>
              </div>
            </div>

            {/* Glossary of Terms */}
            {result.glossary && result.glossary.length > 0 && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-ink-secondary)' }}>
                  <BookOpen size={16} />
                  Plain-Language Legal Glossary:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.glossary.map((g, gi) => (
                    <div key={gi} className="p-3 rounded-lg border surface-card" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <h5 className="text-xs font-bold" style={{ color: 'var(--color-accent-text)' }}>{g.term}</h5>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-ink-secondary)' }}>{g.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions to ask at a free legal aid clinic */}
            {result.questions_for_clinic && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-ink-secondary)' }}>
                  <Question size={16} />
                  Suggested Questions to Ask at DLSA / Legal Clinic:
                </h4>
                <div className="space-y-2">
                  {result.questions_for_clinic.map((q, qi) => (
                    <div key={qi} className="p-3 rounded-lg border status-badge-info text-xs flex items-start gap-2">
                      <span className="font-bold">Q{qi + 1}:</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unclear items or needs a lawyer */}
            {result.unclear_or_needs_lawyer && result.unclear_or_needs_lawyer.length > 0 && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--color-status-warning)' }}>
                  <Warning size={16} />
                  Items Requiring Professional Clarification:
                </h4>
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                  {result.unclear_or_needs_lawyer.map((un, ui) => (
                    <li key={ui} className="flex items-start gap-2">
                      <span className="font-bold" style={{ color: 'var(--color-status-warning)' }}>•</span>
                      <span>{un}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Guided Workflows */}
            {result.suggested_workflow_ids && result.suggested_workflow_ids.length > 0 && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-secondary)' }}>
                  Suggested Guided Workflow:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.suggested_workflow_ids.map((wId) => (
                    <button
                      key={wId}
                      onClick={() => onNavigateToWorkflow(wId)}
                      className="status-badge-info flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                    >
                      <span>Open Workflow: {wId.replace(/^wf-/, '').replace(/-/g, ' ')}</span>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="pt-6 text-xs leading-relaxed italic" style={{ color: 'var(--color-ink-tertiary)' }}>
              ⚖️ {result.disclaimer}
            </div>
          </div>

          {/* ================= HUMAN IN THE LOOP: CONFIRM DATES TO CASE ================= */}
          <div
            className="p-6 rounded-2xl border surface-card shadow-xs"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} style={{ color: 'var(--color-status-success)' }} />
              <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                Human-in-the-Loop Review: Confirm Dates to Case Timeline
              </h3>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
              Nothing is saved to your case automatically. Review or modify the extracted dates below, choose a target case file, and confirm.
            </p>

            <div className="space-y-3 mb-5">
              {confirmedDates.map((cd, cIdx) => (
                <div key={cIdx} className="p-3 rounded-lg border surface-muted flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={cd.label}
                      onChange={(e) => {
                        const copy = [...confirmedDates];
                        copy[cIdx].label = e.target.value;
                        setConfirmedDates(copy);
                      }}
                      className="input-control text-xs font-bold w-full px-2 py-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={cd.date_iso}
                      onChange={(e) => {
                        const copy = [...confirmedDates];
                        copy[cIdx].date_iso = e.target.value;
                        setConfirmedDates(copy);
                      }}
                      className="input-control text-xs font-mono px-2 py-1"
                    />
                    <button
                      onClick={() => {
                        setConfirmedDates(confirmedDates.filter((_, i) => i !== cIdx));
                      }}
                      className="text-xs font-semibold hover:underline px-1 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
                      style={{ color: 'var(--color-status-danger)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Target Case Selector and Confirm Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>Save to Case:</span>
                <select
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  className="input-control text-xs font-semibold px-3 py-1.5"
                >
                  <option value="new">+ Create New Case from this Notice</option>
                  {userCases.map((uc) => (
                    <option key={uc.id} value={uc.id}>
                      {uc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccessMsg && (
                  <span className="status-badge-success text-xs font-semibold px-2 py-1 rounded">
                    {saveSuccessMsg}
                  </span>
                )}
                <button
                  onClick={handleSaveToCase}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                >
                  <Plus size={16} weight="bold" />
                  Confirm & Save Dates to Case
                </button>
                <button
                  onClick={onNavigateToCases}
                  className="text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
                  style={{ color: 'var(--color-accent-text)' }}
                >
                  Go to Cases →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseInterpreterView;
