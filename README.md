# Nyaya-Maarg - Legal Aid Access & Citizen Case Workspace (Karnataka)

> A precision civic-tech data publication and citizen legal instrument mapping access disparities across Karnataka's 176+ taluks. Features guided bilingual workflows, confidential case tracking with Row-Level Security, an AI Plain-Language Legal Document Interpreter, and an offline blank-map cartographic gazetteer.

---

## 📁 Repository Structure

All active application code, services, database migrations, tests, and configurations are maintained within the **`civic-blindspot/`** directory:

```
Nyaya-Maarg/
├── civic-blindspot/
│   ├── api/                   # Serverless endpoints (assistant, interpret)
│   ├── public/                # Static assets, GeoJSON boundaries, workflow data
│   ├── scripts/               # Test suites (diagnostics, contrast, layout, auth)
│   ├── src/                   # React 19 + TypeScript + Tailwind source code
│   │   ├── components/        # Map, drawers, workflows, cases, interpreter, auth
│   │   ├── context/           # Auth and session context
│   │   ├── lib/               # Supabase client and case service
│   │   ├── types/             # TypeScript domain definitions
│   │   └── utils/             # Gap analysis algorithms and metrics
│   ├── supabase/              # PostgreSQL schema & Row-Level Security (RLS)
│   ├── DESIGN.md              # Authoritative Design System & Stacking Context
│   ├── README.md              # Application guide & documentation
│   ├── package.json           # Project dependencies & scripts
│   └── vite.config.ts         # Vite bundler & dev proxy configuration
├── .gitignore                 # Root git ignore rules
└── README.md                  # Project root overview
```

---

## 🚀 Quick Start

To run the application locally:

```bash
# 1. Navigate to the application directory
cd civic-blindspot

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for demo mode)
cp .env.example .env.local

# 4. Start the Vite development server
npm run dev
```

Visit `http://localhost:5173` to explore the application.

---

## 🧪 Verification & Automated Testing

The suite includes comprehensive automated Playwright and Puppeteer regression tests:

```bash
# Run Auth and Blank Map Verification
node civic-blindspot/scripts/test-auth-and-map.mjs

# Run Responsive Layout and Stacking Context Regression Suite (9 Viewports)
node civic-blindspot/scripts/test-layout-and-stacking.mjs

# Production Build
npm --prefix civic-blindspot run build
```

---

## ⚖️ Legal Disclaimer

Nyaya-Maarg is an independent civic data publication and research initiative. It is not affiliated with the National Legal Services Authority (NALSA), Karnataka State Legal Services Authority (KSLSA), or any government body. For official legal aid, contact the NALSA toll-free helpline at **15100** or emergency services at **112**.
