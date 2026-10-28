-- ========================================================
-- CIVICBLINDSPOT: CASE TRACKING & ROW LEVEL SECURITY (RLS)
-- ========================================================

-- 1. Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Cases Table
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  workflow_id TEXT,
  workflow_type TEXT NOT NULL,
  authority_forum TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Preparing' CHECK (stage IN ('Preparing', 'Filed', 'Hearing', 'Resolved', 'Closed')),
  key_dates JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  checklist_progress JSONB DEFAULT '{}'::jsonb,
  current_step_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Case Events Table
CREATE TABLE IF NOT EXISTS public.case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('filed', 'hearing', 'reply_due', 'order_received', 'note')),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for Cases (Users can ONLY access their own data)
CREATE POLICY "cases_user_select"
  ON public.cases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cases_user_insert"
  ON public.cases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cases_user_update"
  ON public.cases
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cases_user_delete"
  ON public.cases
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Strict RLS Policies for Case Events
CREATE POLICY "events_user_select"
  ON public.case_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "events_user_insert"
  ON public.case_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "events_user_update"
  ON public.case_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "events_user_delete"
  ON public.case_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Automated updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cases_updated_at ON public.cases;
CREATE TRIGGER trigger_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
