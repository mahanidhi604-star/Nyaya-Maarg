# Nyaya-Maarg - Legal Aid Access and Citizen Case Workspace (Karnataka)

> A civic-tech data publication and intelligence platform that maps disparities in access to free legal services across Karnataka's 176+ taluks, provides guided legal workflows, confidential case tracking with Row-Level Security, and a plain-language legal document interpreter.

---

## 🌟 Core Modules

### 1. Public Explorer & What-If Simulator (`/` & `/explorer`)
- **Live Headline Finding**: Live calculations showing unserved taluks and affected citizens beyond a configurable threshold (10–50 km).
- **Leaflet Spatial Visualization**: Taluk centroids color-coded on a 5-tier ColorBrewer sequential ramp with DLSA/TLSC pins and connecting shortest-path lines.
- **What-If Camp Simulator**: Click anywhere in Karnataka to simulate placing a new legal aid facility, with live calculation of newly covered taluks and populations.
- **Top Underserved Ranking**: Sortable list of the most isolated taluks with Census population and distance to the nearest centre.

### 2. Legal Workflows (`/workflows`)
- **Data-Driven Architecture**: Procedures defined entirely as data in `public/data/workflows.json` (not hardcoded in JSX).
- **5 Core Citizen Workflows (Bilingual EN/KN)**:
  1. *Apply for Free Legal Aid (Section 12 Legal Services Authorities Act)*
  2. *Recover a Tenancy Security Deposit (Bengaluru & Urban Centres)*
  3. *File a Consumer Protection Complaint (Deficient Service & Refunds)*
  4. *Raise an Unpaid Wages Claim (Payment of Wages Act)*
  5. *File a Right to Information (RTI) Request & First Appeal*
- **Interactive Stepper & Checklists**: Vertical stepper, branching conditional logic, document checklists with persistence in `localStorage`, and "Where to go" cards with Google Maps directions & direct call links.
- **Seamless Handoffs**:
  - *"Track this as a case"*: Automatically pre-fills a case file with the workflow title, category, and authority.
  - *"Ask about this step"*: Opens the AI Assistant with step context pre-loaded.
- **Printable Briefing Sheet**: Styled for clean physical printout via `@media print`.

### 3. Confidential Case Tracking (`/cases`, requires Auth or Guest Demo)
- **Managed Database with Row-Level Security (RLS)**: Stored in Supabase Postgres where users can ONLY read, insert, update, and delete their own records (`auth.uid() = user_id`). Seamless `localStorage` fallback for guest evaluation.
- **Timeline of Events**: Chronological log of filing dates, reply deadlines, hearing sessions, and orders received.
- **Dates & Deadlines Strip**: Upcoming hearing and compliance strip with countdown badges and overdue warning tags.
- **RFC 5545 iCalendar (`.ics`) Export**: Download 1-click calendar invites for any hearing or compliance deadline.
- **Data Minimisation & PII Warning**: Zero Aadhaar, PAN, or bank account storage. Automatic client-side regex detection warns users against saving personal identifiers in free text notes.
- **Privacy Controls**: Export all records as a portable JSON file, delete individual cases, or permanently purge all case records.

### 4. Plain-Language Case Interpreter (`/interpreter`)
- **Document Breakdown**: Paste notices, summons, tenancy letters, or RTI orders, or upload photos (JPEG/PNG).
- **Structured Output Card**:
  - Document classification with confidence level.
  - Plain-language explanation ("What it says in simple words").
  - Required actions and obligations demanded of the citizen.
  - Key dates & deadlines with **exact source quote snippets**.
  - Identified parties and official authority/forum.
  - Plain-language legal glossary.
  - "Unclear / Needs a Lawyer" items.
  - Suggested guided workflows and 3–5 concrete questions to ask at a DLSA legal clinic.
- **Human-in-the-Loop**: Dates and deadlines appear in an editable review table. Nothing is added to a case file without explicit user confirmation.
- **Client-Side Redaction Preview**: Optional toggle to mask phone numbers and ID-like sequences prior to sending to the AI proxy.
- **Emergency Protection**: Imminent violence, unlawful custody, or forced evictions trigger immediate priority alerts directing citizens to 112, 181, and DLSA helpline 15100.
- **Hard Guardrails**: Zero outcome predictions, no probability scores, and strictly disclaims formal legal advice.

### 5. Statistical Dashboard (`/insights`, protected)
- **KPI Metrics Strip**: Areas analyzed, centres mapped, population beyond threshold, coverage %, and median distance.
- **Synchronized Recharts Visualizations**:
  - Cumulative population coverage curve.
  - Population-weighted distance histogram.
  - Ranked district unserved population bar chart.
  - Institutional density per lakh population.
  - Data verification audit table with CSV export.

### 6. Grounded AI Assistant (`/api/assistant`)
- **Serverless Proxy**: Proxies requests securely to Gemini 2.5 Flash without exposing keys to the client.
- **Verified Tool Suite**:
  - `search_centres(district, type, service)`
  - `get_area_stats(area_name)`
  - `get_top_gaps(n, threshold)`
  - `get_what_to_bring(issue_type)`
  - `get_workflow(id)`
  - `get_case_summary(case_id)` (*gated strictly by user toggle: "Use my case in this chat" — off by default*).

---

## 🔒 Row-Level Security (RLS) Database Setup

To configure Supabase Postgres storage for production, execute the migration script located at:
`supabase/migrations/20261028_cases_schema.sql`

### SQL Schema & Policies:
```sql
-- Cases table with strict user ownership
CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  workflow_id TEXT,
  workflow_type TEXT NOT NULL,
  authority_forum TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Preparing', 'Filed', 'Hearing', 'Hearing/Follow-up', 'Resolved', 'Closed')),
  key_dates JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  checklist_progress JSONB DEFAULT '{}'::jsonb,
  current_step_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case Events table
CREATE TABLE IF NOT EXISTS public.case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('filed', 'hearing', 'reply_due', 'order_received', 'note')),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

-- Strict User Isolation Policies
CREATE POLICY "Users can only read own cases" ON public.cases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own cases" ON public.cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own cases" ON public.cases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own cases" ON public.cases
  FOR DELETE USING (auth.uid() = user_id);
```

*Verification*: When user A is logged in, querying `cases` returns only rows where `user_id = user_A.id`. User B's queries cannot see or modify User A's rows.

---

## ⚙️ Environment Variables

Create or edit `.env` in the root directory:

```env
# Managed Supabase Auth & Database (Required for cloud RLS sync; mock/guest mode active when blank)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API Key (Serverless Assistant & Document Interpreter Proxy)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🛠️ How to Replace Sample Workflow Data

All legal workflows are stored in `public/data/workflows.json`. Each entry is structured as follows:

```json
{
  "id": "wf-rental-deposit",
  "title": "Recover a Tenancy Security Deposit",
  "title_kn": "ಬಾಡಿಗೆ ಮುಂಗಡ ಹಣ ಮರುಪಡೆಯುವಿಕೆ",
  "summary": "Plain language summary of the dispute resolution process...",
  "who_it_is_for": "Tenants in Karnataka whose deposit is withheld unlawfully.",
  "source_url": "https://kslsa.kar.nic.in",
  "last_verified": "2026-10-28",
  "is_sample": false,
  "steps": [
    {
      "id": "step-demand-notice",
      "step_number": 1,
      "title": "Send a Registered Demand Notice",
      "what_to_do": "Draft and dispatch a 15-day formal legal notice...",
      "where_authority": "Post Office (Registered Post with Ack Due)",
      "documents_needed": ["Lease Agreement", "Rent Receipts"],
      "typical_timeline": "15 Days",
      "common_mistakes": ["Not retaining postal booking receipt"]
    }
  ]
}
```

To update or verify a workflow:
1. Open `public/data/workflows.json`.
2. Update statutory provisions, timelines, or official forms.
3. Update `"last_verified"` to the current ISO date (`YYYY-MM-DD`).
4. Set `"is_sample": false` to remove the "SAMPLE - Needs Verification" badge.

---

## 🗺️ Offline Blank Map & Spatial Geometry

Nyaya-Maarg operates on a 100% offline, privacy-first blank map canvas with zero external basemap or tile network requests (zero MapTiler, Mapbox, or OpenStreetMap tile dependencies).

### 1. Canvas & Cartography
- **Theme-Aware Canvas:** `#F8F9FA` in light mode, `#0B0D11` in dark mode.
- **Boundaries Geometry:** Karnataka district outlines rendered via locally bundled GeoJSON: `/public/data/karnataka_districts.geojson`.
- **Source & License:** District boundaries adapted from GADM / Datameet States of India, licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **Orientation Cues:** Top toolbar includes a North orientation indicator, scale bar (km), and a 1-click **Reset View** button to restore default Karnataka bounds.
- **Data Layers:** Mapped legal aid centres (`#1D5CA8` / `#2563EB`), straight-line distance gap vectors from underserved centroids, interactive office detail drawers, and what-if camp simulator (25 km radius).
- **Fallback Directory:** Built-in searchable list view accessible via the toolbar toggle for keyboard and text accessibility.

---

## 🔐 Real Authentication Setup (Supabase Auth)

Nyaya-Maarg uses real managed authentication via Supabase Auth. Any mock users, fake credential bypasses, or client-side password bypasses have been completely removed.

### 1. Required Environment Variables
Set the following variables in `.env.local` (frontend client) and server environment:
```env
# Client-side Supabase credentials (VITE_ prefixed, safe for public distribution)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side AI key (never exposed to frontend)
GEMINI_API_KEY=your_gemini_api_key_here
```
> If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the application halts sign-in attempts with an explicit inline error ("Authentication service is not configured") and never falls back to a fake or mock login.

### 2. Supabase Dashboard Provider Settings
To configure your Supabase project:
1. Navigate to **Authentication -> Providers** and verify that **Email** is **Enabled**.
2. Under **Authentication -> Email**, toggle "Confirm email" according to your deployment stage (disabled for local development/testing, enabled for production).
3. Under **Authentication -> Password Settings**, enforce a minimum password length of at least 6 characters.
4. Under **Authentication -> URL Configuration**, configure:
   - **Site URL**: `http://localhost:5173` (or your production URL).
   - **Redirect URLs**: Add `http://localhost:5173/**` and `https://<your-app>.vercel.app/**`.
5. Under **Database -> Tables**, enable **Row-Level Security (RLS)** on `cases` and `case_events` tables with policies:
   - `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.

### 3. Route Protection & Serverless API Token Verification
- **Protected UI Routes:** `/cases` and `/insights` check the verified session on load and route changes. Unauthenticated visitors are immediately redirected to `/login?returnTo=/<route>`.
- **Serverless API Endpoints (`/api/assistant`, `/api/interpret`):** Strictly validate the caller's Supabase JWT access token on every request. Missing, expired, or invalid tokens return **HTTP 401 Unauthorized**.
- **Guest Demo Mode:** A single explicit "Continue as guest (demo)" button enables temporary testing. Guests are clearly tagged with a "Guest" pill in the header, receive zero database access, and store demo cases strictly in browser memory or `localStorage`.

---

## 🚀 Running the App Locally

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Build & Typecheck
npm run build
npm run lint
```
