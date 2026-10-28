import { useState, useRef, useEffect, useId } from 'react';
import {
  Sparkle, X, ArrowUp, ArrowCounterClockwise, Stop, WarningCircle,
  MapPin, ShieldCheck, ArrowSquareOut
} from '@phosphor-icons/react';
import type { Language, Centre, UserCase } from '../types';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: {
    id: string;
    name: string;
    district?: string;
    last_verified?: string;
    is_sample?: boolean;
  }[];
  actions?: {
    type: 'filter_district' | 'set_threshold' | 'select_centre' | 'view_tab';
    payload: Record<string, string | number>;
    label: string;
  }[];
  timestamp: string;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectCentre: (centreId: string) => void;
  onApplyFilter: (district?: string, threshold?: number) => void;
  onNavigateTab: (tab: 'overview' | 'explorer' | 'insights' | 'navigator') => void;
  centres: Centre[];
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  userCases?: UserCase[];
}

const SUGGESTIONS_EN = [
  'Which districts are most underserved?',
  'Where can a tenant get free legal help in Raichur?',
  'What should I bring to a legal aid clinic?',
  'How far is Chikkamagaluru from the nearest centre?',
];

const SUGGESTIONS_KN = [
  'ಯಾವ ಜಿಲ್ಲೆಗಳಲ್ಲಿ ಕಾನೂನು ನೆರವು ಕೊರತೆ ಹೆಚ್ಚಾಗಿದೆ?',
  'ರಾಯಚೂರಿನಲ್ಲಿ ಬಾಡಿಗೆದಾರರಿಗೆ ಉಚಿತ ಕಾನೂನು ನೆರವು ಎಲ್ಲಿ ಸಿಗುತ್ತದೆ?',
  'ಕಾನೂನು ನೆರವು ಕ್ಲಿನಿಕ್‌ಗೆ ಹೋಗುವಾಗ ಯಾವ ದಾಖಲೆಗಳನ್ನು ತರಬೇಕು?',
  'ಚಿಕ್ಕಮಗಳೂರು ಹತ್ತಿರದ ಕೇಂದ್ರದಿಂದ ಎಷ್ಟು ದೂರದಲ್ಲಿದೆ?',
];

let globalMsgCounter = 0;
function nextMsgId(prefix: string): string {
  globalMsgCounter += 1;
  return `${prefix}_${globalMsgCounter}`;
}

function formatCurrentTime(): string {
  return 'Just now';
}

export default function AIAssistantDrawer({
  isOpen,
  onClose,
  lang,
  onSelectCentre,
  onApplyFilter,
  onNavigateTab,
  initialPrompt,
  onClearInitialPrompt,
  userCases = [],
}: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        lang === 'kn'
          ? 'ನಮಸ್ಕಾರ! ನಾನು ಕರ್ನಾಟಕದ ಉಚಿತ ಕಾನೂನು ನೆರವು ಕೇಂದ್ರಗಳು ಮತ್ತು ತಾಲ್ಲೂಕು ಕೊರತೆಗಳ ಬಗ್ಗೆ ಮಾಹಿತಿ ನೀಡುವ ಸಹಾಯಕ. ನಿಖರವಾದ ಡೇಟಾ ಆಧಾರಿತ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.'
          : 'Welcome. I am your grounded access assistant, referencing verified records of Karnataka legal services authorities and Census accessibility data. How may I guide your inquiry today?',
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [useCaseContext, setUseCaseContext] = useState(false);

  const sessionId = useRef('sess_active');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Handle incoming initial prompt from workflow steps
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInput(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, isOpen, onClearInitialPrompt]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (query.length > 1000) {
      setError(lang === 'kn' ? 'ಪ್ರಶ್ನೆ 1000 ಅಕ್ಷರಗಳಿಗಿಂತ ಕಡಿಮೆಯಿರಬೇಕು' : 'Question must be under 1,000 characters');
      return;
    }

    setError(null);
    const userMsg: AssistantMessage = {
      id: nextMsgId('usr'),
      role: 'user',
      content: query,
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    const activeCase = userCases[0];
    const casePayload = useCaseContext && activeCase ? {
      id: activeCase.id,
      title: activeCase.title,
      stage: activeCase.stage,
      authority_forum: activeCase.authority_forum,
      next_deadline: activeCase.key_dates?.next_deadline || activeCase.key_dates?.hearing_date,
      notes: activeCase.notes,
    } : undefined;

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          sessionId: sessionId.current,
          lang,
          caseSummaryConsent: useCaseContext,
          caseData: casePayload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.error && !data.reply) {
        throw new Error(data.error);
      }

      const botMsg: AssistantMessage = {
        id: nextMsgId('ast'),
        role: 'assistant',
        content: data.reply || 'No information found in the data.',
        citations: data.citations || [],
        actions: data.actions || [],
        timestamp: formatCurrentTime(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted
      } else {
        setError(
          lang === 'kn'
            ? 'ಉತ್ತರ ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.'
            : 'Unable to reach the assistant service. Please retry in a moment.'
        );
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    sessionId.current = `sess_${Math.random().toString(36).slice(2, 9)}`;
    setMessages([
      {
        id: 'welcome_new',
        role: 'assistant',
        content:
          lang === 'kn'
            ? 'ಹೊಸ ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭವಾಗಿದೆ. ಕರ್ನಾಟಕದ ಕಾನೂನು ನೆರವು ಲಭ್ಯತೆ ಕುರಿತು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?'
            : 'New session started. Conversations are not persisted. What question can I research from the database?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setError(null);
  };

  const executeAction = (action: { type: string; payload: Record<string, string | number> }) => {
    if (action.type === 'select_centre' && action.payload.centreId) {
      onSelectCentre(String(action.payload.centreId));
      onNavigateTab('explorer');
      onClose();
    } else if (action.type === 'filter_district' && action.payload.district) {
      onApplyFilter(String(action.payload.district));
      onNavigateTab('explorer');
      onClose();
    } else if (action.type === 'set_threshold' && action.payload.threshold) {
      onApplyFilter(undefined, Number(action.payload.threshold));
      onNavigateTab('explorer');
      onClose();
    } else if (action.type === 'view_tab' && action.payload.tab) {
      onNavigateTab(action.payload.tab as any);
      onClose();
    }
  };

  if (!isOpen) return null;

  const suggestions = lang === 'kn' ? SUGGESTIONS_KN : SUGGESTIONS_EN;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[450px] z-50 flex flex-col border-l transition-transform duration-300"
      style={{
        background: 'var(--color-surface-0)',
        borderColor: 'var(--color-surface-2)',
        boxShadow: 'var(--shadow-xl)',
      }}
      role="dialog"
      aria-labelledby="assistant-title"
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-surface-2)', background: 'var(--color-surface-1)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: '#ffffff' }}
          >
            <Sparkle size={18} weight="fill" />
          </div>
          <div>
            <h2 id="assistant-title" className="text-sm font-semibold" style={{ color: 'var(--color-ink-primary)' }}>
              {lang === 'kn' ? 'ನ್ಯಾಯ ಸಾಮೀಪ್ಯ ಸಹಾಯಕ' : 'Civic Access Assistant'}
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>
              {lang === 'kn' ? 'ಡೇಟಾ ಆಧಾರಿತ ನಿಖರ ಮಾಹಿತಿ' : 'Grounded on verified Karnataka data'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-md text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            title={lang === 'kn' ? 'ಹೊಸ ಚಾಟ್' : 'New chat'}
            aria-label="New chat"
          >
            <ArrowCounterClockwise size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            title={lang === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close drawer'}
            aria-label="Close assistant"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Grounding and Privacy Banner */}
      <div
        className="px-4 py-2 border-b flex items-start gap-2 text-[11px]"
        style={{
          background: 'var(--color-surface-0)',
          borderColor: 'var(--color-surface-2)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        <ShieldCheck size={16} className="text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
        <span>
          {lang === 'kn'
            ? 'ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. ಈ ಸಹಾಯಕ ಸಾಮಾನ್ಯ ಕಾರ್ಯವಿಧಾನದ ಮಾಹಿತಿ ಮಾತ್ರ ನೀಡುತ್ತದೆ, ಕಾನೂನು ಸಲಹೆಯಲ್ಲ.'
            : 'Private session: Do not share personal case details. Information is procedural guidance, not formal legal advice.'}
        </span>
      </div>

      {/* Case Context Privacy Toggle */}
      <div
        className="px-4 py-2 border-b flex items-center justify-between text-xs transition-colors"
        style={{
          background: useCaseContext ? 'var(--color-surface-1)' : 'var(--color-surface-0)',
          borderColor: 'var(--color-surface-2)',
        }}
      >
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useCaseContext}
            onChange={(e) => setUseCaseContext(e.target.checked)}
            className="rounded text-teal-600 focus:ring-0 cursor-pointer"
          />
          <span className="font-medium text-[var(--color-ink-primary)]">
            {lang === 'kn' ? 'ನನ್ನ ಪ್ರಕರಣವನ್ನು ಈ ಚಾಟ್‌ನಲ್ಲಿ ಬಳಸಿ' : 'Use my case in this chat'}
          </span>
        </label>
        {useCaseContext ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-semibold">
            ON: {userCases[0]?.title ? userCases[0].title.slice(0, 16) + '...' : 'Case Active'}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-[var(--color-ink-tertiary)]">
            OFF (Default)
          </span>
        )}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={{
                background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-1)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--color-ink-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--color-surface-2)',
              }}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Citations Chips */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[var(--color-surface-2)] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                    {lang === 'kn' ? 'ಉಲ್ಲೇಖಿತ ಕೇಂದ್ರಗಳು:' : 'Referenced Records:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCentre(c.id);
                          onNavigateTab('explorer');
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-all hover:bg-[var(--color-surface-0)] active:scale-95"
                        style={{
                          background: 'var(--color-surface-0)',
                          borderColor: 'var(--color-accent)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        <MapPin size={12} />
                        <span>{c.name}</span>
                        {c.is_sample && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">SAMPLE</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured UI Action Triggers */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {msg.actions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => executeAction(act)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 shadow-sm"
                      style={{ background: 'var(--color-accent)', color: '#ffffff' }}
                    >
                      <span>{act.label}</span>
                      <ArrowSquareOut size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] mt-1 px-1 text-[var(--color-ink-tertiary)] font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-surface-1)] border border-[var(--color-surface-2)] text-xs text-[var(--color-ink-secondary)] w-fit">
            <div className="w-3.5 h-3.5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <span>{lang === 'kn' ? 'ಡೇಟಾಬೇಸ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Cross-referencing database records...'}</span>
            <button
              onClick={handleStop}
              className="ml-2 p-1 text-[var(--color-status-danger)] hover:bg-[var(--color-surface-0)] rounded"
              title="Stop request"
            >
              <Stop size={14} weight="fill" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <WarningCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (when only welcome message) */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--color-surface-2)', background: 'var(--color-surface-0)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-[var(--color-ink-tertiary)]">
            {lang === 'kn' ? 'ಸೂಚಿಸಲಾದ ಪ್ರಶ್ನೆಗಳು:' : 'Suggested Inquiries:'}
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-left px-2.5 py-1.5 rounded-lg border text-xs text-[var(--color-ink-secondary)] transition-all hover:bg-[var(--color-surface-1)] hover:text-[var(--color-ink-primary)]"
                style={{ borderColor: 'var(--color-surface-2)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <div
        className="p-4 border-t"
        style={{ borderColor: 'var(--color-surface-2)', background: 'var(--color-surface-1)' }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <label htmlFor={inputId} className="sr-only">
            {lang === 'kn' ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ' : 'Ask about legal aid access in Karnataka'}
          </label>
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            maxLength={1000}
            placeholder={
              lang === 'kn'
                ? 'ತಾಲ್ಲೂಕು, ಜಿಲ್ಲೆ, ಅಥವಾ ಅಗತ್ಯ ದಾಖಲೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...'
                : 'Ask about a taluk, district, or required documents...'
            }
            className="w-full pl-3.5 pr-11 py-2.5 rounded-xl text-xs border bg-[var(--color-surface-0)] text-[var(--color-ink-primary)] outline-none focus:border-[var(--color-accent)]"
            style={{ borderColor: 'var(--color-surface-2)', minHeight: '44px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-40 transition-transform active:scale-95"
            aria-label="Send message"
          >
            <ArrowUp size={16} weight="bold" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
          <span>Grounded only on CivicBlindspot database</span>
          <span className="font-mono">{input.length}/1000</span>
        </div>
      </div>
    </div>
  );
}
