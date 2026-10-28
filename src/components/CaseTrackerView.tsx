import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, Plus, Calendar, Clock, Warning, Trash,
  DownloadSimple, ArrowLeft, ShieldCheck,
  Scales, CaretRight, Info, Bell
} from '@phosphor-icons/react';
import type { UserCase, CaseEvent, CaseStage, Language } from '../types';
import {
  fetchUserCases, saveUserCase, deleteUserCase,
  addCaseTimelineEvent, deleteCaseTimelineEvent,
  exportAllCasesJSON, deleteAllCases, downloadEventIcs, detectPII
} from '../lib/caseService';

interface CaseTrackerViewProps {
  userId: string;
  lang: Language;
  onNavigateToWorkflows: () => void;
  prefillWorkflow?: { workflowId: string; title: string; forum: string } | null;
  onClearPrefill?: () => void;
}

const STAGES: { stage: CaseStage; label: string; label_kn: string; icon: string }[] = [
  { stage: 'Preparing', label: 'Preparing', label_kn: 'ಸಿದ್ಧತೆ', icon: '📝' },
  { stage: 'Filed', label: 'Filed', label_kn: 'ದಾಖಲಿಸಲಾಗಿದೆ', icon: '📬' },
  { stage: 'Hearing/Follow-up', label: 'Hearing / Follow-up', label_kn: 'ವಿಚಾರಣೆ', icon: '⚖️' },
  { stage: 'Resolved', label: 'Resolved', label_kn: 'ಪರಿಹಾರವಾಗಿದೆ', icon: '✅' },
  { stage: 'Closed', label: 'Closed', label_kn: 'ಮುಕ್ತಾಯ', icon: '📁' },
];

export const CaseTrackerView: React.FC<CaseTrackerViewProps> = ({
  userId,
  lang,
  onNavigateToWorkflows,
  prefillWorkflow,
  onClearPrefill,
}) => {
  const [cases, setCases] = useState<UserCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Case form state
  const [newTitle, setNewTitle] = useState('');
  const [newWorkflowType, setNewWorkflowType] = useState('Rental Dispute');
  const [newAuthority, setNewAuthority] = useState('');
  const [newStage, setNewStage] = useState<CaseStage>('Preparing');
  const [newDeadline, setNewDeadline] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [piiDetected, setPiiDetected] = useState(false);

  // New Event form state
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CaseEvent['type']>('hearing');
  const [eventDate, setEventDate] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  // Privacy notice modal toggle
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Load cases
  const loadCases = useMemo(() => async () => {
    setLoading(true);
    try {
      const data = await fetchUserCases(userId);
      setCases(data);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Handle pre-fill from workflow
  useEffect(() => {
    if (prefillWorkflow) {
      setNewTitle(prefillWorkflow.title);
      setNewWorkflowType(prefillWorkflow.title);
      setNewAuthority(prefillWorkflow.forum || 'District Legal Services Authority');
      setNewStage('Preparing');
      setNewDeadline(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setShowCreateModal(true);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillWorkflow, onClearPrefill]);

  // Check notes for PII
  const handleNotesChange = (val: string) => {
    setNewNotes(val);
    setPiiDetected(detectPII(val));
  };

  // Create case
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = await saveUserCase(
      {
        title: newTitle.trim(),
        workflow_type: newWorkflowType,
        authority_forum: newAuthority.trim() || 'District Legal Services Authority',
        stage: newStage,
        key_dates: newDeadline ? { next_deadline: newDeadline } : {},
        notes: newNotes.trim(),
        checklist_progress: {},
        current_step_index: 0,
        events: newDeadline
          ? [
              {
                id: `ev_${Date.now()}`,
                case_id: '',
                type: 'reply_due',
                title: 'Initial Compliance / Response Deadline',
                date: newDeadline,
                notes: 'Set upon case file creation.',
                is_completed: false,
              },
            ]
          : [],
      },
      userId
    );

    setShowCreateModal(false);
    setNewTitle('');
    setNewAuthority('');
    setNewDeadline('');
    setNewNotes('');
    setPiiDetected(false);
    await loadCases();
    setSelectedCaseId(created.id);
  };

  // Add event to active case
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !eventTitle.trim() || !eventDate) return;

    await addCaseTimelineEvent(
      selectedCaseId,
      {
        type: eventType,
        title: eventTitle.trim(),
        date: eventDate,
        notes: eventNotes.trim(),
        is_completed: false,
      },
      userId
    );

    setShowAddEventModal(false);
    setEventTitle('');
    setEventDate('');
    setEventNotes('');
    await loadCases();
  };

  // Delete case
  const handleDeleteCase = async (caseId: string) => {
    if (window.confirm(lang === 'kn' ? 'ಈ ಪ್ರಕರಣವನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲು ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ?' : 'Are you sure you want to permanently delete this case?')) {
      await deleteUserCase(caseId, userId);
      setSelectedCaseId(null);
      await loadCases();
    }
  };

  // Delete all cases
  const handleDeleteAll = async () => {
    if (window.confirm(lang === 'kn' ? 'ನಿಮ್ಮ ಎಲ್ಲಾ ಪ್ರಕರಣಗಳ ಡೇಟಾವನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಅಳಿಸಲು ನೀವು ಬಯಸುವಿರಾ?' : 'Delete ALL your case records permanently? This cannot be undone.')) {
      await deleteAllCases(userId);
      setSelectedCaseId(null);
      await loadCases();
    }
  };

  // Active selected case
  const activeCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    if (stageFilter === 'all') return cases;
    return cases.filter((c) => c.stage === stageFilter);
  }, [cases, stageFilter]);

  // Upcoming deadlines across all active cases
  const upcomingDeadlines = useMemo(() => {
    const list: { caseTitle: string; caseId: string; date: string; daysRemaining: number; isOverdue: boolean }[] = [];
    const now = new Date();
    cases.forEach((c) => {
      const dStr = c.key_dates?.next_deadline || c.key_dates?.hearing_date;
      if (dStr) {
        const dObj = new Date(dStr);
        const diffDays = Math.ceil((dObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        list.push({
          caseTitle: c.title,
          caseId: c.id,
          date: dStr,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0,
        });
      }
    });
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [cases]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--color-accent)' }} />
        <p className="font-body text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          {lang === 'kn' ? 'ಪ್ರಕರಣಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...' : 'Loading case file records...'}
        </p>
      </div>
    );
  }

  // ================= CASE DETAIL VIEW =================
  if (activeCase) {
    const sortedEvents = [...(activeCase.events || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setSelectedCaseId(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
          >
            <ArrowLeft size={16} />
            {lang === 'kn' ? 'ಎಲ್ಲಾ ಪ್ರಕರಣಗಳು' : 'All Cases'}
          </button>

          <div className="flex items-center gap-3">
            {activeCase.is_demo && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--color-status-warning-bg)', color: 'var(--color-status-warning-ink)' }}
              >
                <Info size={14} weight="bold" />
                DEMO CASE
              </span>
            )}
            <button
              onClick={() => handleDeleteCase(activeCase.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash size={15} />
              {lang === 'kn' ? 'ಪ್ರಕರಣ ಅಳಿಸಿ' : 'Delete Case'}
            </button>
          </div>
        </div>

        {/* Case File Header Card */}
        <div
          className="p-6 rounded-2xl border mb-6 shadow-xs"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-surface-2)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {activeCase.workflow_type}
                </span>
                <span className="text-xs font-medium text-neutral-500">
                  Authority: <strong>{activeCase.authority_forum}</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                {activeCase.title}
              </h1>
            </div>

            {/* Stage Selector Pill */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700">
              <span className="text-xs font-semibold px-2 text-neutral-500">Stage:</span>
              <select
                value={activeCase.stage}
                onChange={async (e) => {
                  const updatedStage = e.target.value as CaseStage;
                  await saveUserCase({ ...activeCase, stage: updatedStage }, userId);
                  await loadCases();
                }}
                className="text-xs font-semibold bg-transparent outline-none cursor-pointer py-1 pr-2 text-teal-800 dark:text-teal-300"
              >
                {STAGES.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes & Guidance */}
          {activeCase.notes && (
            <div className="mt-4 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-sm">
              <span className="text-[11px] font-mono font-semibold uppercase text-neutral-400 block mb-1">
                Private Case Notes:
              </span>
              <p className="leading-relaxed" style={{ color: 'var(--color-ink-primary)' }}>
                {activeCase.notes}
              </p>
            </div>
          )}

          {/* Next Step Recommendation Card */}
          <div className="mt-4 p-4 rounded-xl border border-teal-200 bg-teal-50/50 dark:bg-teal-950/20 dark:border-teal-900 flex items-start gap-3">
            <Scales size={20} className="text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Recommended Procedural Next Step:
              </h4>
              <p className="text-xs sm:text-sm text-teal-950 dark:text-teal-200 mt-0.5 leading-relaxed">
                {activeCase.stage === 'Preparing' && 'Draft your formal statement of claim and prepare photocopies of all supporting agreements/receipts.'}
                {activeCase.stage === 'Filed' && 'Track physical postal acknowledgement or forum diary number. Monitor upcoming summons or hearing dates.'}
                {(activeCase.stage === 'Hearing' || activeCase.stage === 'Hearing/Follow-up') && 'Attend scheduled hearing or mediation session. Present clean copies of documents to the presiding member.'}
                {activeCase.stage === 'Resolved' && 'Obtain certified copy of final order/settlement deed and verify compliance timeline.'}
                {activeCase.stage === 'Closed' && 'All proceedings concluded. Retain original case files in a secure location.'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline of Events */}
        <div
          className="p-6 rounded-2xl border"
          style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-surface-2)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-teal-600" />
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                {lang === 'kn' ? 'ಪ್ರಕರಣದ ಘಟನೆಗಳ ಕಾಲಗತಿ' : 'Case Timeline & Key Dates'}
              </h2>
            </div>
            <button
              onClick={() => setShowAddEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}
            >
              <Plus size={15} weight="bold" />
              {lang === 'kn' ? 'ಘಟನೆ / ದಿನಾಂಕ ಸೇರಿಸಿ' : 'Add Event / Date'}
            </button>
          </div>

          {/* Events List */}
          {sortedEvents.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed rounded-xl border-neutral-200 dark:border-neutral-700">
              <Calendar size={32} className="mx-auto text-neutral-400 mb-2" />
              <p className="text-sm text-neutral-500 font-medium">No recorded events or hearing dates yet.</p>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="mt-3 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
              >
                + Add your first hearing or filing date
              </button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-700">
              {sortedEvents.map((ev) => {
                const isOverdue = new Date(ev.date).getTime() < Date.now();
                return (
                  <div key={ev.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900 bg-teal-600" />
                    <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 transition-all hover:shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                            {ev.type}
                          </span>
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{ev.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-medium ${isOverdue ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'}`}>
                            {ev.date} {isOverdue && '(Past)'}
                          </span>
                          <button
                            onClick={() => downloadEventIcs(ev, activeCase.title)}
                            title="Export to Calendar (.ics)"
                            className="p-1 rounded text-neutral-500 hover:text-teal-600 transition-colors"
                          >
                            <Calendar size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              await deleteCaseTimelineEvent(activeCase.id, ev.id, userId);
                              await loadCases();
                            }}
                            title="Delete event"
                            className="p-1 rounded text-neutral-400 hover:text-red-600 transition-colors"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>
                      {ev.notes && <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{ev.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Add Event */}
        {showAddEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                Add Timeline Event / Deadline
              </h3>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as CaseEvent['type'])}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                  >
                    <option value="hearing">Hearing / Session</option>
                    <option value="filed">Notice or Claim Dispatched</option>
                    <option value="reply_due">Reply / Compliance Deadline</option>
                    <option value="order_received">Order / Settlement Received</option>
                    <option value="note">Procedural Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g., First hearing before District Consumer Forum"
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    placeholder="Brief notes, room number, or what to bring..."
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= CASE LIST / HOME VIEW =================
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Header & Privacy Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
            {lang === 'kn' ? 'ಪ್ರಕರಣ ಟ್ರ್ಯಾಕರ್' : 'Confidential Case File'}
          </span>
          <h1 className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
            {lang === 'kn' ? 'ನನ್ನ ಪ್ರಕರಣಗಳು ಮತ್ತು ದಿನಾಂಕಗಳು' : 'My Cases & Deadlines'}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            {lang === 'kn'
              ? 'ನಿಮ್ಮ ಸ್ವಂತ ಖಾತೆಗೆ ಸೀಮಿತವಾದ ಸುರಕ್ಷಿತ ಶೇಖರಣೆ (Row-Level Security).'
              : 'Stored with strict Row-Level Security. Never mixed into public insights.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllCasesJSON(userId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
            title="Export all my case files as JSON"
          >
            <DownloadSimple size={15} />
            Export JSON
          </button>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
          >
            <ShieldCheck size={15} className="text-teal-600" />
            Privacy Notice
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus size={15} weight="bold" />
            {lang === 'kn' ? 'ಹೊಸ ಪ್ರಕರಣ' : 'Track New Case'}
          </button>
        </div>
      </div>

      {/* Upcoming Deadlines Strip */}
      {upcomingDeadlines.length > 0 && (
        <div
          className="mb-8 p-4 rounded-xl border shadow-xs"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-surface-2)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-amber-600" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Upcoming Deadlines & Hearing Dates:
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingDeadlines.map((dl, i) => (
              <div
                key={i}
                onClick={() => setSelectedCaseId(dl.caseId)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${
                  dl.isOverdue
                    ? 'border-red-300 bg-red-50/70 dark:bg-red-950/30 dark:border-red-900'
                    : 'border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold line-clamp-1">{dl.caseTitle}</h5>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      dl.isOverdue
                        ? 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                    }`}
                  >
                    {dl.isOverdue ? 'OVERDUE' : `${dl.daysRemaining}d left`}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">{dl.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 text-xs font-medium border-b" style={{ borderColor: 'var(--color-surface-2)' }}>
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            stageFilter === 'all'
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          All Stages ({cases.length})
        </button>
        {STAGES.map((s) => {
          const count = cases.filter((c) => c.stage === s.stage).length;
          return (
            <button
              key={s.stage}
              onClick={() => setStageFilter(s.stage)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                stageFilter === s.stage
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <span>{s.icon}</span>
              <span>{lang === 'kn' ? s.label_kn : s.label}</span>
              <span className="font-mono text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Case Cards Grid or Empty State */}
      {filteredCases.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8">
          <Folder size={48} className="mx-auto text-neutral-400 mb-3" />
          <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
            {lang === 'kn' ? 'ಯಾವುದೇ ಪ್ರಕರಣಗಳು ದಾಖಲಾಗಿಲ್ಲ' : 'No tracked legal cases in this view'}
          </h3>
          <p className="mt-1 text-sm text-neutral-500 max-w-md mx-auto">
            {lang === 'kn'
              ? 'ಮಾರ್ಗದರ್ಶಿತ ಕಾರ್ಯವಿಧಾನವನ್ನು ಆಯ್ಕೆ ಮಾಡುವ ಮೂಲಕ ಅಥವಾ ನೇರವಾಗಿ ಹೊಸ ಪ್ರಕರಣವನ್ನು ರಚಿಸುವ ಮೂಲಕ ಪ್ರಾರಂಭಿಸಿ.'
              : 'Track deadlines, hearing dates, and required documents. You can also start directly from any guided workflow.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}
            >
              + Create Blank Case File
            </button>
            <button
              onClick={onNavigateToWorkflows}
              className="px-4 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
              style={{ borderColor: 'var(--color-surface-2)' }}
            >
              Browse Guided Workflows →
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((c) => {
            const nextDate = c.key_dates?.next_deadline || c.key_dates?.hearing_date;
            const stageConfig = STAGES.find((s) => s.stage === c.stage) || STAGES[0];

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className="rounded-2xl border p-5 cursor-pointer flex flex-col justify-between transition-all hover:shadow-md hover:border-teal-400"
                style={{
                  background: 'var(--color-surface-1)',
                  borderColor: 'var(--color-surface-2)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      {stageConfig.icon} {c.stage}
                    </span>
                    {c.is_demo && (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        DEMO
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold line-clamp-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    {c.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                    Forum: {c.authority_forum}
                  </p>

                  {c.notes && (
                    <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-surface-2)' }}>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {nextDate ? `Deadline: ${nextDate}` : 'No date set'}
                  </span>
                  <span className="font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                    View File <CaretRight size={12} weight="bold" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Case */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
              Create Confidential Case File
            </h3>
            <p className="text-xs text-neutral-500 mb-5">
              Track deadlines, authority communications, and procedural documents.
            </p>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
                  Case Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Koramangala Rental Deposit Dispute"
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">Workflow / Category</label>
                  <select
                    value={newWorkflowType}
                    onChange={(e) => setNewWorkflowType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                  >
                    <option value="Rental Dispute">Rental Deposit Recovery</option>
                    <option value="Consumer Grievance">Consumer Protection Complaint</option>
                    <option value="Free Legal Aid">Legal Aid Application (DLSA)</option>
                    <option value="Wage Claim">Unpaid Wages / Labour Matter</option>
                    <option value="RTI Appeal">RTI Application / First Appeal</option>
                    <option value="General Civil">General Civil Dispute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">Current Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as CaseStage)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                  >
                    {STAGES.map((s) => (
                      <option key={s.stage} value={s.stage}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
                  Authority / Court / Forum
                </label>
                <input
                  type="text"
                  value={newAuthority}
                  onChange={(e) => setNewAuthority(e.target.value)}
                  placeholder="e.g., District Consumer Forum (Bangalore Urban), DLSA Front Office"
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
                  Next Deadline or Hearing Date
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
                  Private Notes & Chronology
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Summary of claims, notice dispatch date, opposite party communications..."
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none"
                />
                {piiDetected && (
                  <div className="mt-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Warning size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Privacy Caution:</strong> We detected numbers resembling an Aadhaar number, PAN, or phone number. To protect your privacy, avoid saving sensitive personal identifiers in free text notes.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800"
                >
                  Create Case File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Privacy Notice */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
            <h3 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
              Data Storage & Privacy Policy
            </h3>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
              <p>
                <strong>Row-Level Security:</strong> When signed in, cases are stored in Supabase Postgres protected by strict SQL Row-Level Security (`auth.uid() = user_id`). No other account or admin can access your records.
              </p>
              <p>
                <strong>Zero Analytics / Trackers:</strong> CivicBlindspot does not load third-party analytics, tracking pixels, or advertisement beacons.
              </p>
              <p>
                <strong>Public Statistics Separation:</strong> Case data is private to you and is never aggregated into the public Insights statistics.
              </p>
              <p>
                <strong>Data Portability & Erasure:</strong> You can export all your case records as JSON at any time or permanently purge all records.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t flex items-center justify-between">
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                Delete All My Cases
              </button>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseTrackerView;
