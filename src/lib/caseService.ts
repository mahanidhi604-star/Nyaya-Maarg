import { supabase, isSupabaseConfigured } from './supabase';
import type { UserCase, CaseEvent } from '../types';

const STORAGE_PREFIX = 'nyaya_maarg_cases_';

// Regex for PII patterns in India: Aadhaar (12 digits with spaces), PAN (5 letters + 4 digits + 1 letter), Phone (10 digits)
export const PII_REGEX =
  /(\b\d{4}\s\d{4}\s\d{4}\b)|(\b\d{12}\b)|(\b[A-Z]{5}\d{4}[A-Z]\b)|(\b(?:\+91|91|0)?[6-9]\d{9}\b)/g;

export function detectPII(text: string): boolean {
  if (!text) return false;
  return PII_REGEX.test(text);
}

// Demo cases seed
const DEMO_CASES: UserCase[] = [
  {
    id: 'demo-case-1',
    user_id: 'demo_user',
    title: 'Indiranagar Rental Deposit Recovery',
    workflow_id: 'recover-rental-deposit',
    workflow_type: 'Rental Dispute',
    authority_forum: 'Bengaluru Mediation Centre (Nyaya Degula)',
    stage: 'Filed',
    key_dates: {
      next_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hearing_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    notes: 'Landlord withheld ₹85,000 security deposit citing unverified painting costs. Mediation notice dispatched.',
    checklist_progress: { 'step-inventory': true, 'step-legal-notice': true },
    current_step_index: 2,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true,
    events: [
      {
        id: 'ev-1',
        case_id: 'demo-case-1',
        type: 'filed',
        title: 'Dispatched 15-Day Registered Demand Notice',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Speed post tracking receipt attached to file.',
        is_completed: true,
      },
      {
        id: 'ev-2',
        case_id: 'demo-case-1',
        type: 'hearing',
        title: 'Preliminary Mediation Session',
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Session at Bengaluru Mediation Centre, 2nd Floor, City Civil Court Complex.',
        is_completed: false,
      },
    ],
  },
  {
    id: 'demo-case-2',
    user_id: 'demo_user',
    title: 'DLSA Free Legal Aid Application for Maintenance',
    workflow_id: 'apply-free-legal-aid',
    workflow_type: 'Legal Aid Application',
    authority_forum: 'DLSA Bengaluru Urban Front Office',
    stage: 'Preparing',
    key_dates: {
      next_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    notes: 'Drafting Form A and compiling BPL certificate for fee exemption.',
    checklist_progress: { 'step-eligibility': true },
    current_step_index: 1,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true,
    events: [
      {
        id: 'ev-3',
        case_id: 'demo-case-2',
        type: 'note',
        title: 'Eligibility Verified under Section 12',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Qualifies under statutory income criteria.',
        is_completed: true,
      },
    ],
  },
];

function getLocalStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

export async function fetchUserCases(userId: string): Promise<UserCase[]> {
  if (isSupabaseConfigured && supabase && userId && userId !== 'demo_user' && userId !== 'guest') {
    try {
      const { data: cases, error } = await supabase
        .from('cases')
        .select('*, case_events(*)')
        .order('created_at', { ascending: false });

      if (!error && cases) {
        return cases.map((c: any) => ({
          ...c,
          events: c.case_events || [],
        }));
      }
    } catch {
      // Fall through to local storage fallback
    }
  }

  // Local fallback
  const raw = localStorage.getItem(getLocalStorageKey(userId));
  if (!raw) {
    // Seed demo cases on first load
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(DEMO_CASES));
    return DEMO_CASES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEMO_CASES;
  }
}

export async function saveUserCase(caseData: Partial<UserCase>, userId: string): Promise<UserCase> {
  const newCase: UserCase = {
    id: caseData.id || `case_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId || 'guest',
    title: caseData.title || 'Untitled Legal Case',
    workflow_id: caseData.workflow_id,
    workflow_type: caseData.workflow_type || 'General Civil Matter',
    authority_forum: caseData.authority_forum || 'District Legal Services Authority',
    stage: caseData.stage || 'Preparing',
    key_dates: caseData.key_dates || {},
    notes: caseData.notes || '',
    checklist_progress: caseData.checklist_progress || {},
    current_step_index: caseData.current_step_index ?? 0,
    created_at: caseData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: false,
    events: caseData.events || [],
  };

  if (isSupabaseConfigured && supabase && userId && userId !== 'demo_user' && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('cases')
        .upsert({
          id: newCase.id,
          user_id: userId,
          title: newCase.title,
          workflow_id: newCase.workflow_id,
          workflow_type: newCase.workflow_type,
          authority_forum: newCase.authority_forum,
          stage: newCase.stage,
          key_dates: newCase.key_dates,
          notes: newCase.notes,
          checklist_progress: newCase.checklist_progress,
          current_step_index: newCase.current_step_index,
        })
        .select()
        .single();

      if (!error && data) {
        return { ...newCase, ...data };
      }
    } catch {
      // Fall through to local
    }
  }

  // Local storage save
  const existing = await fetchUserCases(userId);
  const index = existing.findIndex((c) => c.id === newCase.id);
  let updatedList: UserCase[];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = { ...updatedList[index], ...newCase, events: updatedList[index].events };
  } else {
    updatedList = [newCase, ...existing];
  }
  localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(updatedList));
  return newCase;
}

export async function deleteUserCase(caseId: string, userId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase && userId && userId !== 'demo_user' && userId !== 'guest') {
    try {
      const { error } = await supabase.from('cases').delete().eq('id', caseId);
      if (!error) return true;
    } catch {
      // Fall through to local
    }
  }

  const existing = await fetchUserCases(userId);
  const filtered = existing.filter((c) => c.id !== caseId);
  localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(filtered));
  return true;
}

export async function addCaseTimelineEvent(
  caseId: string,
  event: Partial<CaseEvent>,
  userId: string
): Promise<CaseEvent> {
  const newEvent: CaseEvent = {
    id: event.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    case_id: caseId,
    type: event.type || 'note',
    title: event.title || 'Timeline Note',
    date: event.date || new Date().toISOString().split('T')[0],
    notes: event.notes || '',
    is_completed: event.is_completed || false,
  };

  if (isSupabaseConfigured && supabase && userId && userId !== 'demo_user' && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('case_events')
        .insert({
          id: newEvent.id,
          case_id: caseId,
          user_id: userId,
          type: newEvent.type,
          title: newEvent.title,
          date: newEvent.date,
          notes: newEvent.notes,
          is_completed: newEvent.is_completed,
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch {
      // Fall through
    }
  }

  // Local storage update
  const existing = await fetchUserCases(userId);
  const c = existing.find((item) => item.id === caseId);
  if (c) {
    c.events = [...(c.events || []), newEvent];
    c.updated_at = new Date().toISOString();
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(existing));
  }
  return newEvent;
}

export async function deleteCaseTimelineEvent(
  caseId: string,
  eventId: string,
  userId: string
): Promise<boolean> {
  if (isSupabaseConfigured && supabase && userId && userId !== 'demo_user' && userId !== 'guest') {
    try {
      const { error } = await supabase.from('case_events').delete().eq('id', eventId);
      if (!error) return true;
    } catch {
      // Fall through
    }
  }

  const existing = await fetchUserCases(userId);
  const c = existing.find((item) => item.id === caseId);
  if (c && c.events) {
    c.events = c.events.filter((ev) => ev.id !== eventId);
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(existing));
  }
  return true;
}

export async function exportAllCasesJSON(userId: string): Promise<void> {
  const cases = await fetchUserCases(userId);
  const jsonStr = JSON.stringify(cases, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nyaya_maarg_cases_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteAllCases(userId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase && userId && userId !== 'demo_user' && userId !== 'guest') {
    try {
      await supabase.from('cases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // Ignore
    }
  }
  localStorage.removeItem(getLocalStorageKey(userId));
  return true;
}

// RFC 5545 iCalendar (.ics) export for single event
export function downloadEventIcs(event: CaseEvent, caseTitle: string): void {
  const dateFormatted = event.date.replace(/-/g, '');
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nyaya-Maarg//Legal Aid Case Tracker//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:case_event_${event.id}@nyaya-maarg.org`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${dateFormatted}`,
    `DTEND;VALUE=DATE:${dateFormatted}`,
    `SUMMARY:${escapeIcs(event.title)} (${escapeIcs(caseTitle)})`,
    `DESCRIPTION:${escapeIcs(event.notes || 'Legal hearing or compliance deadline in Nyaya-Maarg')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeIcs(str: string): string {
  return str.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n');
}
