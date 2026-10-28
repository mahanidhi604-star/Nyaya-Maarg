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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-primary)', background: 'var(--color-surface-1)' }}
          >
            <ArrowLeft size={16} />
            {lang === 'kn' ? 'ಎಲ್ಲಾ ಪ್ರಕರಣಗಳು' : 'All Cases'}
          </button>

          <div className="flex items-center gap-3">
            {activeCase.is_demo && (
              <span
                className="status-badge-warning inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              >
                <Info size={14} weight="bold" />
                DEMO CASE
              </span>
            )}
            <button
              onClick={() => handleDeleteCase(activeCase.id)}
              className="status-badge-danger flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              <Trash size={15} />
              {lang === 'kn' ? 'ಪ್ರಕರಣ ಅಳಿಸಿ' : 'Delete Case'}
            </button>
          </div>
        </div>

        {/* Case File Header Card */}
        <div
          className="p-6 rounded-2xl border mb-6 shadow-xs surface-card"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="status-badge-info text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded">
                  {activeCase.workflow_type}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                  Authority: <strong style={{ color: 'var(--color-ink-primary)' }}>{activeCase.authority_forum}</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                {activeCase.title}
              </h1>
            </div>

            {/* Stage Selector Pill */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg border surface-muted" style={{ borderColor: 'var(--color-border-strong)' }}>
              <span className="text-xs font-semibold px-1" style={{ color: 'var(--color-ink-secondary)' }}>Stage:</span>
              <select
                value={activeCase.stage}
                onChange={async (e) => {
                  const updatedStage = e.target.value as CaseStage;
                  await saveUserCase({ ...activeCase, stage: updatedStage }, userId);
                  await loadCases();
                }}
                className="input-control text-xs font-semibold py-1 px-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
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
            <div className="mt-4 p-4 rounded-xl border text-sm" style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-border-subtle)' }}>
              <span className="text-[11px] font-mono font-semibold uppercase block mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
                Private Case Notes:
              </span>
              <p className="leading-relaxed" style={{ color: 'var(--color-ink-primary)' }}>
                {activeCase.notes}
              </p>
            </div>
          )}

          {/* Next Step Recommendation Card */}
          <div className="mt-4 p-4 rounded-xl border status-badge-info flex items-start gap-3">
            <Scales size={20} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Recommended Procedural Next Step:
              </h4>
              <p className="text-xs sm:text-sm mt-1 leading-relaxed">
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
          className="p-6 rounded-2xl border surface-card"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock size={20} style={{ color: 'var(--color-accent)' }} />
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                {lang === 'kn' ? 'ಪ್ರಕರಣದ ಘಟನೆಗಳ ಕಾಲಗತಿ' : 'Case Timeline & Key Dates'}
              </h2>
            </div>
            <button
              onClick={() => setShowAddEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              <Plus size={15} weight="bold" />
              {lang === 'kn' ? 'ಘಟನೆ / ದಿನಾಂಕ ಸೇರಿಸಿ' : 'Add Event / Date'}
            </button>
          </div>

          {/* Events List */}
          {sortedEvents.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--color-border-strong)' }}>
              <Calendar size={32} className="mx-auto mb-2" style={{ color: 'var(--color-ink-tertiary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>No recorded events or hearing dates yet.</p>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="mt-3 text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
                style={{ color: 'var(--color-accent-text)' }}
              >
                + Add your first hearing or filing date
              </button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--color-border-strong)]">
              {sortedEvents.map((ev) => {
                const isOverdue = new Date(ev.date).getTime() < Date.now();
                return (
                  <div key={ev.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 bg-[var(--color-accent)]" style={{ borderColor: 'var(--color-surface-1)' }} />
                    <div className="p-4 rounded-xl border transition-all surface-card hover:shadow-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="status-badge-info text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded">
                            {ev.type}
                          </span>
                          <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink-primary)' }}>{ev.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-semibold ${isOverdue ? 'status-badge-danger px-1.5 py-0.5 rounded' : ''}`} style={{ color: isOverdue ? undefined : 'var(--color-ink-secondary)' }}>
                            {ev.date} {isOverdue && '(Past)'}
                          </span>
                          <button
                            onClick={() => downloadEventIcs(ev, activeCase.title)}
                            title="Export to Calendar (.ics)"
                            className="p-1 rounded transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                            style={{ color: 'var(--color-ink-secondary)' }}
                          >
                            <Calendar size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              await deleteCaseTimelineEvent(activeCase.id, ev.id, userId);
                              await loadCases();
                            }}
                            title="Delete event"
                            className="p-1 rounded transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                            style={{ color: 'var(--color-status-danger)' }}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>
                      {ev.notes && <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>{ev.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Add Event */}
        {showAddEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md p-6 rounded-2xl surface-card shadow-xl" style={{ borderColor: 'var(--color-border-strong)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                Add Timeline Event / Deadline
              </h3>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as CaseEvent['type'])}
                    className="input-control w-full px-3 py-2 text-sm"
                  >
                    <option value="hearing">Hearing / Session</option>
                    <option value="filed">Notice or Claim Dispatched</option>
                    <option value="reply_due">Reply / Compliance Deadline</option>
                    <option value="order_received">Order / Settlement Received</option>
                    <option value="note">Procedural Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Title</label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g., First hearing before District Consumer Forum"
                    className="input-control w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input-control w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    placeholder="Brief notes, room number, or what to bring..."
                    className="input-control w-full px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                    style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-primary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
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
          <span className="status-badge-info text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block">
            {lang === 'kn' ? 'ಪ್ರಕರಣ ಟ್ರ್ಯಾಕರ್' : 'Confidential Case File'}
          </span>
          <h1 className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em', color: 'var(--color-ink-primary)' }}>
            {lang === 'kn' ? 'ನನ್ನ ಪ್ರಕರಣಗಳು ಮತ್ತು ದಿನಾಂಕಗಳು' : 'My Cases & Deadlines'}
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
            {lang === 'kn'
              ? 'ನಿಮ್ಮ ಸ್ವಂತ ಖಾತೆಗೆ ಸೀಮಿತವಾದ ಸುರಕ್ಷಿತ ಶೇಖರಣೆ (Row-Level Security).'
              : 'Stored with strict Row-Level Security. Never mixed into public insights.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllCasesJSON(userId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-primary)', background: 'var(--color-surface-1)' }}
            title="Export all my case files as JSON"
          >
            <DownloadSimple size={15} />
            Export JSON
          </button>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-primary)', background: 'var(--color-surface-1)' }}
          >
            <ShieldCheck size={15} style={{ color: 'var(--color-accent)' }} />
            Privacy Notice
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            <Plus size={15} weight="bold" />
            {lang === 'kn' ? 'ಹೊಸ ಪ್ರಕರಣ' : 'Track New Case'}
          </button>
        </div>
      </div>

      {/* Upcoming Deadlines Strip */}
      {upcomingDeadlines.length > 0 && (
        <div
          className="mb-8 p-4 rounded-xl border shadow-xs surface-card"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} style={{ color: 'var(--color-status-warning)' }} />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-secondary)' }}>
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
                    ? 'status-badge-danger'
                    : 'surface-card border-[var(--color-border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold line-clamp-1" style={{ color: dl.isOverdue ? undefined : 'var(--color-ink-primary)' }}>{dl.caseTitle}</h5>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      dl.isOverdue
                        ? 'status-badge-danger border'
                        : 'status-badge-info'
                    }`}
                  >
                    {dl.isOverdue ? '⚠️ OVERDUE' : `${dl.daysRemaining}d left`}
                  </span>
                </div>
                <p className="text-[11px] font-mono mt-1" style={{ color: dl.isOverdue ? undefined : 'var(--color-ink-secondary)' }}>{dl.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 text-xs font-medium border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
            stageFilter === 'all'
              ? 'status-badge-info font-bold'
              : 'hover:bg-[var(--color-surface-2)]'
          }`}
          style={{ color: stageFilter === 'all' ? undefined : 'var(--color-ink-secondary)' }}
        >
          All Stages ({cases.length})
        </button>
        {STAGES.map((s) => {
          const count = cases.filter((c) => c.stage === s.stage).length;
          const isActive = stageFilter === s.stage;
          return (
            <button
              key={s.stage}
              onClick={() => setStageFilter(s.stage)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                isActive
                  ? 'status-badge-info font-bold'
                  : 'hover:bg-[var(--color-surface-2)]'
              }`}
              style={{ color: isActive ? undefined : 'var(--color-ink-secondary)' }}
            >
              <span>{s.icon}</span>
              <span>{lang === 'kn' ? s.label_kn : s.label}</span>
              <span className="font-mono text-[10px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Case Cards Grid or Empty State */}
      {filteredCases.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed p-8 surface-card" style={{ borderColor: 'var(--color-border-strong)' }}>
          <Folder size={48} className="mx-auto mb-3" style={{ color: 'var(--color-ink-tertiary)' }} />
          <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
            {lang === 'kn' ? 'ಯಾವುದೇ ಪ್ರಕರಣಗಳು ದಾಖಲಾಗಿಲ್ಲ' : 'No tracked legal cases in this view'}
          </h3>
          <p className="mt-1 text-sm max-w-md mx-auto" style={{ color: 'var(--color-ink-secondary)' }}>
            {lang === 'kn'
              ? 'ಮಾರ್ಗದರ್ಶಿತ ಕಾರ್ಯವಿಧಾನವನ್ನು ಆಯ್ಕೆ ಮಾಡುವ ಮೂಲಕ ಅಥವಾ ನೇರವಾಗಿ ಹೊಸ ಪ್ರಕರಣವನ್ನು ರಚಿಸುವ ಮೂಲಕ ಪ್ರಾರಂಭಿಸಿ.'
              : 'Track deadlines, hearing dates, and required documents. You can also start directly from any guided workflow.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              + Create Blank Case File
            </button>
            <button
              onClick={onNavigateToWorkflows}
              className="px-4 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-primary)', background: 'var(--color-surface-1)' }}
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
                className="rounded-2xl border p-5 cursor-pointer flex flex-col justify-between transition-all hover:shadow-md surface-card"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="status-badge-info text-[11px] font-mono font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <span>{stageConfig.icon}</span>
                      <span>{c.stage}</span>
                    </span>
                    {c.is_demo && (
                      <span className="status-badge-warning text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        DEMO
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold line-clamp-2" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
                    {c.title}
                  </h3>
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-ink-secondary)' }}>
                    Forum: {c.authority_forum}
                  </p>

                  {c.notes && (
                    <p className="mt-3 text-xs line-clamp-2" style={{ color: 'var(--color-ink-secondary)' }}>
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--color-ink-secondary)' }}>
                    {nextDate ? `Deadline: ${nextDate}` : 'No date set'}
                  </span>
                  <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--color-accent-text)' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-2xl surface-card shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-border-strong)' }}>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
              Create Confidential Case File
            </h3>
            <p className="text-xs mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
              Track deadlines, authority communications, and procedural documents.
            </p>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
                  Case Title <span style={{ color: 'var(--color-status-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Koramangala Rental Deposit Dispute"
                  className="input-control w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Workflow / Category</label>
                  <select
                    value={newWorkflowType}
                    onChange={(e) => setNewWorkflowType(e.target.value)}
                    className="input-control w-full px-3 py-2 text-sm"
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
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Current Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as CaseStage)}
                    className="input-control w-full px-3 py-2 text-sm"
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
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
                  Authority / Court / Forum
                </label>
                <input
                  type="text"
                  value={newAuthority}
                  onChange={(e) => setNewAuthority(e.target.value)}
                  placeholder="e.g., District Consumer Forum (Bangalore Urban), DLSA Front Office"
                  className="input-control w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
                  Next Deadline or Hearing Date
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="input-control w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
                  Private Notes & Chronology
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Summary of claims, notice dispatch date, opposite party communications..."
                  className="input-control w-full px-3 py-2 text-sm"
                />
                {piiDetected && (
                  <div className="mt-2 p-3 rounded-lg border status-badge-warning text-xs flex items-start gap-2">
                    <Warning size={16} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Privacy Caution:</strong> We detected numbers resembling an Aadhaar number, PAN, or phone number. To protect your privacy, avoid saving sensitive personal identifiers in free text notes.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-[var(--color-surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl surface-card shadow-xl" style={{ borderColor: 'var(--color-border-strong)' }}>
            <h3 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}>
              Data Storage & Privacy Policy
            </h3>
            <div className="text-xs space-y-2 leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
              <p>
                <strong style={{ color: 'var(--color-ink-primary)' }}>Row-Level Security:</strong> When signed in, cases are stored in Supabase Postgres protected by strict SQL Row-Level Security (`auth.uid() = user_id`). No other account or admin can access your records.
              </p>
              <p>
                <strong style={{ color: 'var(--color-ink-primary)' }}>Zero Analytics / Trackers:</strong> Nyaya-Maarg does not load third-party analytics, tracking pixels, or advertisement beacons.
              </p>
              <p>
                <strong style={{ color: 'var(--color-ink-primary)' }}>Public Statistics Separation:</strong> Case data is private to you and is never aggregated into public Insights statistics.
              </p>
              <p>
                <strong style={{ color: 'var(--color-ink-primary)' }}>Data Portability & Erasure:</strong> You can export all your case records as JSON at any time or permanently purge all records.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <button
                onClick={handleDeleteAll}
                className="text-xs hover:underline font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
                style={{ color: 'var(--color-status-danger)' }}
              >
                Delete All My Cases
              </button>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
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
