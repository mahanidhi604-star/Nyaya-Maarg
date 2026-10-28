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
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          {lang === 'kn' ? 'ದಾಖಲೆ ವಿಶ್ಲೇಷಕ' : 'Plain-Language Document Interpreter'}
        </span>
        <h1 className="text-3xl font-bold mt-1.5" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
          {lang === 'kn' ? 'ಕಾನೂನು ನೋಟಿಸ್ ಅಥವಾ ಪತ್ರದ ಸರಳ ವಿವರಣೆ' : 'Understand Legal Notices & Court Orders'}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {lang === 'kn'
            ? 'ನೋಟಿಸ್ ಅಥವಾ ಪತ್ರದಲ್ಲಿ ಏನಿದೆ ಎಂದು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ತಿಳಿಯಿರಿ. ಯಾವುದೇ ಕಾನೂನು ಸಲಹೆಯನ್ನಾಗಲಿ ಅಥವಾ ಫಲಿತಾಂಶದ ಮುನ್ಸೂಚನೆಯನ್ನಾಗಲಿ ನೀಡುವುದಿಲ್ಲ.'
            : 'Explains what your document says in simple words. Identifies deadlines, parties, and obligations with exact quotes. No outcome prediction.'}
        </p>
      </div>

      {/* Input Section */}
      <div
        className="p-6 rounded-2xl border mb-8 shadow-xs"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-surface-2)' }}
      >
        {/* Sample Notices Picker */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">Quick Samples:</span>
          {SAMPLE_NOTICES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(sample.text);
                setImageBase64(null);
                setImageFileName(null);
                setError(null);
              }}
              className="text-xs px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-teal-600 transition-colors"
            >
              {sample.title.split(' ')[0]} {sample.title.split(' ')[1]}...
            </button>
          ))}
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-xs font-mono font-semibold uppercase text-neutral-500 mb-1.5">
            Paste Notice / Agreement Text:
          </label>
          <textarea
            rows={7}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text of legal notice, summons, RTI reply, or tenancy letter here..."
            className="w-full p-4 rounded-xl border text-sm bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-teal-600 transition-all font-mono"
          />
        </div>

        {/* Image / File Upload + Redaction Toggle */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: 'var(--color-surface-2)' }}>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
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
                className="text-xs text-red-500 hover:underline"
              >
                Clear Photo
              </button>
            )}
          </div>

          {/* Privacy Redaction Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEnableRedaction(!enableRedaction)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50/70 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300"
            >
              <ShieldCheck size={16} />
              {enableRedaction ? 'Auto-Redaction Active' : 'Redaction Off'}
            </button>
          </div>
        </div>

        {/* Pre-Send Privacy Notice */}
        <div className="mt-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
          <LockKey size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <span>
            <strong>Pre-Send Notice:</strong> Document text is processed in memory via our stateless server proxy solely for plain-language interpretation. No uploaded documents or outputs are saved unless you explicitly save confirmed dates to your case file.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <Warning size={16} />
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            disabled={loading}
            onClick={handleInterpret}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
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
            <div className="p-5 rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200">
              <div className="flex items-start gap-3">
                <Warning size={28} weight="fill" className="text-red-600 shrink-0" />
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
            className="p-8 rounded-2xl border shadow-sm"
            style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-surface-2)' }}
          >
            {/* Header / Type */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
              <div>
                <span className="text-xs font-mono font-semibold uppercase text-teal-700 dark:text-teal-400">
                  Document Classification
                </span>
                <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
                  {result.document_type}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                Confidence: {result.confidence}
              </span>
            </div>

            {/* Plain-Language Explanation */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                What this document says in simple words:
              </h4>
              <p className="text-base leading-relaxed" style={{ color: 'var(--color-ink-primary)', fontFamily: 'var(--font-serif)' }}>
                {result.summary_plain}
              </p>
            </div>

            {/* What you are being asked or told to do */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                Required Actions / What is demanded of you:
              </h4>
              <ul className="space-y-2">
                {(result.required_actions || result.simple_actions_required || []).map((act, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Dates & Deadlines with exact source snippets */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Calendar size={16} />
                  Extracted Dates & Statutory Deadlines:
                </h4>
                <span className="text-[11px] text-neutral-400">Exact source quotes preserved</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.key_dates.map((kd, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{kd.label}</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                        {kd.date_iso}
                      </span>
                    </div>
                    <p className="text-xs font-mono italic text-neutral-500 bg-white/70 dark:bg-neutral-900/60 p-2 rounded border border-neutral-200/60 dark:border-neutral-700/60">
                      {kd.source_snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Parties and Forum */}
            <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                <Buildings size={16} />
                Parties and Forum Named in Document:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                  <span className="font-semibold text-neutral-500 block mb-1">Forum / Authority:</span>
                  <p className="text-sm font-bold">{result.parties_and_forum.forum_or_authority || 'Not explicitly named'}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                  <span className="font-semibold text-neutral-500 block mb-1">Parties Identified:</span>
                  <p className="text-sm font-medium">
                    {result.parties_and_forum.parties?.join(' vs. ') || 'Unspecified opposite parties'}
                  </p>
                </div>
              </div>
            </div>

            {/* Glossary of Terms */}
            {result.glossary && result.glossary.length > 0 && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                  <BookOpen size={16} />
                  Plain-Language Legal Glossary:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.glossary.map((g, gi) => (
                    <div key={gi} className="p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700">
                      <h5 className="text-xs font-bold text-teal-800 dark:text-teal-300">{g.term}</h5>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{g.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions to ask at a free legal aid clinic */}
            {result.questions_for_clinic && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                  <Question size={16} />
                  Suggested Questions to Ask at DLSA / Legal Clinic:
                </h4>
                <div className="space-y-2">
                  {result.questions_for_clinic.map((q, qi) => (
                    <div key={qi} className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 text-xs text-teal-950 dark:text-teal-200 flex items-start gap-2">
                      <span className="font-bold text-teal-700">Q{qi + 1}:</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unclear items or needs a lawyer */}
            {result.unclear_or_needs_lawyer && result.unclear_or_needs_lawyer.length > 0 && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                  <Warning size={16} />
                  Items Requiring Professional Clarification:
                </h4>
                <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {result.unclear_or_needs_lawyer.map((un, ui) => (
                    <li key={ui} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{un}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Guided Workflows */}
            {result.suggested_workflow_ids && result.suggested_workflow_ids.length > 0 && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Suggested Guided Workflow:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.suggested_workflow_ids.map((wId) => (
                    <button
                      key={wId}
                      onClick={() => onNavigateToWorkflow(wId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-600 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 transition-colors"
                    >
                      <span>Open Workflow: {wId.replace(/^wf-/, '').replace(/-/g, ' ')}</span>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="pt-6 text-xs text-neutral-500 leading-relaxed italic">
              ⚖️ {result.disclaimer}
            </div>
          </div>

          {/* ================= HUMAN IN THE LOOP: CONFIRM DATES TO CASE ================= */}
          <div
            className="p-6 rounded-2xl border bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-teal-600" />
              <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                Human-in-the-Loop Review: Confirm Dates to Case Timeline
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Nothing is saved to your case automatically. Review or modify the extracted dates below, choose a target case file, and confirm.
            </p>

            <div className="space-y-3 mb-5">
              {confirmedDates.map((cd, cIdx) => (
                <div key={cIdx} className="p-3 rounded-lg border bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={cd.label}
                      onChange={(e) => {
                        const copy = [...confirmedDates];
                        copy[cIdx].label = e.target.value;
                        setConfirmedDates(copy);
                      }}
                      className="text-xs font-bold w-full bg-transparent outline-none border-b border-dashed border-neutral-300 dark:border-neutral-600 pb-0.5"
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
                      className="text-xs font-mono px-2 py-1 rounded border bg-transparent outline-none"
                    />
                    <button
                      onClick={() => {
                        setConfirmedDates(confirmedDates.filter((_, i) => i !== cIdx));
                      }}
                      className="text-xs text-red-500 hover:underline px-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Target Case Selector and Confirm Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500">Save to Case:</span>
                <select
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 outline-none"
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
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {saveSuccessMsg}
                  </span>
                )}
                <button
                  onClick={handleSaveToCase}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <Plus size={16} weight="bold" />
                  Confirm & Save Dates to Case
                </button>
                <button
                  onClick={onNavigateToCases}
                  className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
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
