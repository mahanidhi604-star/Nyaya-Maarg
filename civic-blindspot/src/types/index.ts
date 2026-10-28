export interface Centre {
  id: string;
  name: string;
  name_kn: string;
  type: 'DLSA' | 'TLSC' | 'SLSA' | 'NGO' | 'Legal Aid Clinic';
  district: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  services: string[];
  languages: string[];
  source_url: string;
  last_verified: string;
  is_sample: boolean;
}

export interface Area {
  id: string;
  name: string;
  name_kn: string;
  district: string;
  population: number;
  centroid_lat: number;
  centroid_lng: number;
  source: string;
  is_sample: boolean;
}

export interface AreaWithGap extends Area {
  nearest_centre_id: string | null;
  nearest_centre_name: string;
  nearest_km: number;
  gap_score: 0 | 1 | 2 | 3 | 4;
  gap_rank: number;
  people_beyond_threshold: number;
}

export interface GapSummary {
  total_areas: number;
  areas_beyond_threshold: number;
  people_beyond_threshold: number;
  threshold_km: number;
  top_underserved: AreaWithGap[];
  avg_distance_km: number;
}

export type ViewMode =
  | 'overview'
  | 'explorer'
  | 'insights'
  | 'workflows'
  | 'cases'
  | 'interpreter'
  | 'navigator'
  | 'login'
  | 'signup';

export type Language = 'en' | 'kn';

export interface NavigatorAnswers {
  issue_type: string | null;
  urgency: string | null;
  affected_party: string | null;
  income_category: string | null;
  language_pref: string | null;
}

export interface NavigatorResult {
  centres: Centre[];
  resources: {
    name: string;
    name_kn: string;
    description: string;
    description_kn: string;
    url: string;
  }[];
  checklist: {
    item: string;
    item_kn: string;
  }[];
}

/* ========================================================
   WORKFLOWS DATA MODEL
======================================================== */
export interface WorkflowStep {
  id?: string;
  step_number?: number;
  title: string;
  title_kn?: string;
  what_to_do: string;
  what_to_do_kn?: string;
  where_authority?: string;
  where_authority_kn?: string;
  where_or_with_whom?: string;
  where_or_with_whom_kn?: string;
  documents_needed: string[];
  documents_needed_kn?: string[];
  typical_timeline: string;
  typical_timeline_kn?: string;
  common_mistakes?: string[] | string;
  common_mistakes_kn?: string[] | string;
  branch_condition?: {
    question: string;
    question_kn?: string;
    if_yes?: string;
    if_no?: string;
    if_yes_instruction?: string;
    if_no_instruction?: string;
  };
}

export interface Workflow {
  id: string;
  title: string;
  title_kn?: string;
  situation_label?: string;
  situation_label_kn?: string;
  summary?: string;
  summary_kn?: string;
  plain_language_summary?: string;
  plain_language_summary_kn?: string;
  who_it_is_for?: string;
  who_it_is_for_kn?: string;
  who_is_it_for?: string;
  who_is_it_for_kn?: string;
  steps: WorkflowStep[];
  official_links?: { label: string; url: string }[];
  source_url?: string;
  last_verified: string;
  is_sample: boolean;
}

/* ========================================================
   CASE TRACKING DATA MODEL
======================================================== */
export type CaseStage = 'Preparing' | 'Filed' | 'Hearing' | 'Hearing/Follow-up' | 'Resolved' | 'Closed';

export interface CaseEvent {
  id: string;
  case_id: string;
  type: 'filed' | 'hearing' | 'reply_due' | 'order_received' | 'note';
  title: string;
  date: string; // ISO YYYY-MM-DD
  notes?: string;
  is_completed?: boolean;
}

export interface UserCase {
  id: string;
  user_id: string;
  title: string;
  workflow_id?: string;
  workflow_type: string;
  authority_forum: string;
  stage: CaseStage;
  key_dates: {
    next_deadline?: string;
    hearing_date?: string;
  };
  notes?: string;
  checklist_progress?: Record<string, boolean>;
  current_step_index?: number;
  events?: CaseEvent[];
  created_at: string;
  updated_at: string;
  is_demo?: boolean;
}

/* ========================================================
   CASE INTERPRETER DATA MODEL
======================================================== */
export interface ExtractedDate {
  title?: string;
  label?: string;
  date?: string;
  date_iso?: string;
  source_snippet: string;
  is_confirmed?: boolean;
  is_overdue?: boolean;
  days_remaining?: number;
}

export interface InterpreterResult {
  doc_type?: string;
  document_type?: string;
  confidence?: number | 'high' | 'medium' | 'low';
  summary?: string;
  summary_plain?: string;
  simple_actions_required?: string[];
  required_actions?: string[];
  key_dates: ExtractedDate[];
  parties_and_forum: {
    parties?: string[];
    forum?: string;
    forum_or_authority?: string;
    case_number?: string;
  };
  glossary: {
    term: string;
    explanation: string;
  }[];
  needs_lawyer_items?: string[];
  unclear_or_needs_lawyer?: string[];
  suggested_workflow_id?: string;
  suggested_workflow_ids?: string[];
  questions_to_ask_clinic?: string[];
  questions_for_clinic?: string[];
  disclaimer?: string;
  is_emergency?: boolean;
  emergency_reason?: string;
  emergency_note?: string;
}
