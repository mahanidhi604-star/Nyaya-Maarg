import React, { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlass, ArrowLeft, CheckCircle, CaretRight,
  Printer, ChatCircleText, FolderSimplePlus, ArrowSquareOut,
  Warning, Info, Clock, Buildings, FileText, CheckSquare, Phone
} from '@phosphor-icons/react';
import type { Workflow, WorkflowStep, Centre, Language } from '../types';
import { getGoogleMapsUrl, getPhoneUrl } from '../utils/gapAnalysis';

interface WorkflowsViewProps {
  lang: Language;
  centres: Centre[];
  onTrackCase: (workflowId: string, title: string, forum: string) => void;
  onAskAssistant: (prompt: string) => void;
}

export const WorkflowsView: React.FC<WorkflowsViewProps> = ({
  lang,
  centres,
  onTrackCase,
  onAskAssistant,
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});
  const [branchAnswer, setBranchAnswer] = useState<string | null>(null);

  // Load workflows data
  useEffect(() => {
    fetch('/data/workflows.json')
      .then((res) => res.json())
      .then((data: Workflow[]) => {
        setWorkflows(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load workflows:', err);
        setLoading(false);
      });
  }, []);

  // Restore checklist progress from localStorage
  useEffect(() => {
    if (selectedWorkflowId) {
      try {
        const saved = localStorage.getItem(`civic_wf_checklist_${selectedWorkflowId}`);
        if (saved) {
          setChecklistProgress(JSON.parse(saved));
        } else {
          setChecklistProgress({});
        }
      } catch {
        setChecklistProgress({});
      }
      setActiveStepIndex(0);
      setBranchAnswer(null);
    }
  }, [selectedWorkflowId]);

  const activeWorkflow = useMemo(() => {
    return workflows.find((w) => w.id === selectedWorkflowId) || null;
  }, [workflows, selectedWorkflowId]);

  // Filtered workflows for library search
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return workflows;
    const q = searchQuery.toLowerCase();
    return workflows.filter((w) => {
      const summaryEn = w.summary || w.plain_language_summary || '';
      const summaryKn = w.summary_kn || w.plain_language_summary_kn || '';
      const whoEn = w.who_it_is_for || w.who_is_it_for || '';
      const matchEn =
        w.title.toLowerCase().includes(q) ||
        summaryEn.toLowerCase().includes(q) ||
        whoEn.toLowerCase().includes(q);
      const matchKn =
        (w.title_kn && w.title_kn.toLowerCase().includes(q)) ||
        (summaryKn && summaryKn.toLowerCase().includes(q));
      return matchEn || matchKn;
    });
  }, [workflows, searchQuery]);

  // Handle checking a document item
  const toggleDocumentCheck = (docItem: string) => {
    if (!selectedWorkflowId) return;
    const updated = {
      ...checklistProgress,
      [docItem]: !checklistProgress[docItem],
    };
    setChecklistProgress(updated);
    try {
      localStorage.setItem(`civic_wf_checklist_${selectedWorkflowId}`, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Find matching centre for "where to go"
  const matchedCentre = useMemo(() => {
    if (!activeWorkflow) return null;
    const step = activeWorkflow.steps[activeStepIndex];
    if (!step) return null;

    const authority = (step.where_authority || step.where_or_with_whom || '').toLowerCase();
    return (
      centres.find((c) => authority.includes(c.name.toLowerCase()) || c.services.some((s) => authority.includes(s.toLowerCase()))) ||
      centres[0] ||
      null
    );
  }, [activeWorkflow, activeStepIndex, centres]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--color-accent)' }} />
        <p className="font-body text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          {lang === 'kn' ? 'ಕಾರ್ಯವಿಧಾನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...' : 'Loading guided legal workflows...'}
        </p>
      </div>
    );
  }

  // ================= DETAIL / STEPPER VIEW =================
  if (activeWorkflow) {
    const currentStep: WorkflowStep = activeWorkflow.steps[activeStepIndex] || activeWorkflow.steps[0];
    const totalSteps = activeWorkflow.steps.length;

    // Checklist completion calculations
    const allDocs = activeWorkflow.steps.flatMap((s) => s.documents_needed || []);
    const checkedCount = allDocs.filter((d) => checklistProgress[d]).length;
    const progressPercent = allDocs.length > 0 ? Math.round((checkedCount / allDocs.length) * 100) : 0;
    const authorityName = currentStep.where_authority || currentStep.where_or_with_whom || 'District Legal Services Authority';

    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Printable Section Header (visible on print) */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
            Nyaya-Maarg - Legal Workflow Checklist
          </h1>
          <p className="text-sm text-gray-600">
            Workflow: {lang === 'kn' && activeWorkflow.title_kn ? activeWorkflow.title_kn : activeWorkflow.title} | Verified: {activeWorkflow.last_verified}
          </p>
        </div>

        {/* Top Navigation & Badges */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setSelectedWorkflowId(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
          >
            <ArrowLeft size={16} />
            {lang === 'kn' ? 'ಎಲ್ಲಾ ಕಾರ್ಯವಿಧಾನಗಳು' : 'All Workflows'}
          </button>

          <div className="flex items-center gap-2">
            {activeWorkflow.is_sample && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide"
                style={{ background: 'var(--color-status-warning-bg)', color: 'var(--color-status-warning-ink)' }}
              >
                <Warning size={14} weight="bold" />
                {lang === 'kn' ? 'ಮಾದರಿ ಮಾರ್ಗದರ್ಶಿ — ಪರಿಶೀಲನೆ ಬಾಕಿ' : 'SAMPLE — Needs Ground Verification'}
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border shadow-xs transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
              style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
            >
              <Printer size={16} />
              {lang === 'kn' ? 'ದಾಖಲೆ ಪಟ್ಟಿ ಮುದ್ರಿಸಿ' : 'Print Briefing Sheet'}
            </button>
          </div>
        </div>

        {/* Workflow Title Card */}
        <div
          className="p-6 rounded-2xl border mb-8"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-surface-2)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                {lang === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿತ ಪ್ರಕ್ರಿಯೆ' : 'Standard Citizen Procedure'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
                {lang === 'kn' && activeWorkflow.title_kn ? activeWorkflow.title_kn : activeWorkflow.title}
              </h1>
              <p className="mt-2 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
                {lang === 'kn' && (activeWorkflow.summary_kn || activeWorkflow.plain_language_summary_kn)
                  ? activeWorkflow.summary_kn || activeWorkflow.plain_language_summary_kn
                  : activeWorkflow.summary || activeWorkflow.plain_language_summary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                <span>
                  <strong>{lang === 'kn' ? 'ಯಾರಿಗಾಗಿ:' : 'Who it is for:'}</strong>{' '}
                  {lang === 'kn' && (activeWorkflow.who_it_is_for_kn || activeWorkflow.who_is_it_for_kn)
                    ? activeWorkflow.who_it_is_for_kn || activeWorkflow.who_is_it_for_kn
                    : activeWorkflow.who_it_is_for || activeWorkflow.who_is_it_for}
                </span>
                <span>•</span>
                <span>
                  <strong>{lang === 'kn' ? 'ಕೊನೆಯ ಪರಿಶೀಲನೆ:' : 'Last verified:'}</strong> {activeWorkflow.last_verified}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Document Checklist Bar */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-surface-2)' }}>
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span>{lang === 'kn' ? 'ದಾಖಲೆಗಳ ಸಿದ್ಧತೆ ಪ್ರಗತಿ:' : 'Document Readiness Progress:'}</span>
              <span className="font-mono">{checkedCount} / {allDocs.length} ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%`, background: 'var(--color-accent)' }}
              />
            </div>
          </div>
        </div>

        {/* Stepper + Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Vertical Stepper Sidebar */}
          <div className="no-print lg:col-span-4">
            <div
              className="sticky top-20 p-4 rounded-xl border"
              style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-surface-2)' }}
            >
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
                {lang === 'kn' ? 'ಹಂತಗಳ ಪಟ್ಟಿ' : 'Process Steps'}
              </h3>
              <div className="space-y-3">
                {activeWorkflow.steps.map((st, idx) => {
                  const stepNum = st.step_number || (idx + 1);
                  const isCurrent = idx === activeStepIndex;
                  const isDone = idx < activeStepIndex;
                  return (
                    <button
                      key={st.id || idx}
                      onClick={() => setActiveStepIndex(idx)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                        isCurrent
                          ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 shadow-xs ring-1 ring-teal-600'
                          : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle size={18} weight="fill" className="text-teal-600" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 rounded-full border-2 border-teal-600 bg-teal-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {stepNum}
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-neutral-400 flex items-center justify-center text-[10px] text-neutral-500 font-medium">
                            {stepNum}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-semibold ${isCurrent ? 'text-teal-800 dark:text-teal-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {lang === 'kn' && st.title_kn ? st.title_kn : st.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                          {st.typical_timeline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Handoff Actions */}
              <div className="mt-6 pt-4 border-t space-y-2.5" style={{ borderColor: 'var(--color-surface-2)' }}>
                <button
                  onClick={() => onTrackCase(activeWorkflow.id, activeWorkflow.title, authorityName)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <FolderSimplePlus size={18} weight="bold" />
                  {lang === 'kn' ? 'ಈ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಪ್ರಕರಣವಾಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : 'Track This as a Case'}
                </button>

                <button
                  onClick={() =>
                    onAskAssistant(
                      `I am working through step ${activeStepIndex + 1} ("${currentStep.title}") of the workflow "${activeWorkflow.title}". ${currentStep.what_to_do} What should I know or be cautious about?`
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  style={{ borderColor: 'var(--color-surface-2)', color: 'var(--color-ink-primary)' }}
                >
                  <ChatCircleText size={16} />
                  {lang === 'kn' ? 'ಈ ಹಂತದ ಬಗ್ಗೆ ಸಹಾಯಕರನ್ನು ಕೇಳಿ' : 'Ask Assistant About This Step'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Step Details */}
          <div className="lg:col-span-8 space-y-6">
            <div
              className="p-6 rounded-2xl border"
              style={{ background: 'var(--color-surface-0)', borderColor: 'var(--color-surface-2)' }}
            >
              {/* Step Pill */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {lang === 'kn' ? `ಹಂತ ${activeStepIndex + 1} / ${totalSteps}` : `Step ${activeStepIndex + 1} of ${totalSteps}`}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                  <Clock size={15} />
                  {currentStep.typical_timeline}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                {lang === 'kn' && currentStep.title_kn ? currentStep.title_kn : currentStep.title}
              </h2>

              {/* What to do */}
              <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  {lang === 'kn' ? 'ನೀವು ಏನು ಮಾಡಬೇಕು:' : 'What To Do:'}
                </h4>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-ink-primary)' }}>
                  {lang === 'kn' && currentStep.what_to_do_kn ? currentStep.what_to_do_kn : currentStep.what_to_do}
                </p>
              </div>

              {/* Branching flow question (if exists) */}
              {currentStep.branch_condition && (
                <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                    <Info size={16} />
                    {lang === 'kn' ? 'ತ್ವರಿತ ಪರಿಶೀಲನೆ:' : 'Branching Question:'} {currentStep.branch_condition.question}
                  </h4>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setBranchAnswer('yes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        branchAnswer === 'yes'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-neutral-800 border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      {lang === 'kn' ? 'ಹೌದು' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setBranchAnswer('no')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        branchAnswer === 'no'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-neutral-800 border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      {lang === 'kn' ? 'ಇಲ್ಲ' : 'No'}
                    </button>
                  </div>
                  {branchAnswer && (
                    <p className="mt-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                      💡{' '}
                      {branchAnswer === 'yes'
                        ? currentStep.branch_condition.if_yes_instruction || currentStep.branch_condition.if_yes
                        : currentStep.branch_condition.if_no_instruction || currentStep.branch_condition.if_no}
                    </p>
                  )}
                </div>
              )}

              {/* Documents Checklist for this step */}
              <div className="mt-6">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  {lang === 'kn' ? 'ಈ ಹಂತಕ್ಕೆ ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳು:' : 'Documents Needed for this Step:'}
                </h4>
                <div className="space-y-2">
                  {currentStep.documents_needed.map((doc, dIdx) => {
                    const isChecked = !!checklistProgress[doc];
                    return (
                      <div
                        key={dIdx}
                        onClick={() => toggleDocumentCheck(doc)}
                        className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                          isChecked
                            ? 'bg-teal-50/60 border-teal-300 dark:bg-teal-950/20 dark:border-teal-800'
                            : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isChecked ? (
                            <CheckSquare size={20} weight="fill" className="text-teal-600" />
                          ) : (
                            <div className="w-5 h-5 rounded border border-neutral-400 bg-white dark:bg-neutral-900" />
                          )}
                          <span className={`text-sm ${isChecked ? 'line-through text-neutral-500 dark:text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                            {doc}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400 uppercase">
                          {isChecked ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Common Mistakes */}
              {currentStep.common_mistakes && (
                <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/40 flex items-start gap-3">
                  <Warning size={20} className="text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                      {lang === 'kn' ? 'ಸಾಮಾನ್ಯ ತಪ್ಪುಗಳು ಮತ್ತು ಎಚ್ಚರಿಕೆ:' : 'Common Mistakes to Avoid:'}
                    </h5>
                    <p className="mt-1 text-xs sm:text-sm text-red-900 dark:text-red-200">
                      {Array.isArray(currentStep.common_mistakes)
                        ? currentStep.common_mistakes.join('; ')
                        : currentStep.common_mistakes}
                    </p>
                  </div>
                </div>
              )}

              {/* Where to go / Authority with Center Card */}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-surface-2)' }}>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-2">
                  <Buildings size={16} />
                  {lang === 'kn' ? 'ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು / ಯಾರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕು:' : 'Where To Go / Authority:'}
                </h4>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink-primary)' }}>
                  {authorityName}
                </p>

                {matchedCentre && (
                  <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                        {matchedCentre.type}
                      </span>
                      <h5 className="text-sm font-bold mt-1">{matchedCentre.name}</h5>
                      <p className="text-xs text-neutral-500 mt-0.5">{matchedCentre.address}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getGoogleMapsUrl(matchedCentre.lat, matchedCentre.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white dark:bg-neutral-900 transition-colors hover:bg-neutral-50"
                      >
                        <ArrowSquareOut size={14} />
                        Open in Maps
                      </a>
                      {matchedCentre.phone && (
                        <a
                          href={getPhoneUrl(matchedCentre.phone)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                          style={{ background: 'var(--color-accent)' }}
                        >
                          <Phone size={14} />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stepper Forward / Back navigation buttons */}
              <div className="no-print mt-8 pt-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-surface-2)' }}>
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ borderColor: 'var(--color-surface-2)' }}
                >
                  {lang === 'kn' ? 'ಹಿಂದಿನ ಹಂತ' : 'Previous Step'}
                </button>

                {activeStepIndex < totalSteps - 1 ? (
                  <button
                    onClick={() => setActiveStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {lang === 'kn' ? 'ಮುಂದಿನ ಹಂತ' : 'Next Step'}
                    <CaretRight size={14} weight="bold" />
                  </button>
                ) : (
                  <button
                    onClick={() => onTrackCase(activeWorkflow.id, activeWorkflow.title, authorityName)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs bg-emerald-600 hover:bg-emerald-700 transition-colors"
                  >
                    <FolderSimplePlus size={16} weight="bold" />
                    {lang === 'kn' ? 'ಪ್ರಕ್ರಿಯೆ ಪೂರ್ಣಗೊಳಿಸಿ — ಕೇಸ್ ರಚಿಸಿ' : 'Finish & Track as Case'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= WORKFLOW LIBRARY VIEW =================
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          {lang === 'kn' ? 'ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ' : 'Guided Legal Workflows'}
        </span>
        <h1 className="text-3xl font-semibold mt-1.5" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
          {lang === 'kn' ? 'ಸಾಮಾನ್ಯ ಸಮಸ್ಯೆಗಳಿಗೆ ಸರಳ ಪರಿಹಾರ ಮಾರ್ಗ' : 'Navigate Common Legal Situations'}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {lang === 'kn'
            ? 'ಕಾನೂನು ಭಾಷೆಯ ಬದಲು ನಿಮ್ಮ ವಾಸ್ತವ ಪರಿಸ್ಥಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಮಾರ್ಗದರ್ಶನ ಪಡೆಯಿರಿ.'
            : 'Structured procedural checklists defined as transparent data. Written in everyday language, not legal jargon.'}
        </p>

        {/* Search Bar */}
        <div className="mt-6 relative max-w-lg mx-auto">
          <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'kn'
                ? 'ಸಮಸ್ಯೆಯನ್ನು ಹುಡುಕಿ (ಉದಾ: ಬಾಡಿಗೆ, ಸಂಬಳ, ಆರ್‌ಟಿಐ, ಗ್ರಾಹಕ)...'
                : 'Search by situation (e.g., rental deposit, unpaid wages, RTI, consumer)...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm shadow-xs outline-none focus:ring-2 focus:ring-teal-600 transition-all"
            style={{
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-surface-2)',
              color: 'var(--color-ink-primary)',
            }}
          />
        </div>
      </div>

      {/* Grid of Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.map((wf) => {
          const summaryEn = wf.summary || wf.plain_language_summary || '';
          const summaryKn = wf.summary_kn || wf.plain_language_summary_kn || '';
          const whoEn = wf.who_it_is_for || wf.who_is_it_for || '';
          const whoKn = wf.who_it_is_for_kn || wf.who_is_it_for_kn || '';

          return (
            <div
              key={wf.id}
              className="rounded-2xl border p-6 flex flex-col justify-between transition-all hover:shadow-md"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-surface-2)',
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                    {wf.steps.length} {lang === 'kn' ? 'ಹಂತಗಳು' : 'Steps'}
                  </span>
                  {wf.is_sample && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-status-warning-bg)', color: 'var(--color-status-warning-ink)' }}
                    >
                      SAMPLE
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold leading-snug" style={{ fontFamily: 'var(--font-serif)' }}>
                  {lang === 'kn' && wf.title_kn ? wf.title_kn : wf.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-3">
                  {lang === 'kn' && summaryKn ? summaryKn : summaryEn}
                </p>

                <div className="mt-4 pt-3 border-t text-[11px] text-neutral-500 space-y-1" style={{ borderColor: 'var(--color-surface-2)' }}>
                  <p>
                    <strong>{lang === 'kn' ? 'ಅನ್ವಯ:' : 'For:'}</strong>{' '}
                    <span className="line-clamp-1">{lang === 'kn' && whoKn ? whoKn : whoEn}</span>
                  </p>
                  <p>
                    <strong>{lang === 'kn' ? 'ಪರಿಶೀಲನೆ:' : 'Verified:'}</strong> {wf.last_verified}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-surface-2)' }}>
                <button
                  onClick={() => setSelectedWorkflowId(wf.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                >
                  {lang === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿ ಪ್ರಾರಂಭಿಸಿ' : 'View Guided Steps'}
                  <CaretRight size={14} weight="bold" />
                </button>

                <button
                  onClick={() => onTrackCase(wf.id, wf.title, 'District Legal Services Authority')}
                  className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  {lang === 'kn' ? '+ ನೇರ ಟ್ರ್ಯಾಕ್' : '+ Track as Case'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowsView;
